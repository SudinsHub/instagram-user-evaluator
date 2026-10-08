import React, { useState, useMemo, useEffect } from "react";
import { DEFAULT_CONFIG, PRESET_CONFIGS } from "@/lib/defaults";
import { CREATOR_DATASETS } from "@/data/mockProfiles";
import { runEvaluation } from "@/lib/evaluator";
import { ReachConfig } from "@/types/evaluator";
import { Header } from "@/components/Header";
import { ParametersSidebar } from "@/components/ParametersSidebar";
import { ScorecardOverview } from "@/components/ScorecardOverview";
import { GlassBoxInspector } from "@/components/GlassBoxInspector";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { PostDataTable } from "@/components/PostDataTable";
import { ExportModal } from "@/components/ExportModal";
import { EmptyProfileState } from "@/components/EmptyProfileState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calculator,
  BarChart3,
  Database,
  SlidersHorizontal,
  Code2,
} from "lucide-react";

export function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Configuration & Creator state (No default user selected for privacy & security!)
  const [config, setConfig] = useState<ReachConfig>({ ...DEFAULT_CONFIG });
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [mobileParamsOpen, setMobileParamsOpen] = useState(false);

  // Sync dark mode class on root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Active dataset (null if not yet selected)
  const activeDataset = selectedCreatorId ? CREATOR_DATASETS[selectedCreatorId] || null : null;

  // Real-time evaluation calculation (runs in < 1ms client-side when profile is selected)
  const evaluationResult = useMemo(() => {
    if (!activeDataset) return null;
    return runEvaluation(activeDataset.profile, activeDataset.posts, config);
  }, [activeDataset, config]);

  // Preset handler
  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESET_CONFIGS[presetKey];
    if (preset) {
      setConfig((prev) => ({
        ...prev,
        ...preset.config,
      }));
    }
  };

  // Reset handler
  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_CONFIG });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Header */}
      <Header
        selectedCreatorId={selectedCreatorId}
        onSelectCreator={setSelectedCreatorId}
        activeCreator={activeDataset ? activeDataset.profile : null}
        onResetDefaults={handleResetDefaults}
        onApplyPreset={handleApplyPreset}
        onOpenExport={() => setExportModalOpen(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        onToggleMobileParams={() => setMobileParamsOpen(!mobileParamsOpen)}
        mobileParamsOpen={mobileParamsOpen}
      />

      {/* Main Workspace: Left Parameters Sidebar + Right Interactive Panels */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Parameter Control Center (Drawer on mobile, Sidebar on desktop) */}
        <ParametersSidebar
          config={config}
          onChangeConfig={setConfig}
          isOpenMobile={mobileParamsOpen}
          onCloseMobile={() => setMobileParamsOpen(false)}
        />

        {/* Right: Results & Analysis Workspace */}
        <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6 max-h-[calc(100vh-4rem)] pb-20 lg:pb-6">
          {!activeDataset || !evaluationResult ? (
            /* Empty State: Prompt User to Select an Archetype */
            <EmptyProfileState onSelectCreator={setSelectedCreatorId} />
          ) : (
            /* Active Creator Evaluation Workspace */
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between pb-1 border-b overflow-x-auto">
                <TabsList className="w-full sm:w-auto justify-start">
                  <TabsTrigger value="overview" className="flex items-center space-x-1.5 text-xs py-1.5 px-3">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Scorecard & Audit</span>
                  </TabsTrigger>
                  <TabsTrigger value="glassbox" className="flex items-center space-x-1.5 text-xs py-1.5 px-3">
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Glass-Box Math</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center space-x-1.5 text-xs py-1.5 px-3">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>Radar & Trends</span>
                  </TabsTrigger>
                  <TabsTrigger value="posts" className="flex items-center space-x-1.5 text-xs py-1.5 px-3">
                    <Database className="h-3.5 w-3.5" />
                    <span>Posts ({activeDataset.posts.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab 1: Overview Scorecards */}
              <TabsContent value="overview">
                <ScorecardOverview
                  profile={activeDataset.profile}
                  result={evaluationResult}
                  config={config}
                />
              </TabsContent>

              {/* Tab 2: Glass-Box Explainability */}
              <TabsContent value="glassbox">
                <GlassBoxInspector
                  profile={activeDataset.profile}
                  result={evaluationResult}
                  config={config}
                />
              </TabsContent>

              {/* Tab 3: Visual Analytics */}
              <TabsContent value="analytics">
                <AnalyticsCharts
                  result={evaluationResult}
                  posts={activeDataset.posts}
                />
              </TabsContent>

              {/* Tab 4: Raw Post Dataset */}
              <TabsContent value="posts">
                <PostDataTable
                  posts={activeDataset.posts}
                  imputeHiddenLikes={config.impute_hidden_likes}
                  medianVisibleLikes={evaluationResult.post_stats.median_likes}
                />
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* Floating Bottom Action Bar for Mobile Screens */}
      {activeDataset && (
        <div className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-between border-t bg-background/95 backdrop-blur p-2.5 px-4 lg:hidden shadow-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileParamsOpen(true)}
            className="flex-1 mr-2 text-xs h-9 space-x-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
            <span>Tune Parameters</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="flex-1 text-xs h-9 space-x-1.5 shadow"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Export Config</span>
          </Button>
        </div>
      )}

      {/* Export Configuration Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        config={config}
      />
    </div>
  );
}

export default App;
