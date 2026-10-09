/**
 * Vercel Serverless Function & Local Dev Handler: /api/cached-profiles
 * Scans the /cache directory on disk and returns all stored Instagram profiles.
 * No mock data: purely discovers real cached JSON files.
 */

import fs from "node:fs";
import path from "node:path";

export interface CachedProfileSummary {
  username: string;
  full_name: string;
  followers: number;
  following: number;
  posts_count: number;
  is_verified: boolean;
  is_private: boolean;
  cached_at: string;
  age_days: number;
  days_left: number;
}

function resolveExpiryDays(): number {
  if (process.env.CACHE_EXPIRY_DAYS) {
    const parsed = parseInt(process.env.CACHE_EXPIRY_DAYS, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 10;
}

export function listCachedProfilesFromDisk(): CachedProfileSummary[] {
  const expiryDays = resolveExpiryDays();
  const candidateDirs = [
    path.resolve(process.cwd(), "cache"),
    path.resolve("/tmp", "cache"),
    path.resolve(process.cwd(), "..", "BrightData", "cache"),
  ];

  const seen = new Set<string>();
  const results: CachedProfileSummary[] = [];

  for (const dir of candidateDirs) {
    if (!fs.existsSync(dir)) continue;

    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const username = file.replace(/\.json$/, "").toLowerCase();
        if (seen.has(username)) continue;

        const filepath = path.join(dir, file);
        try {
          const content = fs.readFileSync(filepath, "utf-8");
          const record = JSON.parse(content);

          const cachedAtStr = record.cached_at || new Date().toISOString();
          const cachedAt = new Date(cachedAtStr).getTime();
          const ageDays = (Date.now() - cachedAt) / (1000 * 60 * 60 * 24);
          const daysLeft = Math.max(0, expiryDays - ageDays);

          const profile = record.profile || {};
          const posts = record.posts || [];

          seen.add(username);
          results.push({
            username: record.username || username,
            full_name: profile.full_name || profile.fullName || username,
            followers: Number(profile.followers || profile.followersCount || 0),
            following: Number(profile.following || profile.followingCount || 0),
            posts_count: Number(profile.posts_count || profile.postsCount || posts.length || 0),
            is_verified: Boolean(profile.is_verified || profile.verified),
            is_private: Boolean(profile.is_private || profile.private),
            cached_at: cachedAtStr,
            age_days: Math.round(ageDays * 10) / 10,
            days_left: Math.round(daysLeft * 10) / 10,
          });
        } catch {
          // Ignore invalid JSON files
        }
      }
    } catch {
      // Ignore unreadable directory
    }
  }

  // Sort by most recently cached first
  return results.sort((a, b) => new Date(b.cached_at).getTime() - new Date(a.cached_at).getTime());
}

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const cachedProfiles = listCachedProfilesFromDisk();

    // Prevent CDN from caching this listing so newly scraped profiles appear immediately
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.status(200).json({
      success: true,
      count: cachedProfiles.length,
      cachedProfiles,
    });
  } catch (err: any) {
    console.error("Cached profiles listing error:", err);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(500).json({
      error: err.message || "Failed to list cached profiles.",
    });
  }
}
