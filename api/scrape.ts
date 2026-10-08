/**
 * Vercel Serverless Function: /api/scrape
 * Queries Bright Data Scraper (gd_l1vikfch901nx3by4) for Instagram profile & posts.
 */

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

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-BrightData-Key, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // 1. Extract username
    const username = (
      req.query?.username ||
      req.body?.username ||
      ""
    ).toString().trim().toLowerCase().replace(/^@/, "");

    if (!username) {
      return res.status(400).json({
        error: "Missing username parameter. Please provide an Instagram username without '@'.",
      });
    }

    // 2. Resolve Bright Data API key (from header or server env)
    const apiKey = (
      req.headers?.["x-brightdata-key"] ||
      process.env.BRIGHTDATA_API_KEY ||
      process.env.BRIGHT_DATA_API_KEY ||
      ""
    ).toString().trim();

    if (!apiKey) {
      return res.status(401).json({
        error:
          "Bright Data API Key is not configured. Please set BRIGHTDATA_API_KEY in your Vercel Environment Variables or enter it in the app settings modal.",
        requiresApiKey: true,
      });
    }

    const profileDatasetId = "gd_l1vikfch901nx3by4";

    // 3. Trigger Scrape via Bright Data API
    const scrapeUrl = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${profileDatasetId}&notify=false&include_errors=true&type=discover_new&discover_by=user_name`;

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

    let resultData: any = await scrapeResponse.json();

    // 4. Handle Async Snapshot polling if returned a snapshot_id
    if (resultData && !Array.isArray(resultData) && resultData.snapshot_id) {
      const snapshotId = resultData.snapshot_id;
      const progressUrl = `https://api.brightdata.com/datasets/v3/progress/${snapshotId}`;
      const downloadUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;

      const startTime = Date.now();
      const maxWaitMs = 120000; // 120s max
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
      return res.status(404).json({
        error: record?.error || `No Instagram profile found for @${username}. The user might be private or inactive.`,
      });
    }

    // Normalize Profile
    const followers = Number(
      record.followers || record.followersCount || record.follower_count || 0
    );
    const following = Number(
      record.following || record.followingCount || record.followsCount || 0
    );
    const postsCount = Number(
      record.posts_count || record.postsCount || record.media_count || 0
    );
    const isVerified = Boolean(record.is_verified || record.verified || false);
    const isPrivate = Boolean(record.is_private || record.private || false);
    const fullName = record.full_name || record.fullName || record.name || username;
    const biography = record.biography || record.bio || "";
    const profilePicUrl =
      record.profile_pic_url || record.profilePicUrl || record.profile_image_url || "";

    // Normalize Posts
    const rawPosts: any[] =
      record.posts || record.latest_posts || record.recent_posts || [];
    const normalizedPosts: ScrapedPost[] = rawPosts.slice(0, 20).map((p: any, idx: number) => {
      const likesVal = Number(p.likes || p.like_count || p.likesCount || 0);
      const isHidden = Boolean(
        p.likes_hidden || p.is_likes_hidden || (p.likes === 0 && likesVal === 0 && !p.is_video)
      );

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

    return res.status(200).json({
      success: true,
      source: "brightdata_live",
      profile: {
        id: `scraped_${username}`,
        username,
        full_name: fullName,
        followers,
        following,
        posts_count: postsCount,
        is_verified: isVerified,
        is_private: isPrivate,
        biography,
        profile_pic_url: profilePicUrl,
        archetypeTag: "Live Scraped Profile",
        archetypeDescription: `Live scraped via Bright Data API (${followers.toLocaleString()} followers, ${normalizedPosts.length} posts analyzed).`,
      },
      posts: normalizedPosts,
    });
  } catch (err: any) {
    console.error("Scrape handler error:", err);
    return res.status(500).json({
      error: err.message || "An unexpected error occurred during Instagram scraping.",
    });
  }
}
