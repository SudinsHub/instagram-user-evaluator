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
  SlidersHorizontal,
} from "lucide-react";

interface HeaderProps {
  selectedCreatorId: string;
  onSelectCreator: (id: string) => void;
  activeCreator: CreatorProfile | null;
  onResetDefaults: () => void;
  onApplyPreset: (presetKey: string) => void;
  onOpenExport: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  onToggleMobileParams: () => void;
  mobileParamsOpen: boolean;
  onOpenApiKeyModal: () => void;
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
  onToggleMobileParams,
  mobileParamsOpen,
  onOpenApiKeyModal,
}: HeaderProps) {
  const [presetOpen, setPresetOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-col sm:flex-row items-center justify-between px-3 sm:px-6 py-2.5 sm:py-0 sm:h-16 gap-2 sm:gap-4">
        {/* Brand / Logo + Mobile Params Toggle */}
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow shrink-0">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm sm:text-base tracking-tight">
                  Reach & Authenticity
                </span>
                <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 h-4">
                  v2.4
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground hidden md:block">
                Interactive Parameter Tuning & Glass-Box Engine
              </p>
            </div>
          </div>

          {/* Mobile Parameters Toggle Button */}
          <div className="flex items-center space-x-1 sm:hidden">
            <Button
              variant={mobileParamsOpen ? "default" : "outline"}
              size="sm"
              onClick={onToggleMobileParams}
              className="text-xs h-8 px-2.5 space-x-1"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Params</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleTheme}
              className="h-8 w-8"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {/* Center / Creator Selector */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground hidden lg:inline shrink-0">Profile:</span>
          <div className="relative w-full sm:w-64">
            <select
              value={selectedCreatorId}
              onChange={(e) => onSelectCreator(e.target.value)}
              className="w-full h-8 sm:h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <option value="">-- Select Creator Archetype --</option>
              {Object.entries(CREATOR_DATASETS).map(([id, data]) => (
                <option key={id} value={id}>
                  @{data.profile.username} ({data.profile.archetypeTag})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Actions (Desktop) */}
        <div className="hidden sm:flex items-center space-x-2 shrink-0">
          {/* Preset selector dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetOpen(!presetOpen)}
              className="text-xs space-x-1 h-9"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden md:inline">Presets</span>
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
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 md:mr-1" />
            <span className="hidden md:inline">Reset</span>
          </Button>

          {/* Export Config */}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenExport}
            className="text-xs space-x-1 shadow h-9"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>

          {/* Bright Data API Key Settings */}
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenApiKeyModal}
            className="h-8 w-8 text-amber-500 hover:text-amber-600"
            title="Configure Bright Data API Key"
          >
            <Sparkles className="h-4 w-4" />
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
