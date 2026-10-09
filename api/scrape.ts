/**
 * Vercel Serverless Function & Local Dev Handler: /api/scrape
 * Bright Data Platform Scraper with Dashboard Snapshot Caching & Safe Serverless Timeouts:
 * 
 * 1. Fetch Instagram profile using username with profile scraper (gd_l1vikfch901nx3by4).
 *    - Direct lookup if snapshot_id provided.
 *    - Reuses existing dashboard snapshot if within CACHE_EXPIRY_DAYS.
 *    - If running/starting, polls safely. If none, triggers new scrape job.
 * 2. From the profile's posts list:
 *    - Selects maximum 30 recent posts or within 3-month posts (90 days).
 * 3. For each of the selected posts:
 *    - If already in a snapshot on the Bright Data dashboard (gd_lk5ns7kz21pck8jpis)
 *      within expiry date, retrieves directly from the dashboard snapshot (0 scrape credits).
 *    - Otherwise, runs the Bright Data post scraper (gd_lk5ns7kz21pck8jpis) for missing URLs.
 * 4. Populates all normalized fields needed for the rule-based evaluation calculation pipeline:
 *    - Followers, following, posts_count, verified, private, joined_recently
 *    - Post-level likes (with hidden like detection), comments_count, video views, content types.
 * 5. Uses a strict safe deadline (~34s) well before Vercel 60s Serverless Runtime Timeout,
 *    returning a "processing" status with snapshot IDs so the frontend auto-retries seamlessly.
 */

import fs from "fs";
import path from "path";

export const maxDuration = 60; // Allow up to 60s on Vercel

export interface ScrapedPost {
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

const PROFILE_DATASET_ID = "gd_l1vikfch901nx3by4";
const POST_DATASET_ID = "gd_lk5ns7kz21pck8jpis";

// Hard ceiling for function execution time to prevent Vercel 504 timeouts (60s limit)
const GLOBAL_SAFE_TIMEOUT_MS = 34000;

// In-memory cache of snapshot ID -> target username to make repeated lookup instant
const profileSnapshotInputCache = new Map<string, string>();

// In-memory cache of post shortcode / normalized URL -> ScrapedPost
const postSnapshotCache = new Map<string, ScrapedPost>();

// Set of snapshot IDs already indexed into postSnapshotCache
const indexedPostSnapshots = new Set<string>();

/**
 * Extracts Instagram shortcode from URL or string
 */
function extractShortcode(urlOrId?: string): string {
  if (!urlOrId) return "";
  const str = urlOrId.toString().trim();
  const match = str.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (match) return match[1];
  if (!str.includes("/") && !str.includes(".")) return str;
  return "";
}

function canonicalPostUrl(shortcode: string): string {
  return `https://www.instagram.com/p/${shortcode}/`;
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

  return 10; // Default 10 days TTL
}

async function getProfileSnapshotInputUsername(snapshotId: string, apiKey: string): Promise<string | null> {
  if (profileSnapshotInputCache.has(snapshotId)) {
    return profileSnapshotInputCache.get(snapshotId) || null;
  }

  try {
    const inputUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}/input`;
    const res = await fetch(inputUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean);
    const username = lines.length >= 2 ? lines[1].replace(/^["']|["']$/g, "") : (lines[0] || "");
    if (username) {
      profileSnapshotInputCache.set(snapshotId, username);
      return username;
    }
  } catch {
    // Ignore timeout / network error
  }

  return null;
}

/**
 * Checks a specific snapshot by ID directly (instant 1-hop progress check)
 */
async function checkSpecificSnapshot(
  snapshotId: string,
  apiKey: string,
  expiryDays: number
): Promise<ExistingSnapshot | null> {
  if (!snapshotId) return null;
  try {
    const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
    const res = await fetch(progressUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;
    const progData: any = await res.json();
    if (progData.status === "failed" || progData.status === "cancelled") return null;

    return {
      id: snapshotId,
      created: new Date().toISOString(),
      status: progData.status || "running",
      ageDays: 0,
      daysLeft: expiryDays,
    };
  } catch {
    return null;
  }
}

/**
 * Searches Bright Data dashboard for existing snapshots for the target username
 * created within the last `expiryDays`.
 */
async function findExistingProfileSnapshot(
  apiKey: string,
  targetUsername: string,
  expiryDays: number
): Promise<ExistingSnapshot | null> {
  try {
    const fromDate = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const listUrl = `https://api.brightdata.com/datasets/v3/snapshots?dataset_id=${PROFILE_DATASET_ID}&from_date=${encodeURIComponent(fromDate)}&limit=30`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3500),
    });

    if (!listRes.ok) return null;

    const snapshots: any = await listRes.json();
    if (!Array.isArray(snapshots) || snapshots.length === 0) return null;

    const candidates = snapshots.filter((s) => {
      if (s.status === "running" || s.status === "starting") return true;
      if (s.status === "ready" && (s.dataset_size ?? 1) > 0 && (s.errors ?? 0) === 0) return true;
      return false;
    }).slice(0, 16); // Check at most 16 candidates to preserve time budget

    if (candidates.length === 0) return null;

    const chunkSize = 8;
    for (let i = 0; i < candidates.length; i += chunkSize) {
      const chunk = candidates.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (s) => {
          const user = await getProfileSnapshotInputUsername(s.id, apiKey);
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
    console.warn("[BRIGHTDATA] Profile snapshot lookup notice:", err);
  }

  return null;
}

/**
 * Normalizes a raw post record from Bright Data (from post scraper or snapshot)
 */
function normalizeRawPost(item: any, fallbackIndex: number = 0): ScrapedPost {
  const shortcode = item.shortcode || extractShortcode(item.url) || item.post_id || item.id || `post_${fallbackIndex + 1}`;
  const postUrl = item.url || (shortcode ? canonicalPostUrl(shortcode) : "");

  // Detect hidden likes vs explicit likes
  const rawLikes = item.likes ?? item.likes_count ?? item.likesCount ?? item.like_count;
  const isLikesExplicitlyHidden = Boolean(item.likes_hidden || item.is_likes_hidden);
  const isLikesMissing = rawLikes === undefined || rawLikes === null;
  const likesHidden = isLikesExplicitlyHidden || isLikesMissing;
  const likesVal = likesHidden ? 0 : Math.max(0, Number(rawLikes || 0));

  const commentsVal = Math.max(0, Number(item.num_comments ?? item.comments_count ?? item.commentsCount ?? item.comments ?? 0));
  const viewsVal = Math.max(0, Number(item.video_view_count ?? item.video_play_count ?? item.views ?? item.views_count ?? item.view_count ?? 0));

  const isVideo = Boolean(
    item.content_type === "Reel" ||
    item.content_type === "Video" ||
    item.is_video ||
    item.video ||
    (Array.isArray(item.videos) && item.videos.length > 0) ||
    viewsVal > 0
  );

  let captionStr = "";
  if (typeof item.description === "string") captionStr = item.description;
  else if (typeof item.caption === "string") captionStr = item.caption;
  else if (typeof item.post_content === "string") captionStr = item.post_content;
  else if (typeof item.alt_text === "string") captionStr = item.alt_text;
  const caption = captionStr.slice(0, 150);
  const imageUrl = item.thumbnail || (Array.isArray(item.photos) && item.photos[0]?.url) || (Array.isArray(item.images) && item.images[0]?.url) || item.image_url || "";
  const date = item.date_posted || item.datetime || item.timestamp || item.created_at || new Date().toISOString();

  return {
    post_id: shortcode.toString(),
    date,
    likes: likesVal,
    likes_hidden: likesHidden,
    comments_count: commentsVal,
    views: viewsVal,
    is_video: isVideo,
    caption,
    image_url: imageUrl,
    url: postUrl,
  };
}

/**
 * Safely parses Bright Data responses (JSON object, array, or NDJSON / JSONL)
 */
function parseBrightDataResponse(text: string): any {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (err: any) {
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const results: any[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line));
      } catch {
        // Skip unparseable lines
      }
    }
    if (results.length > 0) {
      return results;
    }
    throw err;
  }
}

/**
 * Indexes a post snapshot into our memory cache
 */
async function indexPostSnapshot(snapshotId: string, apiKey: string): Promise<number> {
  if (indexedPostSnapshots.has(snapshotId)) return 0;

  try {
    const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return 0;

    const text = await res.text();
    const data = parseBrightDataResponse(text);
    const items = Array.isArray(data) ? data : data ? [data] : [];
    if (items.length === 0) return 0;

    let count = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const normalized = normalizeRawPost(item, i);
      const sc = normalized.post_id || extractShortcode(normalized.url);
      if (sc) {
        postSnapshotCache.set(sc.toLowerCase(), normalized);
      }
      if (normalized.url) {
        postSnapshotCache.set(normalized.url.toLowerCase(), normalized);
      }
      count++;
    }

    indexedPostSnapshots.add(snapshotId);
    return count;
  } catch (err) {
    console.warn(`[BRIGHTDATA] Failed to index post snapshot ${snapshotId}:`, err);
    return 0;
  }
}

/**
 * Scans Bright Data dashboard for existing post snapshots created within expiryDays
 * and indexes up to the top 3 most recent ready snapshots into the post cache.
 */
async function indexExistingPostSnapshotsFromDashboard(apiKey: string, expiryDays: number): Promise<string[]> {
  try {
    const fromDate = new Date(Date.now() - expiryDays * 24 * 60 * 60 * 1000).toISOString();
    const listUrl = `https://api.brightdata.com/datasets/v3/snapshots?dataset_id=${POST_DATASET_ID}&from_date=${encodeURIComponent(fromDate)}&limit=15`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(3000),
    });

    if (!listRes.ok) return [];

    const snapshots: any = await listRes.json();
    if (!Array.isArray(snapshots) || snapshots.length === 0) return [];

    const readySnapshots = snapshots
      .filter((s) => s.status === "ready" && (s.dataset_size ?? 0) > 0 && !indexedPostSnapshots.has(s.id))
      .slice(0, 3); // Limit to 3 most recent ready snapshots to prevent slow parallel downloads

    await Promise.all(readySnapshots.map((s) => indexPostSnapshot(s.id, apiKey)));

    const runningSnapshots = snapshots
      .filter((s) => s.status === "running" || s.status === "starting")
      .map((s) => s.id);

    return runningSnapshots;
  } catch (err) {
    console.warn("[BRIGHTDATA] Post snapshots dashboard lookup notice:", err);
    return [];
  }
}

/**
 * Polls a snapshot until ready, strictly guarded against the overall serverless timeout.
 */
async function pollSnapshotUntilReady(
  snapshotId: string,
  apiKey: string,
  handlerStartTime: number,
  maxPollDurationMs: number = 28000
): Promise<{ isReady: boolean; data?: any }> {
  const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
  const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

  const pollStartTime = Date.now();

  while (true) {
    const elapsedTotal = Date.now() - handlerStartTime;
    const elapsedPoll = Date.now() - pollStartTime;

    // Hard safety stop: if approaching safe cutoff or poll max, break immediately
    if (elapsedTotal >= GLOBAL_SAFE_TIMEOUT_MS - 4000 || elapsedPoll >= maxPollDurationMs) {
      break;
    }

    const sleepMs = Math.min(2000, Math.max(500, (GLOBAL_SAFE_TIMEOUT_MS - 4000) - elapsedTotal));
    await new Promise((resolve) => setTimeout(resolve, sleepMs));

    if (Date.now() - handlerStartTime >= GLOBAL_SAFE_TIMEOUT_MS - 3500) {
      break;
    }

    try {
      const progRes = await fetch(progressUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(3000),
      });

      if (progRes.ok) {
        const progData: any = await progRes.json();
        if (progData.status === "ready") {
          const downloadRes = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
          });
          if (downloadRes.ok) {
            const text = await downloadRes.text();
            const data = parseBrightDataResponse(text);
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
    // 1. Extract params
    const username = (
      req.query?.username ||
      req.body?.username ||
      ""
    ).toString().trim().toLowerCase().replace(/^@/, "");

    const forceRefresh =
      req.query?.force_refresh === "true" ||
      req.body?.force_refresh === true;

    const providedProfileSnapshotId = (
      req.query?.snapshot_id ||
      req.body?.snapshot_id ||
      ""
    ).toString().trim();

    const providedPostsSnapshotId = (
      req.query?.posts_snapshot_id ||
      req.body?.posts_snapshot_id ||
      ""
    ).toString().trim();

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

    let profileResultData: any = null;
    let isProfileCacheHit = false;
    let profileAgeDays = 0;
    let profileDaysLeft = expiryDays;
    let matchedProfileSnapshotId = "";

    // =========================================================================
    // STEP 1: FETCH PROFILE USING USERNAME WITH PROFILE SCRAPER
    // =========================================================================
    if (!forceRefresh) {
      let existingSnapshot: ExistingSnapshot | null = null;

      // Fast path: if client provided snapshot_id from prior poll, check it directly
      if (providedProfileSnapshotId) {
        existingSnapshot = await checkSpecificSnapshot(providedProfileSnapshotId, apiKey, expiryDays);
      }

      // Otherwise search dashboard snapshots
      if (!existingSnapshot) {
        existingSnapshot = await findExistingProfileSnapshot(apiKey, username, expiryDays);
      }

      if (existingSnapshot) {
        matchedProfileSnapshotId = existingSnapshot.id;
        profileAgeDays = existingSnapshot.ageDays;
        profileDaysLeft = existingSnapshot.daysLeft;

        if (existingSnapshot.status === "ready") {
          const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${existingSnapshot.id}?format=json`;
          const downloadRes = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000),
          });

          if (downloadRes.ok) {
            const text = await downloadRes.text();
            profileResultData = parseBrightDataResponse(text);
            isProfileCacheHit = true;
          }
        } else {
          // Profile snapshot is still starting/running: poll safely
          const pollResult = await pollSnapshotUntilReady(existingSnapshot.id, apiKey, handlerStartTime, 24000);

          if (pollResult.isReady) {
            profileResultData = pollResult.data;
            isProfileCacheHit = true;
            profileSnapshotInputCache.set(existingSnapshot.id, username);
          } else {
            return res.status(200).json({
              success: false,
              status: "processing",
              step: "profile",
              snapshot_id: existingSnapshot.id,
              username,
              message: `Bright Data profile snapshot (${existingSnapshot.id}) is actively processing in the dashboard. Re-fetching shortly...`,
            });
          }
        }
      }
    }

    // If no profile snapshot found or force refresh: trigger profile scrape
    if (!profileResultData) {
      const scrapeUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${PROFILE_DATASET_ID}&notify=false&include_errors=true&type=discover_new&discover_by=user_name`;
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
        signal: AbortSignal.timeout(7000),
      });

      if (!scrapeResponse.ok) {
        const errText = await scrapeResponse.text();
        return res.status(scrapeResponse.status).json({
          error: `Bright Data API Error (${scrapeResponse.status}): ${errText}`,
        });
      }

      const scrapeResponseText = await scrapeResponse.text();
      profileResultData = parseBrightDataResponse(scrapeResponseText);

      if (profileResultData && !Array.isArray(profileResultData) && profileResultData.snapshot_id) {
        const snapshotId = profileResultData.snapshot_id;
        matchedProfileSnapshotId = snapshotId;
        profileSnapshotInputCache.set(snapshotId, username);

        const pollResult = await pollSnapshotUntilReady(snapshotId, apiKey, handlerStartTime, 22000);

        if (pollResult.isReady) {
          profileResultData = pollResult.data;
        } else {
          return res.status(200).json({
            success: false,
            status: "processing",
            step: "profile",
            snapshot_id: snapshotId,
            username,
            message: `Bright Data profile job started (${snapshotId}). Scraping profile data... Polling dashboard...`,
          });
        }
      }
    }

    // Extract profile record
    const record = Array.isArray(profileResultData) ? profileResultData[0] : profileResultData;
    if (!record || record.error) {
      return res.status(404).json({
        error: record?.error || `No Instagram profile found for @${username}. The user might be private or inactive.`,
      });
    }

    const followers = Number(record.followers || record.followersCount || record.follower_count || 0);
    const following = Number(record.following || record.followingCount || record.followsCount || 0);
    const postsCount = Number(record.posts_count || record.postsCount || record.media_count || 0);
    const isVerified = Boolean(record.is_verified || record.verified || false);
    const isPrivate = Boolean(record.is_private || record.private || false);
    const isJoinedRecently = Boolean(record.is_joined_recently || record.joined_recently || false);
    const fullName = record.full_name || record.fullName || record.profile_name || record.name || username;
    const biography = record.biography || record.bio || "";
    const profilePicUrl = record.profile_image_link || record.profile_pic_url || record.profilePicUrl || record.profile_image_url || "";

    // =========================================================================
    // STEP 2: PICK MAXIMUM 30 RECENT POSTS OR WITHIN 3 MONTH POSTS
    // =========================================================================
    const rawPostsList: any[] = record.posts || record.latest_posts || record.recent_posts || [];

    const sortedRawPosts = [...rawPostsList].sort((a: any, b: any) => {
      const timeA = new Date(a.datetime || a.date || a.timestamp || a.created_at || 0).getTime();
      const timeB = new Date(b.datetime || b.date || b.timestamp || b.created_at || 0).getTime();
      return timeB - timeA;
    });

    const threeMonthsMs = 90 * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - threeMonthsMs;

    const postsWithin3Months = sortedRawPosts.filter((p: any) => {
      const pTime = new Date(p.datetime || p.date || p.timestamp || p.created_at || 0).getTime();
      return pTime > 0 && pTime >= cutoffTime;
    });

    let selectedRawPosts: any[] = [];
    if (postsWithin3Months.length > 0) {
      selectedRawPosts = postsWithin3Months.slice(0, 30);
    } else {
      selectedRawPosts = sortedRawPosts.slice(0, 30);
    }

    // =========================================================================
    // STEP 3: CHECK SNAPSHOTS IN BRIGHT DATA DASHBOARD FOR EACH POST
    // =========================================================================
    let postSnapshotIdUsed = providedPostsSnapshotId || "";

    // If client supplied a specific posts_snapshot_id on retry:
    if (providedPostsSnapshotId) {
      const checkProg = await checkSpecificSnapshot(providedPostsSnapshotId, apiKey, expiryDays);
      if (checkProg && checkProg.status === "ready") {
        await indexPostSnapshot(providedPostsSnapshotId, apiKey);
      } else if (checkProg && (checkProg.status === "running" || checkProg.status === "starting")) {
        const remainingBudget = Math.max(0, (GLOBAL_SAFE_TIMEOUT_MS - 4000) - (Date.now() - handlerStartTime));
        if (remainingBudget >= 8000) {
          const pollRes = await pollSnapshotUntilReady(providedPostsSnapshotId, apiKey, handlerStartTime, remainingBudget);
          if (pollRes.isReady) {
            await indexPostSnapshot(providedPostsSnapshotId, apiKey);
          } else {
            return res.status(200).json({
              success: false,
              status: "processing",
              step: "posts",
              snapshot_id: matchedProfileSnapshotId,
              posts_snapshot_id: providedPostsSnapshotId,
              username,
              message: `Bright Data post metrics collection in progress (${providedPostsSnapshotId}). Continuing polling...`,
            });
          }
        } else {
          return res.status(200).json({
            success: false,
            status: "processing",
            step: "posts",
            snapshot_id: matchedProfileSnapshotId,
            posts_snapshot_id: providedPostsSnapshotId,
            username,
            message: `Bright Data post metrics collection in progress (${providedPostsSnapshotId}). Continuing polling...`,
          });
        }
      }
    }

    // Scan recent post snapshots if plenty of safe time is still available
    let runningPostSnapshots: string[] = [];
    if (!forceRefresh && (Date.now() - handlerStartTime < 18000)) {
      runningPostSnapshots = await indexExistingPostSnapshotsFromDashboard(apiKey, expiryDays);
    }

    const missingUrls: string[] = [];
    for (let idx = 0; idx < selectedRawPosts.length; idx++) {
      const p = selectedRawPosts[idx];
      const sc = extractShortcode(p.url) || extractShortcode(p.id) || p.shortcode || p.id;
      const directUrl = p.url || (sc ? canonicalPostUrl(sc) : "");

      const cached =
        (sc ? postSnapshotCache.get(sc.toLowerCase()) : null) ||
        (directUrl ? postSnapshotCache.get(directUrl.toLowerCase()) : null);

      if (!cached || forceRefresh) {
        if (directUrl) missingUrls.push(directUrl);
      }
    }

    // =========================================================================
    // STEP 4: SCRAPE MISSING POSTS IF NOT IN DASHBOARD SNAPSHOT
    // =========================================================================
    let newlyScrapedCount = 0;

    if (missingUrls.length > 0 && !postSnapshotIdUsed) {
      let activePostSnapshotId = "";

      if (runningPostSnapshots.length > 0 && !forceRefresh) {
        activePostSnapshotId = runningPostSnapshots[0];
      } else {
        const postScrapeUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${POST_DATASET_ID}&notify=false&include_errors=true`;
        const postPayload = {
          input: missingUrls.map((u) => ({ url: u })),
        };

        const postResponse = await fetch(postScrapeUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postPayload),
          signal: AbortSignal.timeout(7000),
        });

        if (postResponse.ok) {
          const postText = await postResponse.text();
          const postResult: any = parseBrightDataResponse(postText);
          if (postResult && postResult.snapshot_id) {
            activePostSnapshotId = postResult.snapshot_id;
          } else if (Array.isArray(postResult)) {
            for (let i = 0; i < postResult.length; i++) {
              const item = postResult[i];
              const normalized = normalizeRawPost(item, i);
              const sc = normalized.post_id || extractShortcode(normalized.url);
              if (sc) postSnapshotCache.set(sc.toLowerCase(), normalized);
              if (normalized.url) postSnapshotCache.set(normalized.url.toLowerCase(), normalized);
              newlyScrapedCount++;
            }
          }
        }
      }

      if (activePostSnapshotId) {
        postSnapshotIdUsed = activePostSnapshotId;
        const remainingBudget = Math.max(0, (GLOBAL_SAFE_TIMEOUT_MS - 4000) - (Date.now() - handlerStartTime));

        // If time budget is tight (< 12s), return processing status immediately to avoid Vercel timeout!
        if (remainingBudget < 12000) {
          return res.status(200).json({
            success: false,
            status: "processing",
            step: "posts",
            snapshot_id: matchedProfileSnapshotId,
            posts_snapshot_id: activePostSnapshotId,
            username,
            message: `Bright Data post job started (${activePostSnapshotId}) for ${missingUrls.length} posts. Polling dashboard shortly...`,
          });
        }

        const pollResult = await pollSnapshotUntilReady(activePostSnapshotId, apiKey, handlerStartTime, remainingBudget);

        const items = Array.isArray(pollResult.data)
          ? pollResult.data
          : pollResult.data
          ? [pollResult.data]
          : [];
        if (pollResult.isReady && items.length > 0) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const normalized = normalizeRawPost(item, i);
            const sc = normalized.post_id || extractShortcode(normalized.url);
            if (sc) postSnapshotCache.set(sc.toLowerCase(), normalized);
            if (normalized.url) postSnapshotCache.set(normalized.url.toLowerCase(), normalized);
            newlyScrapedCount++;
          }
          indexedPostSnapshots.add(activePostSnapshotId);
        } else if (!pollResult.isReady) {
          return res.status(200).json({
            success: false,
            status: "processing",
            step: "posts",
            snapshot_id: matchedProfileSnapshotId,
            posts_snapshot_id: activePostSnapshotId,
            username,
            message: `Bright Data is collecting metrics for ${missingUrls.length} posts (snapshot ${activePostSnapshotId}). Polling dashboard...`,
          });
        }
      }
    }

    // =========================================================================
    // STEP 5: POPULATE VALUES FOR RULE-BASED CALCULATION PIPELINE
    // =========================================================================
    const finalPosts: ScrapedPost[] = [];
    let cachedPostsCount = 0;

    for (let idx = 0; idx < selectedRawPosts.length; idx++) {
      const p = selectedRawPosts[idx];
      const sc = extractShortcode(p.url) || extractShortcode(p.id) || p.shortcode || p.id;
      const directUrl = p.url || (sc ? canonicalPostUrl(sc) : "");

      const matched =
        (sc ? postSnapshotCache.get(sc.toLowerCase()) : null) ||
        (directUrl ? postSnapshotCache.get(directUrl.toLowerCase()) : null);

      if (matched) {
        finalPosts.push(matched);
        cachedPostsCount++;
      } else {
        // Fallback: use raw post info from profile with safe defaults so all posts are retained
        const fallback = normalizeRawPost(p, idx);
        finalPosts.push(fallback);
      }
    }

    const normalizedProfile = {
      id: `profile_${username}`,
      username,
      full_name: fullName,
      followers,
      following,
      posts_count: postsCount,
      is_verified: isVerified,
      is_private: isPrivate,
      joined_recently: isJoinedRecently,
      biography,
      profile_pic_url: profilePicUrl,
      archetypeTag: isProfileCacheHit
        ? `Bright Data Snapshot (${profileAgeDays}d old)`
        : "Live Scraped Profile",
      archetypeDescription: isProfileCacheHit
        ? `Profile snapshot (${matchedProfileSnapshotId}) retrieved from dashboard (${profileAgeDays}d old, ${profileDaysLeft}d TTL left). ${finalPosts.length} posts evaluated (${cachedPostsCount} from dashboard snapshots, ${newlyScrapedCount} live scraped).`
        : `Live scraped via Bright Data API. ${finalPosts.length} posts evaluated (${cachedPostsCount} from dashboard snapshots, ${newlyScrapedCount} live scraped). Stored in dashboard (TTL: ${expiryDays} days).`,
    };

    const message = isProfileCacheHit
      ? `Retrieved profile from dashboard snapshot (${matchedProfileSnapshotId}). Evaluated ${finalPosts.length} posts (${cachedPostsCount} from dashboard snapshots, ${newlyScrapedCount} live scraped).`
      : `Live scraped profile and evaluated ${finalPosts.length} posts (${cachedPostsCount} from dashboard snapshots, ${newlyScrapedCount} live scraped).`;

    return res.status(200).json({
      success: true,
      source: isProfileCacheHit ? "brightdata_dashboard_cache" : "brightdata_live",
      cache_hit: isProfileCacheHit,
      cache_age_days: profileAgeDays,
      cache_days_left: profileDaysLeft,
      cache_message: message,
      snapshot_id: matchedProfileSnapshotId,
      posts_snapshot_id: postSnapshotIdUsed,
      posts_cached_count: cachedPostsCount,
      posts_scraped_count: newlyScrapedCount,
      posts_total_count: finalPosts.length,
      profile: normalizedProfile,
      posts: finalPosts,
    });
  } catch (err: any) {
    console.error("Scrape handler error:", err);
    return res.status(500).json({
      error: err.message || "An unexpected error occurred during Instagram scraping.",
    });
  }
}
