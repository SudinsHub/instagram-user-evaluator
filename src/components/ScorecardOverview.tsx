import React from "react";
import { CreatorProfile, EvaluationResult, ReachConfig } from "@/types/evaluator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  TrendingUp,
  Users,
  Eye,
  MessageCircle,
  ThumbsUp,
  Lock,
  BadgeCheck,
  Flame,
  ShieldAlert,
} from "lucide-react";

interface ScorecardOverviewProps {
  profile: CreatorProfile;
  result: EvaluationResult;
  config: ReachConfig;
}

export function ScorecardOverview({
  profile,
  result,
  config,
}: ScorecardOverviewProps) {
  // Score letter grade helper
  const getGrade = (score: number) => {
    if (score >= 90) return { letter: "A+", color: "text-emerald-500" };
    if (score >= 80) return { letter: "A", color: "text-emerald-500" };
    if (score >= 65) return { letter: "B", color: "text-blue-500" };
    if (score >= 50) return { letter: "C", color: "text-amber-500" };
    if (score >= 35) return { letter: "D", color: "text-orange-500" };
    return { letter: "F", color: "text-rose-500" };
  };

  const grade = getGrade(result.overall_rating);

  return (
    <div className="space-y-4">
      {/* 1. Creator Profile Header Card */}
      <Card className="overflow-hidden border bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Avatar & Profile Info */}
            <div className="flex items-start sm:items-center space-x-4">
              <img
                src={profile.profile_pic_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                alt={profile.username}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 border-border object-cover shadow-sm shrink-0"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    @{profile.username}
                  </h1>
                  {profile.is_verified && (
                    <span title="Verified Creator">
                      <BadgeCheck className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                    </span>
                  )}
                  {profile.is_private && (
                    <Badge variant="destructive" className="space-x-1 text-[11px]">
                      <Lock className="h-3 w-3" />
                      <span>Private Account</span>
                    </Badge>
                  )}
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {profile.archetypeTag}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {profile.full_name || "Instagram Creator"} {profile.biography ? `• ${profile.biography}` : ""}
                </div>
                <p className="text-[11px] text-muted-foreground/90 max-w-2xl pt-0.5">
                  {profile.archetypeDescription}
                </p>
              </div>
            </div>

            {/* Right: Profile Stat Pill Badges */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 gap-1.5 shrink-0">
              <div className="flex items-center space-x-3 text-xs">
                <div className="text-center sm:text-right">
                  <div className="font-bold text-foreground font-mono">
                    {profile.followers.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Followers</div>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="text-center sm:text-right">
                  <div className="font-bold text-foreground font-mono">
                    {profile.following.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Following</div>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="text-center sm:text-right">
                  <div className="font-bold text-foreground font-mono">
                    {profile.posts_count}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Total Posts</div>
                </div>
              </div>

              {/* Eligibility Gate Pill */}
              <div className="pt-1">
                {result.eligible ? (
                  <Badge variant="success" className="space-x-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Gate Passed</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="space-x-1 text-[10px]">
                    <XCircle className="h-3 w-3" />
                    <span>Gate Rejected</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Gate Rejection Alert if applicable */}
      {!result.eligible && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive space-y-1">
          <div className="flex items-center space-x-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Eligibility Gate Notice:</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
            {result.gate_reasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Hero Evaluation Scorecards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Blended Overall Composite Score */}
        <Card className="relative overflow-hidden border shadow-sm flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Blended Composite Rating
              </span>
              <span className={`text-xl font-black ${grade.color}`}>
                Grade {grade.letter}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono text-foreground">
                {result.overall_rating.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-muted-foreground">/ 100</span>
            </div>

            <Progress
              value={result.overall_rating}
              className="h-2.5"
              indicatorClassName={
                result.overall_rating >= 65
                  ? "bg-emerald-500"
                  : result.overall_rating >= 50
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }
            />

            <div className="rounded bg-muted/60 p-2 text-xs">
              <div className="font-medium text-foreground">{result.rating_label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Formula: ({Math.round(config.reach_weight * 100)}% × {result.reach_score}) + ({Math.round(config.auth_weight * 100)}% × {result.authenticity_score})
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Reach Score Card */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>Audience Reach</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                Weight: {Math.round(config.reach_weight * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-foreground">
                {result.reach_score.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
            </div>

            {/* Sub components breakdown */}
            <div className="space-y-2 text-xs pt-1">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Follower Tier ({Math.round(config.w_follower_tier * 100)}%)</span>
                  <span className="font-mono font-medium">{result.reach_breakdown.follower_tier_score}</span>
                </div>
                <Progress value={result.reach_breakdown.follower_tier_score} className="h-1.5" />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Engagement Vol. ({Math.round(config.w_engagement_volume * 100)}%)</span>
                  <span className="font-mono font-medium">{result.reach_breakdown.engagement_volume_score}</span>
                </div>
                <Progress value={result.reach_breakdown.engagement_volume_score} className="h-1.5" />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-muted-foreground">Activity History ({Math.round(config.w_content_activity * 100)}%)</span>
                  <span className="font-mono font-medium">{result.reach_breakdown.content_activity_score}</span>
                </div>
                <Progress value={result.reach_breakdown.content_activity_score} className="h-1.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Authenticity Score Card */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Authenticity & Trust</span>
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                Weight: {Math.round(config.auth_weight * 100)}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-foreground">
                {result.authenticity_score.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
            </div>

            {/* Sub signals breakdown */}
            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Engagement Rate ({result.auth_breakdown.engagement_rate_pct})</span>
                <span className="font-mono font-medium">{result.auth_breakdown.engagement_rate}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Like/Comment Ratio ({result.auth_breakdown.like_comment_ratio_value})</span>
                <span className="font-mono font-medium">{result.auth_breakdown.like_comment_ratio}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Follower/Following ({result.auth_breakdown.follow_ratio_value})</span>
                <span className="font-mono font-medium">{result.auth_breakdown.follow_ratio}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Engagement CV (Variance)</span>
                <span className="font-mono font-medium">{result.auth_breakdown.consistency}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Growth Sanity</span>
                <span className="font-mono font-medium">{result.auth_breakdown.growth_sanity}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Diagnostic Red Flags Pill List */}
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>Fraud & Integrity Signals ({result.flags.length})</span>
          </span>
          <span className="text-[10px] text-muted-foreground">
            Evaluated against configured trigger cutoffs
          </span>
        </div>

        {result.flags.length === 0 ? (
          <div className="flex items-center space-x-2 rounded-md bg-emerald-500/10 p-2.5 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>No critical red flags triggered. Account engagement behavior passes all configured risk thresholds.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {result.flags.map((flag) => {
              const isManualReview = flag === "MANUAL_REVIEW_RECOMMENDED";
              return (
                <Badge
                  key={flag}
                  variant={isManualReview ? "warning" : "destructive"}
                  className="space-x-1 py-1 px-2.5 font-mono text-[11px]"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{flag.replace(/_/g, " ")}</span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
