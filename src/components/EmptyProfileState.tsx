import React from "react";
import { CREATOR_DATASETS } from "@/data/mockProfiles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, UserCheck, Bot, Users, Ghost, Award, ArrowRight, Lock } from "lucide-react";

interface EmptyProfileStateProps {
  onSelectCreator: (id: string) => void;
}

export function EmptyProfileState({ onSelectCreator }: EmptyProfileStateProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case "clara_lifestyle":
        return <UserCheck className="h-5 w-5 text-emerald-500" />;
      case "borderline_nano":
        return <Lock className="h-5 w-5 text-blue-500" />;
      case "bot_farm":
        return <Bot className="h-5 w-5 text-rose-500" />;
      case "pod_ring":
        return <Users className="h-5 w-5 text-amber-500" />;
      case "ghost_followers":
        return <Ghost className="h-5 w-5 text-purple-500" />;
      case "alex_macro":
        return <Award className="h-5 w-5 text-blue-500" />;
      default:
        return <ShieldCheck className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      {/* Welcome Hero Banner */}
      <div className="rounded-xl border bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 text-center space-y-3 shadow-sm">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-1">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Select a Creator Profile to Begin Evaluation
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          No profile is preloaded by default to safeguard user privacy and security. Choose any test archetype below to inspect the evaluation pipeline, review step-by-step math formulas, and tune scoring weights.
        </p>
      </div>

      {/* Archetype Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Available Creator Archetypes
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Object.entries(CREATOR_DATASETS).map(([id, data]) => {
            const { profile } = data;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectCreator(id)}
                className="text-left rounded-xl border bg-card p-4 shadow-sm hover:border-primary/50 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getIcon(id)}
                      <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors">
                        @{profile.username}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono">
                      {profile.followers.toLocaleString()} fol.
                    </Badge>
                  </div>

                  <Badge variant="secondary" className="text-[10px] w-fit">
                    {profile.archetypeTag}
                  </Badge>

                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {profile.archetypeDescription}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t text-[11px] font-medium text-primary w-full">
                  <span>Load Evaluation</span>
                  <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
