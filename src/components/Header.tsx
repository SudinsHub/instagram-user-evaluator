import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreatorProfile } from "@/types/evaluator";
import { CREATOR_DATASETS } from "@/data/mockProfiles";
import { PRESET_CONFIGS } from "@/lib/defaults";
import {
  RotateCcw,
  Code2,
  Moon,
  Sun,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from "lucide-react";

interface HeaderProps {
  selectedCreatorId: string;
  onSelectCreator: (id: string) => void;
  activeCreator: CreatorProfile;
  onResetDefaults: () => void;
  onApplyPreset: (presetKey: string) => void;
  onOpenExport: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
}

export function Header({
  selectedCreatorId,
  onSelectCreator,
  activeCreator,
  onResetDefaults,
  onApplyPreset,
  onOpenExport,
  darkMode,
  onToggleTheme,
}: HeaderProps) {
  const [presetOpen, setPresetOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight">
                Instagram Reach & Authenticity
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-mono">
                v2.4
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Interactive Parameter Tuning & Glass-Box Calculation Engine
            </p>
          </div>
        </div>

        {/* Center / Creator Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted-foreground hidden md:inline">Auditing:</span>
          <div className="relative">
            <select
              value={selectedCreatorId}
              onChange={(e) => onSelectCreator(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              {Object.entries(CREATOR_DATASETS).map(([id, data]) => (
                <option key={id} value={id}>
                  @{data.profile.username} ({data.profile.archetypeTag})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Preset selector dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetOpen(!presetOpen)}
              className="text-xs space-x-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden sm:inline">Presets</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            {presetOpen && (
              <div
                className="absolute right-0 mt-1 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50 text-xs"
                onClick={() => setPresetOpen(false)}
              >
                <div className="px-2 py-1.5 font-semibold text-muted-foreground">
                  Load Evaluation Preset
                </div>
                {Object.entries(PRESET_CONFIGS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onApplyPreset(key)}
                    className="w-full text-left rounded px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetDefaults}
            title="Reset parameters to factory defaults"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          {/* Export Config */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenExport}
            className="text-xs space-x-1 shadow"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Export Config</span>
          </Button>

          {/* Dark / Light Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            className="h-8 w-8"
            title="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
