export interface FollowerTierBand {
  minFollowers: number;
  maxFollowers: number;
  healthyMinER: number; // e.g. 0.05 for 5%
  healthyMaxER: number; // e.g. 0.15 for 15%
  label: string;
}

export interface RatingLabel {
  minScore: number;
  maxScore: number;
  label: string;
  badge: "success" | "info" | "warning" | "destructive";
}

export interface FlagThresholds {
  low_engagement_rate: number;
  low_consistency: number;
  high_follow_ratio: number;
  bad_like_comment_ratio: number;
  growth_anomaly: number;
}

export interface ReachConfig {
  // Eligibility gate
  reject_private_accounts: boolean;
  nano_min_followers: number;
  nano_max_followers: number;

  // Top-level blend (sum to 1.0)
  reach_weight: number;
  auth_weight: number;

  // Reach sub-weights (sum to 1.0)
  w_follower_tier: number;
  w_engagement_volume: number;
  w_content_activity: number;
  reach_follower_cap: number;
  engagement_volume_scale: number;
  content_activity_scale: number;
  video_view_discount: number;

  // Post handling
  impute_hidden_likes: boolean;

  // Authenticity sub-weights (sum to 1.0 before bonus)
  w_engagement_rate: number;
  w_like_comment_ratio: number;
  w_follow_ratio: number;
  w_consistency: number;
  w_growth_sanity: number;
  w_verified_bonus: number;
  comments_disabled_confidence_penalty: number;

  // Bands and thresholds
  er_bands: FollowerTierBand[];
  rating_labels: RatingLabel[];
  flag_thresholds: FlagThresholds;
  manual_review_auth_threshold: number;
}

export interface CreatorProfile {
  id: string;
  username: string;
  full_name: string;
  followers: number;
  following: number;
  posts_count: number;
  is_verified: boolean;
  is_private: boolean;
  joined_recently?: boolean;
  profile_pic_url?: string;
  biography?: string;
  archetypeTag: string;
  archetypeDescription: string;
}

export interface CreatorPost {
  post_id: string;
  date: string;
  likes: number;
  likes_hidden: boolean;
  comments_count: number;
  views: number;
  is_video: boolean;
  caption?: string;
  image_url?: string;
}

export interface PostStats {
  num_posts_used: number;
  mean_likes: number;
  median_likes: number;
  mean_comments: number;
  median_comments: number;
  cv_likes: number | null;
  avg_video_views: number | null;
  comments_disabled_ratio: number;
  likes_hidden_ratio: number;
  likes_list: number[];
  comments_list: number[];
}

export interface ReachBreakdown {
  follower_tier_score: number;
  engagement_volume_score: number;
  content_activity_score: number;
  capped_followers: number;
  engagement_volume: number;
  posts_count: number;
}

export interface AuthenticityBreakdown {
  engagement_rate: number;
  like_comment_ratio: number;
  follow_ratio: number;
  consistency: number;
  growth_sanity: number;
  engagement_rate_value: number;
  engagement_rate_pct: string;
  healthy_er_band: [number, number];
  healthy_er_band_pct: string;
  like_comment_ratio_value: number;
  follow_ratio_value: number;
  verified_bonus_applied: boolean;
  comments_penalty_applied: boolean;
  raw_base_score: number;
}

export interface EvaluationResult {
  eligible: boolean;
  gate_reasons: string[];
  reach_score: number;
  reach_breakdown: ReachBreakdown;
  authenticity_score: number;
  auth_breakdown: AuthenticityBreakdown;
  overall_rating: number;
  rating_label: string;
  rating_badge: "success" | "info" | "warning" | "destructive";
  flags: string[];
  post_stats: PostStats;
}
