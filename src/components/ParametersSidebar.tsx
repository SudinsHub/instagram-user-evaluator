import React from "react";
import { ReachConfig } from "@/types/evaluator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SlidersHorizontal,
  Scale,
  ShieldAlert,
  Flame,
  ChevronDown,
  ChevronRight,
  Layers,
  X,
  Check,
} from "lucide-react";

interface ParametersSidebarProps {
  config: ReachConfig;
  onChangeConfig: (newConfig: ReachConfig) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export function ParametersSidebar({
  config,
  onChangeConfig,
  isOpenMobile = false,
  onCloseMobile,
}: ParametersSidebarProps) {
  // Collapsible section state
  const [openSections, setOpenSections] = React.useState({
    blend: true,
    reach: true,
    auth: true,
    bands: false,
    flags: false,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Helper to update top-level weights while preserving 1.0 sum
  const handleReachWeightChange = (newReachWeight: number) => {
    const clampedReach = Math.min(1, Math.max(0, newReachWeight));
    const newAuthWeight = Math.round((1 - clampedReach) * 100) / 100;
    onChangeConfig({
      ...config,
      reach_weight: clampedReach,
      auth_weight: newAuthWeight,
    });
  };

  const handleUpdate = <K extends keyof ReachConfig>(key: K, value: ReachConfig[K]) => {
    onChangeConfig({
      ...config,
      [key]: value,
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in-50"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-card border-r p-4 overflow-y-auto transition-transform duration-300 ease-in-out
          lg:static lg:z-auto lg:w-96 lg:translate-x-0 lg:max-h-[calc(100vh-4rem)] lg:bg-card/50
          ${isOpenMobile ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0 hidden lg:block"}
        `}
      >
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Parameter Controls</h2>
          </div>
          <div className="flex items-center space-x-1.5">
            <Badge variant="outline" className="text-[10px] font-mono">
              Live (0ms)
            </Badge>
            {onCloseMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onCloseMobile}
                className="h-7 w-7 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 pt-3">
          {/* 1. Global Blend Weight */}
          <div className="rounded-lg border bg-card p-3 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => toggleSection("blend")}
              className="flex w-full items-center justify-between text-xs font-semibold hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center space-x-1.5">
                <Scale className="h-3.5 w-3.5 text-blue-500" />
                <span>Top-Level Blend Balance</span>
              </span>
              {openSections.blend ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {openSections.blend && (
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Reach Weight</span>
                    <span className="font-mono font-semibold text-primary">
                      {Math.round(config.reach_weight * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.reach_weight}
                    onValueChange={handleReachWeightChange}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>0% (Authenticity)</span>
                    <span>100% (Reach)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md bg-muted/60 p-2 text-xs">
                  <span className="text-muted-foreground">Authenticity Weight:</span>
                  <span className="font-mono font-semibold">
                    {Math.round(config.auth_weight * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Reach Score Weights & Caps */}
          <div className="rounded-lg border bg-card p-3 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => toggleSection("reach")}
              className="flex w-full items-center justify-between text-xs font-semibold hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center space-x-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>Reach Components & Caps</span>
              </span>
              {openSections.reach ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {openSections.reach && (
              <div className="space-y-3 pt-1 text-xs">
                {/* W_Follower Tier */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Audience Size (W_tier)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_follower_tier * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_follower_tier}
                    onValueChange={(val) => handleUpdate("w_follower_tier", val)}
                  />
                </div>

                {/* W_Engagement Volume */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Volume Per Post (W_volume)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_engagement_volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_engagement_volume}
                    onValueChange={(val) => handleUpdate("w_engagement_volume", val)}
                  />
                </div>

                {/* W_Content Activity */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activity History (W_activity)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_content_activity * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_content_activity}
                    onValueChange={(val) => handleUpdate("w_content_activity", val)}
                  />
                </div>

                {/* Follower Cap */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Follower Log Cap (F_cap)</span>
                    <span className="font-mono font-semibold">
                      {config.reach_follower_cap.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    min={10000}
                    max={200000}
                    step={5000}
                    value={config.reach_follower_cap}
                    onValueChange={(val) => handleUpdate("reach_follower_cap", val)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Diminishing returns threshold.
                  </p>
                </div>

                {/* Video View Discount */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Video View Discount</span>
                    <span className="font-mono font-semibold">
                      {(config.video_view_discount * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={0.01}
                    max={0.20}
                    step={0.01}
                    value={config.video_view_discount}
                    onValueChange={(val) => handleUpdate("video_view_discount", Math.round(val * 100) / 100)}
                  />
                </div>

                {/* Impute hidden likes toggle */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <span className="font-medium text-foreground">Impute Hidden Likes</span>
                    <p className="text-[10px] text-muted-foreground">
                      Use median visible likes
                    </p>
                  </div>
                  <Switch
                    checked={config.impute_hidden_likes}
                    onCheckedChange={(val) => handleUpdate("impute_hidden_likes", val)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Authenticity Sub-Weights */}
          <div className="rounded-lg border bg-card p-3 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => toggleSection("auth")}
              className="flex w-full items-center justify-between text-xs font-semibold hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                <span>Authenticity Weights</span>
              </span>
              {openSections.auth ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {openSections.auth && (
              <div className="space-y-3 pt-1 text-xs">
                {/* W_ER */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Engagement Rate (W_er)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_engagement_rate * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_engagement_rate}
                    onValueChange={(val) => handleUpdate("w_engagement_rate", val)}
                  />
                </div>

                {/* W_Like Comment Ratio */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Like/Comment Ratio (W_lc)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_like_comment_ratio * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_like_comment_ratio}
                    onValueChange={(val) => handleUpdate("w_like_comment_ratio", val)}
                  />
                </div>

                {/* W_Follow Ratio */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Follower/Following (W_ff)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_follow_ratio * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_follow_ratio}
                    onValueChange={(val) => handleUpdate("w_follow_ratio", val)}
                  />
                </div>

                {/* W_Consistency */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance CV (W_cv)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_consistency * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_consistency}
                    onValueChange={(val) => handleUpdate("w_consistency", val)}
                  />
                </div>

                {/* W_Growth */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Growth Sanity (W_growth)</span>
                    <span className="font-mono font-semibold">
                      {Math.round(config.w_growth_sanity * 100)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.w_growth_sanity}
                    onValueChange={(val) => handleUpdate("w_growth_sanity", val)}
                  />
                </div>

                {/* Verified Bonus & Disabled Comments Penalty */}
                <div className="pt-2 border-t space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verified Bonus</span>
                    <span className="font-mono font-semibold">
                      +{Math.round(config.w_verified_bonus * 100)} pts
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={0.15}
                    step={0.01}
                    value={config.w_verified_bonus}
                    onValueChange={(val) => handleUpdate("w_verified_bonus", Math.round(val * 100) / 100)}
                  />

                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Comments Disabled Penalty</span>
                    <span className="font-mono font-semibold text-destructive">
                      -{(config.comments_disabled_confidence_penalty * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={0.40}
                    step={0.05}
                    value={config.comments_disabled_confidence_penalty}
                    onValueChange={(val) => handleUpdate("comments_disabled_confidence_penalty", Math.round(val * 100) / 100)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Eligibility Gate & Red-Flag Cutoffs */}
          <div className="rounded-lg border bg-card p-3 shadow-sm space-y-3">
            <button
              type="button"
              onClick={() => toggleSection("flags")}
              className="flex w-full items-center justify-between text-xs font-semibold hover:text-primary transition-colors text-left"
            >
              <span className="flex items-center space-x-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                <span>Gate & Risk Cutoffs</span>
              </span>
              {openSections.flags ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {openSections.flags && (
              <div className="space-y-3 pt-1 text-xs">
                {/* Private account toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-foreground">Reject Private Accounts</span>
                  </div>
                  <Switch
                    checked={config.reject_private_accounts}
                    onCheckedChange={(val) => handleUpdate("reject_private_accounts", val)}
                  />
                </div>

                {/* Nano min followers floor */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nano Floor (Min Followers)</span>
                    <span className="font-mono font-semibold">
                      {config.nano_min_followers.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    min={100}
                    max={2000}
                    step={50}
                    value={config.nano_min_followers}
                    onValueChange={(val) => handleUpdate("nano_min_followers", val)}
                  />
                </div>

                {/* Red-Flag Low ER Threshold */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Low ER Flag Cutoff</span>
                    <span className="font-mono font-semibold">
                      &lt; {config.flag_thresholds.low_engagement_rate}
                    </span>
                  </div>
                  <Slider
                    min={10}
                    max={60}
                    step={5}
                    value={config.flag_thresholds.low_engagement_rate}
                    onValueChange={(val) =>
                      onChangeConfig({
                        ...config,
                        flag_thresholds: {
                          ...config.flag_thresholds,
                          low_engagement_rate: val,
                        },
                      })
                    }
                  />
                </div>

                {/* Red-Flag Flat Consistency Threshold */}
                <div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flat Variance Flag Score</span>
                    <span className="font-mono font-semibold">
                      &lt; {config.flag_thresholds.low_consistency}
                    </span>
                  </div>
                  <Slider
                    min={20}
                    max={60}
                    step={5}
                    value={config.flag_thresholds.low_consistency}
                    onValueChange={(val) =>
                      onChangeConfig({
                        ...config,
                        flag_thresholds: {
                          ...config.flag_thresholds,
                          low_consistency: val,
                        },
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <div className="pt-2 lg:hidden">
              <Button
                variant="default"
                className="w-full space-x-1"
                onClick={onCloseMobile}
              >
                <Check className="h-4 w-4" />
                <span>Apply & Close Controls</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
