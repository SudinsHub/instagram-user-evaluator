/**
 * Vercel Serverless Function & Local Dev Handler: /api/scrape
 * Implements multi-tier caching identical to BrightData/instagram_reach_and_authenticity_evaluator.ipynb:
 * 1. Local Disk Cache: instant load from cache/<username>.json if within CACHE_EXPIRY_DAYS (0 network, $0 cost).
 * 2. Bright Data Platform Scraper & Dashboard Cache.
 * 3. Graceful fallback to existing disk cache if live scraping is temporarily unavailable.
 * 4. Saves all newly scraped records to cache/<username>.json with TTL metadata.
 */

import fs from "node:fs";
import path from "node:path";

export const maxDuration = 60; // Allow up to 60s for live Bright Data discovery polling on Vercel Hobby tier

interface ScrapedPost {
  post_id: string;
  date: string;
  likes: number;
  likes_hidden: boolean;
  comments_count: number;
  views: number;
  is_video: boolean;
  caption?: string;
  image_url?: string;
  url?: string;
}

/**
 * Configure Edge CDN headers for Vercel's Global Edge Network.
 * On Vercel Free Tier, Edge Caching is completely free and serves responses in ~20ms
 * without invoking serverless compute or incurring Bright Data API calls.
 */
function setCdnCacheHeaders(res: any, daysLeft: number, forceRefresh: boolean = false): void {
  if (forceRefresh) {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  } else {
    // s-maxage directs Vercel Edge CDN to store the response globally at edge PoPs
    const sMaxAge = Math.max(3600, Math.floor(daysLeft * 86400));
    const swr = 86400; // 1-day stale-while-revalidate window
    res.setHeader("Cache-Control", `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
    res.setHeader("CDN-Cache-Control", `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
    res.setHeader("Vercel-CDN-Cache-Control", `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`);
  }
}

function resolveApiKey(): string {
  if (process.env.BRIGHTDATA_API_KEY) return process.env.BRIGHTDATA_API_KEY.trim();
  if (process.env.BRIGHT_DATA_API_KEY) return process.env.BRIGHT_DATA_API_KEY.trim();

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/BRIGHT_?DATA_API_KEY\s*=\s*([^\r\n]+)/);
      if (match && match[1]) {
        const val = match[1].trim().replace(/^["']|["']$/g, "");
        process.env.BRIGHTDATA_API_KEY = val;
        return val;
      }
    }
  } catch {
    // Ignore error
  }

  return "";
}

function resolveExpiryDays(): number {
  if (process.env.CACHE_EXPIRY_DAYS) {
    const parsed = parseInt(process.env.CACHE_EXPIRY_DAYS, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const match = fs.readFileSync(envPath, "utf-8").match(/CACHE_EXPIRY_DAYS\s*=\s*([0-9]+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
  } catch {
    // Ignore error
  }

  return 10; // Default 10 days TTL matching notebook config
}

function getCacheDir(): string {
  const localDir = path.resolve(process.cwd(), "cache");
  if (!fs.existsSync(localDir)) {
    try {
      fs.mkdirSync(localDir, { recursive: true });
    } catch {
      // In read-only serverless environment, fallback to /tmp/cache
      const tmpDir = path.resolve("/tmp", "cache");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return tmpDir;
    }
  }
  return localDir;
}

/**
 * 1. Check Local File Cache (cache/<username>.json)
 */
function readLocalCache(
  username: string,
  expiryDays: number
): { exists: boolean; isExpired: boolean; data?: any; ageDays?: number; daysLeft?: number; filepath?: string } {
  const cacheDir = getCacheDir();
  const candidateFiles = [
    path.join(cacheDir, `${username}.json`),
    path.resolve(process.cwd(), "..", "BrightData", "cache", `${username}.json`),
  ];

  for (const filepath of candidateFiles) {
    if (fs.existsSync(filepath)) {
      try {
        const content = fs.readFileSync(filepath, "utf-8");
        const record = JSON.parse(content);
        const cachedAtStr = record.cached_at;
        const profileObj = record.profile;

        if (cachedAtStr && profileObj && typeof profileObj === "object") {
          const cachedAt = new Date(cachedAtStr).getTime();
          const ageDays = (Date.now() - cachedAt) / (1000 * 60 * 60 * 24);
          const isExpired = ageDays >= expiryDays;
          const daysLeft = Math.max(0, expiryDays - ageDays);

          return {
            exists: true,
            isExpired,
            data: record,
            ageDays: Math.round(ageDays * 10) / 10,
            daysLeft: Math.round(daysLeft * 10) / 10,
            filepath,
          };
        }
      } catch {
        // Corrupt cache file, continue
      }
    }
  }

  return { exists: false, isExpired: true };
}

/**
 * 2. Save Scraped Record to Local Disk Cache
 */
function saveLocalCache(
  username: string,
  profile: any,
  posts: any[],
  expiryDays: number,
  source: string = "brightdata_live"
): void {
  try {
    const cacheDir = getCacheDir();
    const filepath = path.join(cacheDir, `${username}.json`);
    const payload = {
      username,
      cached_at: new Date().toISOString(),
      expiry_days: expiryDays,
      source,
      profile,
      posts,
    };
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[CACHE WRITE NOTICE] Could not persist cache for @${username}:`, err);
  }
}

function formatResponse(cachedRecord: any, username: string, source: string, ageDays: number = 0, daysLeft: number = 0, message: string = "") {
  const profile = cachedRecord.profile || {};
  const posts = cachedRecord.posts || [];

  return {
    success: true,
    source,
    cache_hit: source.includes("cache"),
    cache_age_days: ageDays,
    cache_days_left: daysLeft,
    cache_message: message,
    profile: {
      id: `profile_${username}`,
      username,
      full_name: profile.full_name || profile.fullName || username,
      followers: Number(profile.followers || profile.followersCount || 0),
      following: Number(profile.following || profile.followingCount || 0),
      posts_count: Number(profile.posts_count || profile.postsCount || posts.length),
      is_verified: Boolean(profile.is_verified || profile.verified),
      is_private: Boolean(profile.is_private || profile.private),
      biography: profile.biography || profile.bio || "",
      profile_pic_url: profile.profile_pic_url || profile.profilePicUrl || "",
      archetypeTag: source === "local_cache" ? `Local Cache (${ageDays}d old)` : "Live Scraped Profile",
      archetypeDescription:
        source === "local_cache"
          ? `Loaded instantly from disk cache (<username>.json). 0 API credits used.`
          : `Live scraped via Bright Data API. Cached to disk for ${daysLeft} days.`,
    },
    posts: posts.map((p: any, idx: number) => ({
      post_id: (p.post_id || p.id || `post_${idx + 1}`).toString(),
      date: p.date || p.timestamp || new Date().toISOString(),
      likes: Number(p.likes || 0),
      likes_hidden: Boolean(p.likes_hidden),
      comments_count: Number(p.comments_count || p.num_comments || 0),
      views: Number(p.views || 0),
      is_video: Boolean(p.is_video || p.video),
      caption: (p.caption || "").toString().slice(0, 100),
      url: p.url || "",
    })),
  };
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // 1. Extract username and parameters
    const username = (
      req.query?.username ||
      req.body?.username ||
      ""
    ).toString().trim().toLowerCase().replace(/^@/, "");

    const forceRefresh =
      req.query?.force_refresh === "true" ||
      req.body?.force_refresh === true;

    if (!username) {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(400).json({
        error: "Missing username parameter. Please provide an Instagram username without '@'.",
      });
    }

    const expiryDays = resolveExpiryDays();

    // 2. TIER 1: Check Local Disk JSON Cache (Exact notebook behavior)
    const cacheCheck = readLocalCache(username, expiryDays);

    if (!forceRefresh && cacheCheck.exists && !cacheCheck.isExpired && cacheCheck.data) {
      setCdnCacheHeaders(res, cacheCheck.daysLeft || expiryDays, false);
      const msg = `[CACHE HIT - Local] @${username} loaded from disk cache (age: ${cacheCheck.ageDays}d, TTL: ${cacheCheck.daysLeft}d left). 0 network calls, $0 cost.`;
      return res.status(200).json(
        formatResponse(cacheCheck.data, username, "local_cache", cacheCheck.ageDays, cacheCheck.daysLeft, msg)
      );
    }

    // 3. TIER 2: Query Bright Data API
    const apiKey = resolveApiKey();

    if (!apiKey) {
      if (cacheCheck.exists && cacheCheck.data) {
        // Fallback to existing disk cache if API key is not present
        setCdnCacheHeaders(res, cacheCheck.daysLeft || 1, false);
        const msg = `[FALLBACK - Local Cache] API key missing; loaded existing disk record for @${username}.`;
        return res.status(200).json(
          formatResponse(cacheCheck.data, username, "local_cache", cacheCheck.ageDays, cacheCheck.daysLeft, msg)
        );
      }
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(500).json({
        error: "Bright Data API Key is not set in .env. Please set BRIGHTDATA_API_KEY.",
      });
    }

    const profileDatasetId = "gd_l1vikfch901nx3by4";
    const scrapeUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${profileDatasetId}&notify=false&include_errors=true&type=discover_new&discover_by=user_name`;

    const scrapePayload = {
      input: [{ user_name: username }],
      limit_per_input: null,
    };

    let scrapeResponse: any;
    try {
      scrapeResponse = await fetch(scrapeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scrapePayload),
      });
    } catch (networkErr: any) {
      if (cacheCheck.exists && cacheCheck.data) {
        setCdnCacheHeaders(res, cacheCheck.daysLeft || 1, false);
        const msg = `[FALLBACK - Local Cache] Network error contacting Bright Data; loaded existing cache for @${username}.`;
        return res.status(200).json(
          formatResponse(cacheCheck.data, username, "local_cache", cacheCheck.ageDays, cacheCheck.daysLeft, msg)
        );
      }
      throw networkErr;
    }

    if (!scrapeResponse.ok) {
      const errText = await scrapeResponse.text();
      // If live scrape fails but we have disk cache, fallback gracefully
      if (cacheCheck.exists && cacheCheck.data) {
        setCdnCacheHeaders(res, cacheCheck.daysLeft || 1, false);
        const msg = `[FALLBACK - Local Cache] Bright Data API returned status ${scrapeResponse.status}; loaded existing cache for @${username}.`;
        return res.status(200).json(
          formatResponse(cacheCheck.data, username, "local_cache", cacheCheck.ageDays, cacheCheck.daysLeft, msg)
        );
      }
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(scrapeResponse.status).json({
        error: `Bright Data API Error (${scrapeResponse.status}): ${errText}`,
      });
    }

    let resultData: any = await scrapeResponse.json();

    // 4. Handle Async Snapshot polling if returned a snapshot_id
    if (resultData && !Array.isArray(resultData) && resultData.snapshot_id) {
      const snapshotId = resultData.snapshot_id;
      const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
      const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

      const startTime = Date.now();
      const maxWaitMs = 120000;
      let isReady = false;

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((resolve) => setTimeout(resolve, 4000));

        const progRes = await fetch(progressUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        if (progRes.ok) {
          const progData: any = await progRes.json();
          if (progData.status === "ready") {
            isReady = true;
            break;
          } else if (progData.status === "failed" || progData.status === "cancelled") {
            throw new Error(`Bright Data snapshot ${snapshotId} failed: ${JSON.stringify(progData)}`);
          }
        }
      }

      if (isReady) {
        const downloadRes = await fetch(downloadUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (downloadRes.ok) {
          resultData = await downloadRes.json();
        }
      }
    }

    // 5. Extract and normalize raw profile record
    const record = Array.isArray(resultData) ? resultData[0] : resultData;
    if (!record || record.error) {
      if (cacheCheck.exists && cacheCheck.data) {
        setCdnCacheHeaders(res, cacheCheck.daysLeft || 1, false);
        const msg = `[FALLBACK - Local Cache] Account temporarily unavailable on Instagram; loaded disk cache for @${username}.`;
        return res.status(200).json(
          formatResponse(cacheCheck.data, username, "local_cache", cacheCheck.ageDays, cacheCheck.daysLeft, msg)
        );
      }
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(404).json({
        error: record?.error || `No Instagram profile found for @${username}. The user might be private or inactive.`,
      });
    }

    // Normalize Profile
    const followers = Number(record.followers || record.followersCount || record.follower_count || 0);
    const following = Number(record.following || record.followingCount || record.followsCount || 0);
    const postsCount = Number(record.posts_count || record.postsCount || record.media_count || 0);
    const isVerified = Boolean(record.is_verified || record.verified || false);
    const isPrivate = Boolean(record.is_private || record.private || false);
    const fullName = record.full_name || record.fullName || record.name || username;
    const biography = record.biography || record.bio || "";
    const profilePicUrl = record.profile_pic_url || record.profilePicUrl || record.profile_image_url || "";

    // Normalize Posts
    const rawPosts: any[] = record.posts || record.latest_posts || record.recent_posts || [];
    const normalizedPosts: ScrapedPost[] = rawPosts.slice(0, 20).map((p: any, idx: number) => {
      const likesVal = Number(p.likes || p.like_count || p.likesCount || 0);
      const isHidden = Boolean(p.likes_hidden || p.is_likes_hidden || (p.likes === 0 && likesVal === 0 && !p.is_video));

      return {
        post_id: (p.post_id || p.id || p.shortcode || `post_${idx + 1}`).toString(),
        date: p.date || p.timestamp || p.created_at || new Date().toISOString(),
        likes: likesVal,
        likes_hidden: isHidden,
        comments_count: Number(p.comments_count || p.commentsCount || p.num_comments || 0),
        views: Number(p.views || p.view_count || p.video_view_count || 0),
        is_video: Boolean(p.is_video || p.video || p.type === "video" || p.type === "reel"),
        caption: (p.caption || "").toString().slice(0, 100),
        url: p.url || p.post_url || p.link || "",
      };
    });

    const normalizedProfile = {
      username,
      full_name: fullName,
      followers,
      following,
      posts_count: postsCount,
      is_verified: isVerified,
      is_private: isPrivate,
      biography,
      profile_pic_url: profilePicUrl,
    };

    // 6. SAVE TO DISK CACHE (TTL = expiryDays from .env)
    saveLocalCache(username, normalizedProfile, normalizedPosts, expiryDays, "brightdata_live");
    setCdnCacheHeaders(res, expiryDays, forceRefresh);

    const liveMsg = `Live scraped via Bright Data API and saved to cache/${username}.json (TTL: ${expiryDays} days).`;
    return res.status(200).json(
      formatResponse(
        { profile: normalizedProfile, posts: normalizedPosts },
        username,
        "brightdata_live",
        0,
        expiryDays,
        liveMsg
      )
    );
  } catch (err: any) {
    console.error("Scrape handler error:", err);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(500).json({
      error: err.message || "An unexpected error occurred during Instagram scraping.",
    });
  }
}
