import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Sparkles, AlertCircle, RefreshCw, Database } from "lucide-react";

interface UsernameSearchHeroProps {
  onScrapeUsername: (username: string, forceRefresh?: boolean) => Promise<void>;
  isLoading: boolean;
  statusMessage: string;
  errorMessage: string | null;
}

export function UsernameSearchHero({
  onScrapeUsername,
  isLoading,
  statusMessage,
  errorMessage,
}: UsernameSearchHeroProps) {
  const [handle, setHandle] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handle.trim().replace(/^@/, "");
    if (clean) {
      onScrapeUsername(clean, forceRefresh);
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
                Dashboard Snapshot Cache
              </Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter any public Instagram handle. Automatically retrieves existing snapshots from the Bright Data dashboard if scraped within <code className="bg-muted px-1 py-0.5 rounded font-mono">CACHE_EXPIRY_DAYS</code> (0 re-scraping cost).
            </p>
          </div>

          {/* Dashboard Cache Indicator */}
          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground shrink-0">
            <Database className="h-3.5 w-3.5 text-sky-500" />
            <span className="text-[11px] font-medium">Bright Data Cache Active</span>
          </div>
        </div>

        {/* Input & Scrape Button Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground text-sm font-semibold">
                @
              </span>
              <input
                type="text"
                placeholder="Enter Instagram username (e.g. cristiano, zuck, mkbhd, shahnur_shourov...)"
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
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Audit Creator</span>
                </>
              )}
            </Button>
          </div>

          {/* Force Refresh Option Checkbox */}
          <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-0.5">
            <input
              type="checkbox"
              id="forceRefreshCheck"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input cursor-pointer"
            />
            <label htmlFor="forceRefreshCheck" className="cursor-pointer select-none flex items-center space-x-1">
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
              <span>Force live re-scrape (bypass Bright Data dashboard snapshot cache)</span>
            </label>
          </div>
        </form>

        {/* Live Loading Status Pill */}
        {isLoading && (
          <div className="flex items-center space-x-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-primary animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span className="font-mono text-[11px]">{statusMessage || "Checking Bright Data dashboard for existing snapshot..."}</span>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Notice</div>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
