import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Database, Sparkles, TrendingUp, Cpu, Bot, CheckCircle2 } from "lucide-react";

interface EmptyProfileStateProps {
  onSelectCreator?: (username: string) => void;
}

export function EmptyProfileState({}: EmptyProfileStateProps) {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Welcome Hero Banner */}
      <div className="rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 text-center space-y-3 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Enter Any Instagram Handle to Begin Evaluation
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Type an Instagram username above to evaluate audience reach, authentic engagement rate, bot activity penalty, and brand safety.
        </p>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-5 space-y-2.5 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
            <Database className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Bright Data Dashboard Cache</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Automatically reuses completed snapshots from your Bright Data dashboard if scraped within <code className="font-mono text-[11px] text-foreground">CACHE_EXPIRY_DAYS</code> (0 re-scraping delay or cost).
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-2.5 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Audience Reach Penalties</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Accounts with &gt;100k followers incur a mathematically graduated reach penalty to reflect realistic Instagram algorithmic distribution decay.
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-2.5 shadow-sm">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Authenticity Diagnostics</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Analyzes like-to-comment ratios, hidden engagement metrics, video view consistency, and follower-to-engagement divergence for bot detection.
          </p>
        </div>
      </div>
    </div>
  );
}
