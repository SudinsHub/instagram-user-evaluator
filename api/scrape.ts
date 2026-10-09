/**
 * Vercel Serverless Function & Local Dev Handler: /api/scrape
 * Bright Data Platform Scraper with Dashboard Snapshot Caching:
 * 1. Checks Bright Data dashboard for an existing completed snapshot for the username
 *    scraped within CACHE_EXPIRY_DAYS (0 re-scraping, instant retrieval).
 * 2. If a snapshot is currently in progress (running/starting), waits for it to finish
 *    instead of triggering duplicate scraping.
 * 3. If no snapshot exists or force_refresh is requested, triggers a new scrape job
 *    on Bright Data dataset gd_l1vikfch901nx3by4.
 * 4. Polling has a 48s safety cutoff to prevent Vercel 60s Serverless Runtime Timeouts.
 *    If still processing, returns a pending status so the frontend can seamlessly re-fetch.
 */

import fs from "fs";
import path from "path";

export const maxDuration = 60; // Allow up to 60s on Vercel

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

interface ExistingSnapshot {
  id: string;
  created: string;
  status: "ready" | "running" | "starting";
  ageDays: number;
  daysLeft: number;
}

// In-memory cache of snapshot ID -> target username to make repeated lookup instant
const snapshotInputCache = new Map<string, string>();

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

  return 10; // Default 10 days TTL
}

async function getSnapshotInputUsername(snapshotId: string, apiKey: string): Promise<string | null> {
  if (snapshotInputCache.has(snapshotId)) {
    return snapshotInputCache.get(snapshotId) || null;
  }

  try {
    const inputUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}/input`;
    const res = await fetch(inputUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean);
    // Format is CSV: lines[0] = "user_name", lines[1] = "<username>"
    const username = lines.length >= 2 ? lines[1].replace(/^["']|["']$/g, "") : (lines[0] || "");
    if (username) {
      snapshotInputCache.set(snapshotId, username);
      return username;
    }
  } catch {
    // Ignore timeout / network error
  }

  return null;
}

/**
 * Searches Bright Data dashboard for existing snapshots for the target username
 * created within the last `expiryDays`.
 */
async function findExistingSnapshot(
  apiKey: string,
  datasetId: string,
  targetUsername: string,
  expiryDays: number
): Promise<ExistingSnapshot | null> {
  try {
    const fromDate = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const listUrl = `https://api.brightdata.com/datasets/v3/snapshots?dataset_id=${datasetId}&from_date=${encodeURIComponent(fromDate)}&limit=50`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4000),
    });

    if (!listRes.ok) {
      return null;
    }

    const snapshots: any = await listRes.json();
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return null;
    }

    // Filter out failed snapshots or empty records (unless in progress)
    const candidates = snapshots.filter((s) => {
      if (s.status === "running" || s.status === "starting") return true;
      if (s.status === "ready" && (s.dataset_size ?? 1) > 0 && (s.errors ?? 0) === 0) return true;
      return false;
    });

    if (candidates.length === 0) return null;

    // Check inputs in parallel batches of 8 with a total deadline
    const chunkSize = 8;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (s) => {
          const user = await getSnapshotInputUsername(s.id, apiKey);
          if (user && user.toLowerCase() === targetUsername.toLowerCase()) {
            return s;
          }
          return null;
        })
      );

      const match = results.find(Boolean);
      if (match) {
        const createdTime = new Date(match.created).getTime();
        const ageDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
        const daysLeft = Math.max(0, expiryDays - ageDays);
        return {
          id: match.id,
          created: match.created,
          status: match.status,
          ageDays: Math.round(ageDays * 10) / 10,
          daysLeft: Math.round(daysLeft * 10) / 10,
        };
      }
    }
  } catch (err) {
    console.warn("[BRIGHTDATA DASHBOARD] Snapshot lookup notice:", err);
  }

  return null;
}

/**
 * Polls a snapshot until ready, or returns false if approaching serverless execution limit.
 */
async function pollSnapshotUntilReady(
  snapshotId: string,
  apiKey: string,
  maxWaitMs: number = 46000
): Promise<{ isReady: boolean; data?: any }> {
  const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
  const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 2500));

    try {
      const progRes = await fetch(progressUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(4000),
      });

      if (progRes.ok) {
        const progData: any = await progRes.json();
        if (progData.status === "ready") {
          const downloadRes = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(6000),
          });
          if (downloadRes.ok) {
            const data = await downloadRes.json();
            return { isReady: true, data };
          }
        } else if (progData.status === "failed" || progData.status === "cancelled") {
          throw new Error(`Bright Data snapshot ${snapshotId} failed: ${JSON.stringify(progData)}`);
        }
      }
    } catch (e: any) {
      if (e.message?.includes("failed")) throw e;
    }
  }

  return { isReady: false };
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

  // Disable Edge/CDN Caching - strictly dynamic snapshot resolution
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const handlerStartTime = Date.now();

  try {
    // 1. Extract username and force_refresh flag
    const username = (
      req.query?.username ||
      req.body?.username ||
      ""
    ).toString().trim().toLowerCase().replace(/^@/, "");

    const forceRefresh =
      req.query?.force_refresh === "true" ||
      req.body?.force_refresh === true;

    if (!username) {
      return res.status(400).json({
        error: "Missing username parameter. Please provide an Instagram username without '@'.",
      });
    }

    const apiKey = resolveApiKey();
    if (!apiKey) {
      return res.status(500).json({
        error: "Bright Data API Key is not set in .env. Please set BRIGHTDATA_API_KEY.",
      });
    }

    const expiryDays = resolveExpiryDays();
    const datasetId = "gd_l1vikfch901nx3by4";

    let resultData: any = null;
    let isCacheHit = false;
    let snapshotAgeDays = 0;
    let snapshotDaysLeft = expiryDays;
    let matchedSnapshotId = "";

    // 2. CHECK BRIGHT DATA DASHBOARD FOR EXISTING SNAPSHOT
    if (!forceRefresh) {
      const existingSnapshot = await findExistingSnapshot(apiKey, datasetId, username, expiryDays);

      if (existingSnapshot) {
        matchedSnapshotId = existingSnapshot.id;
        snapshotAgeDays = existingSnapshot.ageDays;
        snapshotDaysLeft = existingSnapshot.daysLeft;

        if (existingSnapshot.status === "ready") {
          // Download directly from dashboard
          const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${existingSnapshot.id}?format=json`;
          const downloadRes = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(6000),
          });

          if (downloadRes.ok) {
            resultData = await downloadRes.json();
            isCacheHit = true;
          }
        } else {
          // Snapshot is already starting/running in dashboard: wait for it rather than re-triggering!
          const elapsed = Date.now() - handlerStartTime;
          const remainingSafeMs = Math.max(5000, 48000 - elapsed);
          const pollResult = await pollSnapshotUntilReady(existingSnapshot.id, apiKey, remainingSafeMs);

          if (pollResult.isReady) {
            resultData = pollResult.data;
            isCacheHit = true;
            snapshotInputCache.set(existingSnapshot.id, username);
          } else {
            // Still generating in dashboard: return processing status before Vercel 60s timeout
            return res.status(200).json({
              success: false,
              status: "processing",
              snapshot_id: existingSnapshot.id,
              username,
              message: `Bright Data snapshot (${existingSnapshot.id}) is actively processing in the dashboard. Re-fetching shortly...`,
            });
          }
        }
      }
    }

    // 3. IF NO SNAPSHOT FOUND IN DASHBOARD OR FORCE REFRESH: TRIGGER SCRAPE
    if (!resultData) {
      const scrapeUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${datasetId}&notify=false&include_errors=true&type=discover_new&discover_by=user_name`;

      const scrapePayload = {
        input: [{ user_name: username }],
        limit_per_input: null,
      };

      const scrapeResponse = await fetch(scrapeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scrapePayload),
      });

      if (!scrapeResponse.ok) {
        const errText = await scrapeResponse.text();
        return res.status(scrapeResponse.status).json({
          error: `Bright Data API Error (${scrapeResponse.status}): ${errText}`,
        });
      }

      resultData = await scrapeResponse.json();

      // Handle Async Snapshot polling if returned a snapshot_id
      if (resultData && !Array.isArray(resultData) && resultData.snapshot_id) {
        const snapshotId = resultData.snapshot_id;
        matchedSnapshotId = snapshotId;
        snapshotInputCache.set(snapshotId, username);

        const elapsed = Date.now() - handlerStartTime;
        const remainingSafeMs = Math.max(5000, 48000 - elapsed);
        const pollResult = await pollSnapshotUntilReady(snapshotId, apiKey, remainingSafeMs);

        if (pollResult.isReady) {
          resultData = pollResult.data;
        } else {
          // Still processing on Bright Data: return processing status before Vercel 60s timeout
          return res.status(200).json({
            success: false,
            status: "processing",
            snapshot_id: snapshotId,
            username,
            message: `Bright Data job started (snapshot ${snapshotId}). Data collection takes ~50-60s. Polling dashboard for completion...`,
          });
        }
      }
    }

    // 4. EXTRACT AND NORMALIZE RAW PROFILE RECORD
    const record = Array.isArray(resultData) ? resultData[0] : resultData;
    if (!record || record.error) {
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
    const fullName = record.full_name || record.fullName || record.profile_name || record.name || username;
    const biography = record.biography || record.bio || "";
    const profilePicUrl = record.profile_image_link || record.profile_pic_url || record.profilePicUrl || record.profile_image_url || "";

    // Normalize Posts
    const rawPosts: any[] = record.posts || record.latest_posts || record.recent_posts || [];
    const normalizedPosts: ScrapedPost[] = rawPosts.slice(0, 20).map((p: any, idx: number) => {
      const likesVal = Number(p.likes || p.like_count || p.likesCount || 0);
      const isHidden = Boolean(p.likes_hidden || p.is_likes_hidden || (p.likes === 0 && likesVal === 0 && !p.is_video));

      return {
        post_id: (p.post_id || p.id || p.shortcode || `post_${idx + 1}`).toString(),
        date: p.date || p.datetime || p.timestamp || p.created_at || new Date().toISOString(),
        likes: likesVal,
        likes_hidden: isHidden,
        comments_count: Number(p.comments_count || p.commentsCount || p.num_comments || 0),
        views: Number(p.views || p.view_count || p.video_view_count || 0),
        is_video: Boolean(p.is_video || p.video || p.type === "video" || p.type === "reel" || p.content_type === "Video" || p.content_type === "Reel"),
        caption: (p.caption || "").toString().slice(0, 100),
        url: p.url || p.post_url || p.link || "",
      };
    });

    const normalizedProfile = {
      id: `profile_${username}`,
      username,
      full_name: fullName,
      followers,
      following,
      posts_count: postsCount,
      is_verified: isVerified,
      is_private: isPrivate,
      biography,
      profile_pic_url: profilePicUrl,
      archetypeTag: isCacheHit
        ? `Bright Data Snapshot (${snapshotAgeDays}d old)`
        : "Live Scraped Profile",
      archetypeDescription: isCacheHit
        ? `Retrieved snapshot (${matchedSnapshotId}) from Bright Data dashboard (${snapshotAgeDays}d old, ${snapshotDaysLeft}d TTL left). 0 scrape credits used.`
        : `Live scraped via Bright Data API. Stored as snapshot in Bright Data dashboard (TTL: ${expiryDays} days).`,
    };

    const message = isCacheHit
      ? `Retrieved existing snapshot (${matchedSnapshotId}) from Bright Data dashboard (scraped ${snapshotAgeDays}d ago, within ${expiryDays}d TTL). No rescraping performed.`
      : `Live scraped via Bright Data API and stored in dashboard snapshot (${matchedSnapshotId || "ready"}).`;

    return res.status(200).json({
      success: true,
      source: isCacheHit ? "brightdata_dashboard_cache" : "brightdata_live",
      cache_hit: isCacheHit,
      cache_age_days: snapshotAgeDays,
      cache_days_left: snapshotDaysLeft,
      cache_message: message,
      snapshot_id: matchedSnapshotId,
      profile: normalizedProfile,
      posts: normalizedPosts,
    });
  } catch (err: any) {
    console.error("Scrape handler error:", err);
    return res.status(500).json({
      error: err.message || "An unexpected error occurred during Instagram scraping.",
    });
  }
}
