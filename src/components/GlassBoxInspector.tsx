import React from "react";
import { CreatorProfile, EvaluationResult, ReachConfig } from "@/types/evaluator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Binary,
  Layers,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

interface GlassBoxInspectorProps {
  profile: CreatorProfile;
  result: EvaluationResult;
  config: ReachConfig;
}

export function GlassBoxInspector({
  profile,
  result,
  config,
}: GlassBoxInspectorProps) {
  const { post_stats, reach_breakdown, auth_breakdown } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 border-b">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary" />
            <span>Glass-Box Internal Calculation Engine</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Complete mathematical explainability showing actual plugged-in values, intermediate steps, and active weights.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Deterministic Math
        </Badge>
      </div>

      {/* 1. Step 1: Pre-Scoring Gate Check */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
              <span>Eligibility Gate Evaluation</span>
            </CardTitle>
            <Badge variant={result.eligible ? "success" : "destructive"}>
              {result.eligible ? "Eligible (Passed)" : "Hard Rejected"}
            </Badge>
          </div>
          <CardDescription>
            Validates account accessibility and nano-influencer audience floors before scoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border p-2.5 bg-muted/30">
              <div className="text-muted-foreground font-medium">Privacy Check:</div>
              <div className="font-mono mt-1 flex items-center justify-between">
                <span>is_private = {String(profile.is_private)}</span>
                <span className="text-[10px] text-muted-foreground">
                  (reject_private = {String(config.reject_private_accounts)})
                </span>
              </div>
            </div>

            <div className="rounded-md border p-2.5 bg-muted/30">
              <div className="text-muted-foreground font-medium">Audience Floor:</div>
              <div className="font-mono mt-1 flex items-center justify-between">
                <span>{profile.followers.toLocaleString()} vs {config.nano_min_followers.toLocaleString()}</span>
                <span className={profile.followers >= config.nano_min_followers ? "text-emerald-500 font-semibold" : "text-destructive font-semibold"}>
                  {profile.followers >= config.nano_min_followers ? "≥ Floor ✅" : "< Floor ❌"}
                </span>
              </div>
            </div>

            <div className="rounded-md border p-2.5 bg-muted/30">
              <div className="text-muted-foreground font-medium">Audience Ceiling:</div>
              <div className="font-mono mt-1 flex items-center justify-between">
                <span>{profile.followers.toLocaleString()} vs {config.nano_max_followers.toLocaleString()}</span>
                <span className="text-muted-foreground">
                  {profile.followers <= config.nano_max_followers ? "Within Nano" : "Exceeds (Info)"}
                </span>
              </div>
            </div>
          </div>

          {result.gate_reasons.length > 0 && (
            <div className="rounded bg-muted p-2 font-mono text-[11px] text-muted-foreground">
              Gate reasons logged: {result.gate_reasons.join(" | ")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Step 2: Post Stats Extraction & Hidden Like Imputation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
              <span>Post Engagement Metrics & Statistical Extraction</span>
            </CardTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {post_stats.num_posts_used} Posts Analyzed
            </Badge>
          </div>
          <CardDescription>
            Resolves hidden like counts using median imputation and computes variance distributions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-md border p-2.5">
              <div className="text-muted-foreground">Mean Likes (μ_likes)</div>
              <div className="text-base font-bold font-mono mt-1 text-foreground">
                {post_stats.mean_likes.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground">Median: {post_stats.median_likes}</div>
            </div>

            <div className="rounded-md border p-2.5">
              <div className="text-muted-foreground">Mean Comments (μ_comments)</div>
              <div className="text-base font-bold font-mono mt-1 text-foreground">
                {post_stats.mean_comments.toFixed(1)}
              </div>
              <div className="text-[10px] text-muted-foreground">Median: {post_stats.median_comments}</div>
            </div>

            <div className="rounded-md border p-2.5">
              <div className="text-muted-foreground">Coefficient of Variation (CV)</div>
              <div className="text-base font-bold font-mono mt-1 text-foreground">
                {post_stats.cv_likes !== null ? post_stats.cv_likes.toFixed(3) : "N/A"}
              </div>
              <div className="text-[10px] text-muted-foreground">σ(likes) / μ(likes)</div>
            </div>

            <div className="rounded-md border p-2.5">
              <div className="text-muted-foreground">Hidden Likes Ratio</div>
              <div className="text-base font-bold font-mono mt-1 text-foreground">
                {(post_stats.likes_hidden_ratio * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] text-muted-foreground">
                Imputation: {config.impute_hidden_likes ? "Enabled ✅" : "Disabled ❌"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Step 3: Reach Score Mathematical Formulation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
              <span>Reach Score Breakdown & Log-Scaling Equations</span>
            </CardTitle>
            <div className="font-mono text-sm font-bold text-foreground">
              Score: {result.reach_score} / 100
            </div>
          </div>
          <CardDescription>
            Combines audience size, interaction volume, and publishing activity with logarithmic diminishing returns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Formula 1: Follower Tier */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">1. Follower Tier Component (S_tier)</span>
              <span className="font-mono font-bold text-primary">
                {reach_breakdown.follower_tier_score} / 100
              </span>
            </div>
            <div className="rounded bg-background p-2 font-mono text-[11px] text-muted-foreground border">
              Formula: 100 × log10(min(F, {config.reach_follower_cap}) + 1) / log10({config.reach_follower_cap} + 1)
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Substituted: 100 × log10({reach_breakdown.capped_followers} + 1) / log10({config.reach_follower_cap} + 1) ={" "}
              <span className="text-foreground font-semibold">{reach_breakdown.follower_tier_score}</span>
              {" "}(Contribution: {reach_breakdown.follower_tier_score} × {config.w_follower_tier} ={" "}
              {(reach_breakdown.follower_tier_score * config.w_follower_tier).toFixed(2)} pts)
            </div>
          </div>

          {/* Formula 2: Engagement Volume */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">2. Engagement Volume Component (S_volume)</span>
              <span className="font-mono font-bold text-primary">
                {reach_breakdown.engagement_volume_score} / 100
              </span>
            </div>
            <div className="rounded bg-background p-2 font-mono text-[11px] text-muted-foreground border">
              Formula: min(100, 100 × log10(Volume + 1) / log10({config.engagement_volume_scale} + 1))
              <br />
              Where Volume = μ_likes + μ_comments = {reach_breakdown.engagement_volume}
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Substituted: 100 × log10({reach_breakdown.engagement_volume} + 1) / log10({config.engagement_volume_scale} + 1) ={" "}
              <span className="text-foreground font-semibold">{reach_breakdown.engagement_volume_score}</span>
              {" "}(Contribution: {reach_breakdown.engagement_volume_score} × {config.w_engagement_volume} ={" "}
              {(reach_breakdown.engagement_volume_score * config.w_engagement_volume).toFixed(2)} pts)
            </div>
          </div>

          {/* Formula 3: Content Activity */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">3. Content Activity Component (S_activity)</span>
              <span className="font-mono font-bold text-primary">
                {reach_breakdown.content_activity_score} / 100
              </span>
            </div>
            <div className="rounded bg-background p-2 font-mono text-[11px] text-muted-foreground border">
              Formula: min(100, 100 × log10(PostsCount + 1) / log10({config.content_activity_scale} + 1))
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Substituted: 100 × log10({reach_breakdown.posts_count} + 1) / log10({config.content_activity_scale} + 1) ={" "}
              <span className="text-foreground font-semibold">{reach_breakdown.content_activity_score}</span>
              {" "}(Contribution: {reach_breakdown.content_activity_score} × {config.w_content_activity} ={" "}
              {(reach_breakdown.content_activity_score * config.w_content_activity).toFixed(2)} pts)
            </div>
          </div>

          {/* Reach Blend Total */}
          <div className="rounded-md border bg-primary/5 p-3 flex justify-between items-center text-xs">
            <span className="font-medium">Total Reach Score:</span>
            <span className="font-mono font-bold text-base text-primary">
              {(reach_breakdown.follower_tier_score * config.w_follower_tier +
                reach_breakdown.engagement_volume_score * config.w_engagement_volume +
                reach_breakdown.content_activity_score * config.w_content_activity).toFixed(2)}{" "}
              = {result.reach_score} / 100
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Step 4: Authenticity Score Mathematical Formulation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
              <span>Authenticity Score Formulation & Corridor Scoring</span>
            </CardTitle>
            <div className="font-mono text-sm font-bold text-foreground">
              Score: {result.authenticity_score} / 100
            </div>
          </div>
          <CardDescription>
            Multi-signal proxy model assessing organic engagement corridors, discussiveness, and audience fluctuation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {/* Signal 1: ER Corridor */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">1. Engagement Rate vs Follower Tier Corridor (S_er)</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {auth_breakdown.engagement_rate} / 100
              </span>
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Actual ER: {auth_breakdown.engagement_rate_pct} | Healthy Tier Corridor: [{auth_breakdown.healthy_er_band_pct}]
            </div>
            <div className="text-[11px] text-muted-foreground">
              Rule: If within corridor → 100.0. If below corridor → 100 × (ER / min_corridor). If above → soft discount.
            </div>
          </div>

          {/* Signal 2: Like to Comment */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">2. Like-to-Comment Discussiveness Ratio (S_lc)</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {auth_breakdown.like_comment_ratio} / 100
              </span>
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Ratio: {post_stats.mean_likes.toFixed(1)} / ({post_stats.mean_comments.toFixed(1)} + 1) = {auth_breakdown.like_comment_ratio_value}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Rule: Ratio ≤ 40 → 100.0 (high discussion). Ratio ≥ 150 → 10.0 (silent bought likes). Interpolated linearly.
            </div>
          </div>

          {/* Signal 3: Follower to Following */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">3. Following / Follower Proportion (S_ff)</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {auth_breakdown.follow_ratio} / 100
              </span>
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Ratio: {profile.following} / {profile.followers} = {auth_breakdown.follow_ratio_value}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Rule: Ratio ≤ 0.5 → 100.0. Ratio ≥ 3.0 → 10.0 (follow-unfollow churn).
            </div>
          </div>

          {/* Signal 4: Consistency CV */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-foreground">4. Post Engagement Variance (S_cv)</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {auth_breakdown.consistency} / 100
              </span>
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              CV = {post_stats.cv_likes !== null ? post_stats.cv_likes.toFixed(3) : "N/A"}
            </div>
            <div className="text-[11px] text-muted-foreground">
              Rule: CV &lt; 0.15 → 30.0 (unnaturally flat bot packages). CV &lt; 0.30 → 70.0. CV ≥ 0.30 → 100.0 (organic audience fluctuation).
            </div>
          </div>

          {/* Modifiers: Verified Bonus & Hidden Comments Penalty */}
          <div className="rounded-md border p-3 flex flex-wrap justify-between items-center gap-2 bg-muted/10">
            <div className="text-[11px]">
              <span className="font-medium text-foreground">Active Modifiers: </span>
              {auth_breakdown.verified_bonus_applied && (
                <Badge variant="success" className="text-[10px] mr-2">Verified Bonus (+{config.w_verified_bonus * 100} pts)</Badge>
              )}
              {auth_breakdown.comments_penalty_applied && (
                <Badge variant="destructive" className="text-[10px]">Comments Penalty (-{config.comments_disabled_confidence_penalty * 100}%)</Badge>
              )}
              {!auth_breakdown.verified_bonus_applied && !auth_breakdown.comments_penalty_applied && (
                <span className="text-muted-foreground">None applied</span>
              )}
            </div>
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              Final Auth: {result.authenticity_score} / 100
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Step 5: Final Blended Rating Integration */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">5</span>
            <span>Final Composite Rating Synthesis</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="rounded-md bg-background border p-3 font-mono text-xs">
            Overall Rating = ({Math.round(config.reach_weight * 100)}% × {result.reach_score}) + ({Math.round(config.auth_weight * 100)}% × {result.authenticity_score}) ={" "}
            <span className="font-bold text-foreground text-sm">{result.overall_rating.toFixed(2)} / 100</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Mapped Rating Tier:</span>
            <span className="font-semibold text-foreground">{result.rating_label}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
