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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Calculator, BarChart3, Database } from "lucide-react";

export function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Configuration & Creator state
  const [config, setConfig] = useState<ReachConfig>({ ...DEFAULT_CONFIG });
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("yukiii");
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Sync dark mode class on root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Active dataset
  const activeDataset = CREATOR_DATASETS[selectedCreatorId] || CREATOR_DATASETS.yukiii;

  // Real-time evaluation calculation (runs in < 1ms client-side!)
  const evaluationResult = useMemo(() => {
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
        activeCreator={activeDataset.profile}
        onResetDefaults={handleResetDefaults}
        onApplyPreset={handleApplyPreset}
        onOpenExport={() => setExportModalOpen(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
      />

      {/* Main Workspace: Left Parameters Sidebar + Right Interactive Panels */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Parameter Control Center */}
        <ParametersSidebar config={config} onChangeConfig={setConfig} />

        {/* Right: Results & Analysis Workspace */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 max-h-[calc(100vh-4rem)]">
          {/* Main Workspace Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between pb-1 border-b">
              <TabsList>
                <TabsTrigger value="overview" className="flex items-center space-x-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Scorecard & Audit</span>
                </TabsTrigger>
                <TabsTrigger value="glassbox" className="flex items-center space-x-1.5">
                  <Calculator className="h-3.5 w-3.5" />
                  <span>Glass-Box Formulas</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Visual Radar & Trends</span>
                </TabsTrigger>
                <TabsTrigger value="posts" className="flex items-center space-x-1.5">
                  <Database className="h-3.5 w-3.5" />
                  <span>Post Dataset ({activeDataset.posts.length})</span>
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
        </main>
      </div>

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
