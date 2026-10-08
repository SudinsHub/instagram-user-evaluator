import React from "react";
import { ReachConfig } from "@/types/evaluator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Download, X } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReachConfig;
}

export function ExportModal({ isOpen, onClose, config }: ExportModalProps) {
  const [copiedType, setCopiedType] = React.useState<"python" | "json" | null>(null);

  if (!isOpen) return null;

  // Generate Python snippet
  const pythonSnippet = `# ==============================================================================
# 🎛️ TUNED REACH & AUTHENTICITY CONFIGURATION
# Exported from Interactive Evaluator Web UI
# ==============================================================================

from authenticity_evaluator.reach_evaluator import ReachConfig

tuned_config = ReachConfig(
    # Eligibility Gate
    reject_private_accounts=${config.reject_private_accounts ? "True" : "False"},
    nano_min_followers=${config.nano_min_followers},
    nano_max_followers=${config.nano_max_followers},

    # Top-Level Weights
    reach_weight=${config.reach_weight.toFixed(2)},
    auth_weight=${config.auth_weight.toFixed(2)},

    # Reach Sub-Weights & Scaling Anchors
    w_follower_tier=${config.w_follower_tier.toFixed(2)},
    w_engagement_volume=${config.w_engagement_volume.toFixed(2)},
    w_content_activity=${config.w_content_activity.toFixed(2)},
    reach_follower_cap=${config.reach_follower_cap},
    engagement_volume_scale=${config.engagement_volume_scale},
    content_activity_scale=${config.content_activity_scale},
    video_view_discount=${config.video_view_discount.toFixed(2)},
    impute_hidden_likes=${config.impute_hidden_likes ? "True" : "False"},

    # Authenticity Sub-Weights & Modifiers
    w_engagement_rate=${config.w_engagement_rate.toFixed(2)},
    w_like_comment_ratio=${config.w_like_comment_ratio.toFixed(2)},
    w_follow_ratio=${config.w_follow_ratio.toFixed(2)},
    w_consistency=${config.w_consistency.toFixed(2)},
    w_growth_sanity=${config.w_growth_sanity.toFixed(2)},
    w_verified_bonus=${config.w_verified_bonus.toFixed(2)},
    comments_disabled_confidence_penalty=${config.comments_disabled_confidence_penalty.toFixed(2)},

    # Trigger Cutoffs
    flag_thresholds={
        "low_engagement_rate": ${config.flag_thresholds.low_engagement_rate.toFixed(1)},
        "low_consistency": ${config.flag_thresholds.low_consistency.toFixed(1)},
        "high_follow_ratio": ${config.flag_thresholds.high_follow_ratio.toFixed(1)},
        "bad_like_comment_ratio": ${config.flag_thresholds.bad_like_comment_ratio.toFixed(1)},
        "growth_anomaly": ${config.flag_thresholds.growth_anomaly.toFixed(1)},
    },
    manual_review_auth_threshold=${config.manual_review_auth_threshold.toFixed(1)},
)`;

  const jsonSnippet = JSON.stringify(config, null, 2);

  const handleCopy = (text: string, type: "python" | "json") => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonSnippet], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tuned_reach_authenticity_config.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-2xl rounded-xl border bg-background shadow-xl p-5 space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div>
            <h3 className="font-semibold text-base">Export Tuned Configuration</h3>
            <p className="text-xs text-muted-foreground">
              Drop these tuned parameters back into your Python codebase or notebook.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content Tabs */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Python Config */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center space-x-1.5">
                <span>Python Code (`ReachConfig`)</span>
                <Badge variant="outline" className="text-[10px]">Ready to Paste</Badge>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(pythonSnippet, "python")}
                className="text-xs h-7"
              >
                {copiedType === "python" ? (
                  <>
                    <Check className="h-3 w-3 mr-1 text-emerald-500" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
            </div>
            <pre className="rounded-lg bg-muted/60 border p-3 font-mono text-[11px] text-foreground overflow-x-auto max-h-52">
              {pythonSnippet}
            </pre>
          </div>

          {/* JSON Config */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Raw JSON Config</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(jsonSnippet, "json")}
                  className="text-xs h-7"
                >
                  {copiedType === "json" ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadJSON}
                  className="text-xs h-7 space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </Button>
              </div>
            </div>
            <pre className="rounded-lg bg-muted/60 border p-3 font-mono text-[11px] text-foreground overflow-x-auto max-h-36">
              {jsonSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-3 flex justify-end shrink-0">
          <Button variant="default" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
