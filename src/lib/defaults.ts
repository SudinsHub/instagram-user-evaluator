import { ReachConfig } from "@/types/evaluator";

export const DEFAULT_CONFIG: ReachConfig = {
  // Eligibility gate
  reject_private_accounts: true,
  nano_min_followers: 500,
  nano_max_followers: 50000,

  // Top-level blend
  reach_weight: 0.40,
  auth_weight: 0.60,

  // Reach sub-weights (sum to 1.0)
  w_follower_tier: 0.50,
  w_engagement_volume: 0.30,
  w_content_activity: 0.20,
  reach_follower_cap: 50000,
  engagement_volume_scale: 5000,
  content_activity_scale: 200,
  video_view_discount: 0.05,

  // Post handling
  impute_hidden_likes: true,

  // Authenticity sub-weights (sum to 1.0 before bonus)
  w_engagement_rate: 0.35,
  w_like_comment_ratio: 0.20,
  w_follow_ratio: 0.15,
  w_consistency: 0.15,
  w_growth_sanity: 0.10,
  w_verified_bonus: 0.05,
  comments_disabled_confidence_penalty: 0.15,

  // Healthy engagement rate bands
  er_bands: [
    { minFollowers: 0, maxFollowers: 2000, healthyMinER: 0.05, healthyMaxER: 0.15, label: "Nano (<2k)" },
    { minFollowers: 2000, maxFollowers: 10000, healthyMinER: 0.03, healthyMaxER: 0.10, label: "Micro (2k-10k)" },
    { minFollowers: 10000, maxFollowers: 50000, healthyMinER: 0.02, healthyMaxER: 0.08, label: "Mid (10k-50k)" },
    { minFollowers: 50000, maxFollowers: 1000000000, healthyMinER: 0.01, healthyMaxER: 0.06, label: "Macro (>50k)" },
  ],

  // Rating tiers
  rating_labels: [
    { minScore: 80, maxScore: 100, label: "Excellent - strong reach & trustworthy engagement", badge: "success" },
    { minScore: 65, maxScore: 80, label: "Good - solid partner candidate", badge: "info" },
    { minScore: 50, maxScore: 65, label: "Average - manual review recommended", badge: "warning" },
    { minScore: 35, maxScore: 50, label: "Below threshold - engagement/authenticity concerns", badge: "destructive" },
    { minScore: 0, maxScore: 35, label: "High risk - signals consistent with fake/inactive followers", badge: "destructive" },
  ],

  // Red-flag thresholds
  flag_thresholds: {
    low_engagement_rate: 30.0,
    low_consistency: 40.0,
    high_follow_ratio: 30.0,
    bad_like_comment_ratio: 30.0,
    growth_anomaly: 50.0,
  },
  manual_review_auth_threshold: 40.0,
};

export const PRESET_CONFIGS: Record<string, { name: string; desc: string; config: Partial<ReachConfig> }> = {
  default: {
    name: "Default Balanced (40/60)",
    desc: "Standard production baseline prioritizing authenticity (60%) over raw audience size (40%).",
    config: { ...DEFAULT_CONFIG },
  },
  strict_fraud: {
    name: "Strict Fraud Shield (25/75)",
    desc: "Heavy emphasis on authenticity (75%) with stricter variance standards and lower threshold tolerances.",
    config: {
      reach_weight: 0.25,
      auth_weight: 0.75,
      w_engagement_rate: 0.40,
      w_consistency: 0.25,
      flag_thresholds: {
        low_engagement_rate: 40.0,
        low_consistency: 50.0,
        high_follow_ratio: 40.0,
        bad_like_comment_ratio: 40.0,
        growth_anomaly: 60.0,
      },
      manual_review_auth_threshold: 50.0,
    },
  },
  reach_focused: {
    name: "Audience Reach Priority (65/35)",
    desc: "For viral sponsor campaigns where raw impression volume and view count matter more than micro-interactions.",
    config: {
      reach_weight: 0.65,
      auth_weight: 0.35,
      w_follower_tier: 0.40,
      w_engagement_volume: 0.45,
      w_content_activity: 0.15,
      video_view_discount: 0.10, // 10% view weighting
    },
  },
  lenient_nano: {
    name: "Emerging Nano Friendly (50/50)",
    desc: "Lower follower floor (250) and wider engagement corridors tailored to early-stage micro-creators.",
    config: {
      nano_min_followers: 250,
      reach_weight: 0.50,
      auth_weight: 0.50,
      reject_private_accounts: false,
    },
  },
};
