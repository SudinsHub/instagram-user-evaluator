import {
  ReachConfig,
  CreatorProfile,
  CreatorPost,
  PostStats,
  ReachBreakdown,
  AuthenticityBreakdown,
  EvaluationResult,
} from "@/types/evaluator";

/**
 * Calculates population standard deviation
 */
function pstdev(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Calculates median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates mean of an array of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 1. Eligibility Gate Check
 */
export function checkGate(
  profile: CreatorProfile,
  config: ReachConfig
): { eligible: boolean; gate_reasons: string[] } {
  const reasons: string[] = [];
  const isPrivate = Boolean(profile.is_private);
  const followers = profile.followers || 0;

  if (config.reject_private_accounts && isPrivate) {
    reasons.push("Account is private — ask creator to switch to public before evaluation.");
  }

  if (followers < config.nano_min_followers) {
    reasons.push(
      `Below nano-influencer floor (${followers.toLocaleString()} < ${config.nano_min_followers.toLocaleString()} followers).`
    );
  }

  if (followers > config.nano_max_followers) {
    reasons.push(
      `Above nano-influencer ceiling (${followers.toLocaleString()} > ${config.nano_max_followers.toLocaleString()} followers) — informational only.`
    );
  }

  const hardReject =
    (config.reject_private_accounts && isPrivate) ||
    followers < config.nano_min_followers;

  return {
    eligible: !hardReject,
    gate_reasons: reasons,
  };
}

/**
 * 2. Post Engagement Statistics Extraction
 */
export function extractPostStats(
  posts: CreatorPost[],
  config: ReachConfig
): PostStats {
  if (!posts || posts.length === 0) {
    return {
      num_posts_used: 0,
      mean_likes: 0,
      median_likes: 0,
      mean_comments: 0,
      median_comments: 0,
      cv_likes: null,
      avg_video_views: null,
      comments_disabled_ratio: 0,
      likes_hidden_ratio: 0,
      likes_list: [],
      comments_list: [],
    };
  }

  // Identify visible likes for imputation
  const visibleLikes = posts
    .filter((p) => !p.likes_hidden && p.likes !== undefined && p.likes !== null)
    .map((p) => Number(p.likes || 0));

  const medianVisibleLikes = visibleLikes.length > 0 ? median(visibleLikes) : 0;

  const resolvedLikes: number[] = [];
  let hiddenCount = 0;

  for (const post of posts) {
    if (post.likes_hidden) {
      hiddenCount++;
      if (config.impute_hidden_likes && medianVisibleLikes > 0) {
        resolvedLikes.push(medianVisibleLikes);
      } else {
        resolvedLikes.push(Number(post.likes || 0));
      }
    } else {
      resolvedLikes.push(Number(post.likes || 0));
    }
  }

  const comments = posts.map((p) => Number(p.comments_count || 0));
  const views = posts
    .filter((p) => p.views && Number(p.views) > 0)
    .map((p) => Number(p.views));

  const n = posts.length;
  const meanL = mean(resolvedLikes);
  const stdL = pstdev(resolvedLikes);
  const cvL = resolvedLikes.length > 0 && meanL > 0 ? stdL / meanL : null;

  return {
    num_posts_used: n,
    mean_likes: meanL,
    median_likes: median(resolvedLikes),
    mean_comments: mean(comments),
    median_comments: median(comments),
    cv_likes: cvL,
    avg_video_views: views.length > 0 ? mean(views) : null,
    comments_disabled_ratio: 0, // In standard public posts
    likes_hidden_ratio: n > 0 ? hiddenCount / n : 0,
    likes_list: resolvedLikes,
    comments_list: comments,
  };
}

/**
 * 3. Reach Score Computation (0 - 100)
 */
export function computeReachScore(
  profile: CreatorProfile,
  stats: PostStats,
  config: ReachConfig
): { score: number; breakdown: ReachBreakdown } {
  const followers = Math.max(Number(profile.followers || 0), 0);

  // 1. Follower Tier Component (log-scaled)
  const cappedFollowers = Math.min(followers, config.reach_follower_cap);
  const followerComponent =
    (100.0 * Math.log10(cappedFollowers + 1)) /
    Math.log10(config.reach_follower_cap + 1);

  // 2. Engagement Volume Component
  let engagementVolume = stats.mean_likes + stats.mean_comments;
  if (stats.avg_video_views && stats.avg_video_views > 0) {
    engagementVolume = Math.max(
      engagementVolume,
      stats.avg_video_views * config.video_view_discount
    );
  }
  const engagementComponent = Math.min(
    100.0,
    (100.0 * Math.log10(engagementVolume + 1)) /
      Math.log10(config.engagement_volume_scale + 1)
  );

  // 3. Content Activity Component
  const postsCount = Math.max(Number(profile.posts_count || 0), 0);
  const activityComponent = Math.min(
    100.0,
    (100.0 * Math.log10(postsCount + 1)) /
      Math.log10(config.content_activity_scale + 1)
  );

  const rawReach =
    config.w_follower_tier * followerComponent +
    config.w_engagement_volume * engagementComponent +
    config.w_content_activity * activityComponent;

  const score = Math.round(Math.min(rawReach, 100.0) * 100) / 100;

  return {
    score,
    breakdown: {
      follower_tier_score: Math.round(followerComponent * 100) / 100,
      engagement_volume_score: Math.round(engagementComponent * 100) / 100,
      content_activity_score: Math.round(activityComponent * 100) / 100,
      capped_followers: cappedFollowers,
      engagement_volume: Math.round(engagementVolume * 100) / 100,
      posts_count: postsCount,
    },
  };
}

/**
 * Healthy ER band helper
 */
export function getERBand(
  followers: number,
  config: ReachConfig
): [number, number] {
  for (const band of config.er_bands) {
    if (followers >= band.minFollowers && followers < band.maxFollowers) {
      return [band.healthyMinER, band.healthyMaxER];
    }
  }
  const last = config.er_bands[config.er_bands.length - 1];
  return [last.healthyMinER, last.healthyMaxER];
}

/**
 * 4. Authenticity Score Computation (0 - 100)
 */
export function computeAuthenticityScore(
  profile: CreatorProfile,
  stats: PostStats,
  config: ReachConfig
): { score: number; breakdown: AuthenticityBreakdown } {
  const followers = Math.max(Number(profile.followers || 1), 1);
  const follows = Number(profile.following || 0);

  const er = (stats.mean_likes + stats.mean_comments) / followers;
  const [healthyMin, healthyMax] = getERBand(followers, config);

  // Sub-score 1: ER Score
  let scoreER: number;
  if (er >= healthyMin && er <= healthyMax) {
    scoreER = 100.0;
  } else if (er < healthyMin) {
    scoreER = Math.max(0.0, 100.0 * (er / healthyMin));
  } else {
    const excess = er / healthyMax;
    scoreER = Math.max(40.0, 100.0 - (excess - 1.0) * 40.0);
  }

  // Sub-score 2: Like to Comment Ratio Score
  let scoreLC: number;
  if (stats.mean_likes === 0) {
    scoreLC = 30.0;
  } else {
    const ratio = stats.mean_likes / (stats.mean_comments + 1.0);
    if (ratio <= 40.0) {
      scoreLC = 100.0;
    } else if (ratio >= 150.0) {
      scoreLC = 10.0;
    } else {
      scoreLC = 100.0 - ((ratio - 40.0) / (150.0 - 40.0)) * 90.0;
    }
  }

  // Sub-score 3: Follower to Following Ratio Score
  let scoreFF: number;
  if (followers === 0) {
    scoreFF = 0.0;
  } else {
    const ratio = follows / followers;
    if (ratio <= 0.5) {
      scoreFF = 100.0;
    } else if (ratio >= 3.0) {
      scoreFF = 10.0;
    } else {
      scoreFF = 100.0 - ((ratio - 0.5) / (3.0 - 0.5)) * 90.0;
    }
  }

  // Sub-score 4: Consistency (CV of likes)
  let scoreCV: number;
  if (stats.cv_likes === null) {
    scoreCV = 60.0;
  } else if (stats.cv_likes < 0.15) {
    scoreCV = 30.0;
  } else if (stats.cv_likes < 0.30) {
    scoreCV = 70.0;
  } else {
    scoreCV = 100.0;
  }

  // Sub-score 5: Growth Sanity
  let scoreGrowth = 100.0;
  if (profile.joined_recently && followers > 5000) {
    scoreGrowth = 20.0;
  }

  let baseScore =
    config.w_engagement_rate * scoreER +
    config.w_like_comment_ratio * scoreLC +
    config.w_follow_ratio * scoreFF +
    config.w_consistency * scoreCV +
    config.w_growth_sanity * scoreGrowth;

  const rawBase = baseScore;

  let verifiedApplied = false;
  if (profile.is_verified) {
    baseScore += config.w_verified_bonus * 100.0;
    verifiedApplied = true;
  }

  let commentsPenaltyApplied = false;
  if (stats.comments_disabled_ratio > 0.5) {
    baseScore *= 1.0 - config.comments_disabled_confidence_penalty;
    commentsPenaltyApplied = true;
  }

  const finalScore = Math.round(Math.min(baseScore, 100.0) * 100) / 100;
  const likeCommentVal =
    Math.round((stats.mean_likes / (stats.mean_comments + 1.0)) * 100) / 100;
  const followRatioVal = Math.round((follows / followers) * 100) / 100;

  return {
    score: finalScore,
    breakdown: {
      engagement_rate: Math.round(scoreER * 100) / 100,
      like_comment_ratio: Math.round(scoreLC * 100) / 100,
      follow_ratio: Math.round(scoreFF * 100) / 100,
      consistency: Math.round(scoreCV * 100) / 100,
      growth_sanity: Math.round(scoreGrowth * 100) / 100,
      engagement_rate_value: Math.round(er * 10000) / 10000,
      engagement_rate_pct: `${(er * 100).toFixed(2)}%`,
      healthy_er_band: [healthyMin, healthyMax],
      healthy_er_band_pct: `${(healthyMin * 100).toFixed(1)}% - ${(healthyMax * 100).toFixed(1)}%`,
      like_comment_ratio_value: likeCommentVal,
      follow_ratio_value: followRatioVal,
      verified_bonus_applied: verifiedApplied,
      comments_penalty_applied: commentsPenaltyApplied,
      raw_base_score: Math.round(rawBase * 100) / 100,
    },
  };
}

/**
 * 5. Red-Flag Trigger Engine
 */
export function buildFlags(
  authBreakdown: AuthenticityBreakdown,
  authScore: number,
  stats: PostStats,
  config: ReachConfig
): string[] {
  const flags: string[] = [];

  if (authBreakdown.engagement_rate < config.flag_thresholds.low_engagement_rate) {
    flags.push("VERY_LOW_ENGAGEMENT_RATE");
  }
  if (authBreakdown.consistency < config.flag_thresholds.low_consistency) {
    flags.push("SUSPICIOUSLY_UNIFORM_ENGAGEMENT");
  }
  if (authBreakdown.follow_ratio < config.flag_thresholds.high_follow_ratio) {
    flags.push("HIGH_FOLLOW_TO_FOLLOWER_RATIO");
  }
  if (authBreakdown.like_comment_ratio < config.flag_thresholds.bad_like_comment_ratio) {
    flags.push("LIKES_WITHOUT_COMMENTS");
  }
  if (authBreakdown.growth_sanity < config.flag_thresholds.growth_anomaly) {
    flags.push("RAPID_UNEXPLAINED_GROWTH");
  }
  if (stats.comments_disabled_ratio > 0.5) {
    flags.push("COMMENTS_MOSTLY_DISABLED_LOW_CONFIDENCE");
  }
  if (stats.likes_hidden_ratio > 0.5) {
    flags.push("LIKES_MOSTLY_HIDDEN_BY_USER");
  }

  if (flags.length >= 2 || authScore < config.manual_review_auth_threshold) {
    flags.push("MANUAL_REVIEW_RECOMMENDED");
  }

  return flags;
}

/**
 * 6. Blended Overall Rating & Label
 */
export function computeOverallRating(
  reachScore: number,
  authScore: number,
  config: ReachConfig
): { overall: number; label: string; badge: "success" | "info" | "warning" | "destructive" } {
  const overall = Math.round(
    (config.reach_weight * reachScore + config.auth_weight * authScore) * 100
  ) / 100;

  for (const tier of config.rating_labels) {
    if (overall >= tier.minScore && overall <= tier.maxScore) {
      return {
        overall,
        label: tier.label,
        badge: tier.badge,
      };
    }
  }

  return {
    overall,
    label: "Unrated",
    badge: "info",
  };
}

/**
 * Master Evaluation Runner
 */
export function runEvaluation(
  profile: CreatorProfile,
  posts: CreatorPost[],
  config: ReachConfig
): EvaluationResult {
  const gate = checkGate(profile, config);
  const stats = extractPostStats(posts, config);
  const reach = computeReachScore(profile, stats, config);
  const auth = computeAuthenticityScore(profile, stats, config);
  const flags = buildFlags(auth.breakdown, auth.score, stats, config);
  const overall = computeOverallRating(reach.score, auth.score, config);

  return {
    eligible: gate.eligible,
    gate_reasons: gate.gate_reasons,
    reach_score: reach.score,
    reach_breakdown: reach.breakdown,
    authenticity_score: auth.score,
    auth_breakdown: auth.breakdown,
    overall_rating: overall.overall,
    rating_label: overall.label,
    rating_badge: overall.badge,
    flags,
    post_stats: stats,
  };
}
