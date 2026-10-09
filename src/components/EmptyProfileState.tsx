import React from "react";
import { CachedProfileItem } from "@/types/evaluator";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, HardDrive, ArrowRight, UserCheck, Sparkles, Clock, FileText } from "lucide-react";

interface EmptyProfileStateProps {
  onSelectCreator: (username: string) => void;
  cachedProfiles: CachedProfileItem[];
}

export function EmptyProfileState({
  onSelectCreator,
  cachedProfiles = [],
}: EmptyProfileStateProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Welcome Hero Banner */}
      <div className="rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 text-center space-y-3 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {cachedProfiles.length > 0
            ? "Select a Cached Creator or Enter Any Handle Above"
            : "Enter Any Instagram Handle to Begin Evaluation"}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          {cachedProfiles.length > 0
            ? `Found ${cachedProfiles.length} verified profile record(s) in your local /cache directory. Click any cached account below for instant evaluation (0 network calls, $0 cost), or use the search bar above to scrape any new creator.`
            : "No cached profiles found in /cache. Type any Instagram username in the search bar above to live scrape and evaluate."}
        </p>
      </div>

      {/* Cached Profiles Cards Grid */}
      {cachedProfiles.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
              <HardDrive className="h-3.5 w-3.5 text-emerald-500" />
              <span>Cached Profiles in /cache directory ({cachedProfiles.length})</span>
            </h3>
            <span className="text-[11px] text-muted-foreground">Instant 0ms Load • $0 Cost</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cachedProfiles.map((item) => (
              <button
                key={item.username}
                type="button"
                onClick={() => onSelectCreator(item.username)}
                className="text-left rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors block truncate">
                          @{item.username}
                        </span>
                        {item.full_name && item.full_name !== item.username && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {item.full_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                      {item.followers ? `${item.followers.toLocaleString()} fol.` : "Cached"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-normal">
                      <HardDrive className="h-2.5 w-2.5 mr-1" />
                      Cached File
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
                      <FileText className="h-2.5 w-2.5 mr-1" />
                      {item.posts_count} posts
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground pt-1">
                    <Clock className="h-3 w-3" />
                    <span>Saved {item.age_days}d ago • {item.days_left}d TTL left</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-[11px] font-medium text-primary w-full">
                  <span>Load Evaluation</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center space-y-2 max-w-lg mx-auto">
          <HardDrive className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
          <h4 className="text-sm font-semibold">No Cached JSON Files Found</h4>
          <p className="text-xs text-muted-foreground">
            Any creator profile you search and scrape will automatically be saved to <code className="px-1 py-0.5 rounded bg-muted font-mono text-[11px]">cache/&lt;username&gt;.json</code> and listed here.
          </p>
        </div>
      )}
    </div>
  );
}
