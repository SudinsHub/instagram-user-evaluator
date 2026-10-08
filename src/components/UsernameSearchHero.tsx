import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Sparkles,
  AlertCircle,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Database,
} from "lucide-react";
import { CREATOR_DATASETS } from "@/data/mockProfiles";

interface UsernameSearchHeroProps {
  onScrapeUsername: (username: string) => Promise<void>;
  onSelectArchetype: (id: string) => void;
  isLoading: boolean;
  statusMessage: string;
  errorMessage: string | null;
  onOpenApiKeyModal: () => void;
  hasApiKey: boolean;
}

export function UsernameSearchHero({
  onScrapeUsername,
  onSelectArchetype,
  isLoading,
  statusMessage,
  errorMessage,
  onOpenApiKeyModal,
  hasApiKey,
}: UsernameSearchHeroProps) {
  const [handle, setHandle] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim().replace(/^@/, "");
    if (clean) {
      onScrapeUsername(clean);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Search Bar Card */}
      <div className="rounded-xl border bg-card/90 shadow-sm p-4 sm:p-6 space-y-4 backdrop-blur">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center space-x-2">
              <span>Audit Any Instagram Creator</span>
              <Badge variant="outline" className="text-[10px] font-mono">
                Bright Data API
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter any public Instagram handle to scrape real-time engagement and evaluate reach & authenticity.
            </p>
          </div>

          {/* API Key Status Pill */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="flex items-center space-x-1.5 self-start sm:self-auto rounded-md border border-input bg-background/50 hover:bg-muted/80 px-2.5 py-1 text-xs text-muted-foreground transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[11px] font-medium">
              {hasApiKey ? "API Key Configured ✅" : "Set API Key ⚙️"}
            </span>
          </button>
        </div>

        {/* Input & Scrape Button Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground text-sm font-semibold">
              @
            </span>
            <input
              type="text"
              placeholder="Enter Instagram username (e.g. cristiano, zuck, mkbhd...)"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 pl-8 pr-4 rounded-lg border border-input bg-background text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !handle.trim()}
            className="h-11 px-5 text-sm font-semibold shadow-sm space-x-2 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Scraping...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Scrape & Evaluate</span>
              </>
            )}
          </Button>
        </form>

        {/* Live Loading Status Pill */}
        {isLoading && (
          <div className="flex items-center space-x-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-primary animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="font-mono text-[11px]">{statusMessage || "Querying Bright Data scraper..."}</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Scraping Notice</div>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
              {errorMessage.includes("API Key") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenApiKeyModal}
                  className="mt-2 h-7 text-xs space-x-1"
                >
                  <KeyRound className="h-3 w-3" />
                  <span>Configure Bright Data API Key</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Sample Archetypes Quick Chips */}
        <div className="pt-2 border-t flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] text-muted-foreground mr-1 flex items-center space-x-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span>Or test preloaded archetypes:</span>
          </span>
          {Object.entries(CREATOR_DATASETS).map(([id, data]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectArchetype(id)}
              disabled={isLoading}
              className="rounded-md border border-input bg-background/50 hover:bg-muted/80 px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              @{data.profile.username}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
