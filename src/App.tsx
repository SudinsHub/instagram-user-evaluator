import React, { useState, useMemo, useEffect } from "react";
import { DEFAULT_CONFIG, PRESET_CONFIGS } from "@/lib/defaults";
import { runEvaluation } from "@/lib/evaluator";
import { ReachConfig, CreatorDataset } from "@/types/evaluator";
import { Header } from "@/components/Header";
import { ParametersSidebar } from "@/components/ParametersSidebar";
import { ScorecardOverview } from "@/components/ScorecardOverview";
import { GlassBoxInspector } from "@/components/GlassBoxInspector";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { PostDataTable } from "@/components/PostDataTable";
import { ExportModal } from "@/components/ExportModal";
import { EmptyProfileState } from "@/components/EmptyProfileState";
import { UsernameSearchHero } from "@/components/UsernameSearchHero";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calculator,
  BarChart3,
  Database,
  SlidersHorizontal,
  Code2,
  Search,
} from "lucide-react";

export function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Configuration state
  const [config, setConfig] = useState<ReachConfig>({ ...DEFAULT_CONFIG });

  // Creator selection (None selected by default for security & privacy!)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Modals state
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [mobileParamsOpen, setMobileParamsOpen] = useState(false);

  // Search / Scraper state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState("");
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  // In-memory active datasets (loaded from Bright Data dashboard snapshot or live scraping)
  const [scrapedDatasets, setScrapedDatasets] = useState<Record<string, CreatorDataset>>({});

  // Sync dark mode class on root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Pool of available datasets
  const allDatasets = useMemo(() => {
    return scrapedDatasets;
  }, [scrapedDatasets]);

  // Active dataset (null if not yet selected)
  const activeDataset = selectedCreatorId ? allDatasets[selectedCreatorId] || null : null;

  // Real-time evaluation calculation (runs in < 1ms client-side when profile is selected)
  const evaluationResult = useMemo(() => {
    if (!activeDataset) return null;
    return runEvaluation(activeDataset.profile, activeDataset.posts, config);
  }, [activeDataset, config]);

  // Scrape handler calling backend /api/scrape endpoint
  const handleScrapeUsername = async (
    rawHandle: string,
    forceRefresh: boolean = false,
    retryCount: number = 0
  ) => {
    const cleanUser = rawHandle.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUser) return;

    setIsScraping(true);
    setScrapingError(null);
    setScrapingStatus(
      retryCount > 0
        ? `Polling completed snapshot from Bright Data dashboard for @${cleanUser}... (attempt ${retryCount + 1})`
        : forceRefresh
        ? `Force scraping live data from Bright Data API for @${cleanUser}...`
        : `Checking Bright Data dashboard for existing snapshot for @${cleanUser}...`
    );

    try {
      const url = `/api/scrape?username=${encodeURIComponent(cleanUser)}${forceRefresh && retryCount === 0 ? "&force_refresh=true" : ""}`;
      const response = await fetch(url, {
        method: "GET",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Scrape failed with status ${response.status}`);
      }

      // If Bright Data snapshot is still being collected, auto-retry seamlessly before timeout
      if (data.status === "processing" && retryCount < 5) {
        setScrapingStatus(
          data.message ||
            `Scrape in progress on Bright Data (snapshot ${data.snapshot_id || ""}). Polling completed snapshot in 5s...`
        );
        setTimeout(() => {
          handleScrapeUsername(cleanUser, false, retryCount + 1);
        }, 5000);
        return;
      }

      if (!data.profile) {
        throw new Error(data.message || `No profile data returned for @${cleanUser}`);
      }

      // Store in scraped datasets
      const newDataset: CreatorDataset = {
        profile: data.profile,
        posts: data.posts || [],
      };

      setScrapedDatasets((prev) => ({
        ...prev,
        [cleanUser]: newDataset,
      }));

      // Select this creator immediately
      setSelectedCreatorId(cleanUser);
      setShowSearchModal(false);
      setScrapingStatus(data.cache_message || "Evaluation ready!");
      setIsScraping(false);
    } catch (err: any) {
      console.error("Scraping error:", err);
      setScrapingError(err.message || "Failed to retrieve profile. Please check the username or network.");
      setIsScraping(false);
    }
  };

  // Creator selection handler: loads immediately if in memory, or triggers /api/scrape
  const handleSelectCreator = (username: string) => {
    const clean = username.trim().toLowerCase().replace(/^@/, "");
    if (!clean) {
      setSelectedCreatorId("");
      return;
    }
    if (scrapedDatasets[clean]) {
      setSelectedCreatorId(clean);
      setShowSearchModal(false);
    } else {
      handleScrapeUsername(clean, false);
    }
  };

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
        onSelectCreator={handleSelectCreator}
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
        <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-6 max-h-[calc(100vh-4rem)] pb-24 lg:pb-6">
          {!activeDataset || !evaluationResult ? (
            /* Empty State: Live Username Scraper */
            <div className="space-y-6 max-w-4xl mx-auto py-2">
              <UsernameSearchHero
                onScrapeUsername={handleScrapeUsername}
                isLoading={isScraping}
                statusMessage={scrapingStatus}
                errorMessage={scrapingError}
              />

              <EmptyProfileState onSelectCreator={handleSelectCreator} />
            </div>
          ) : (
            /* Active Creator Evaluation Workspace */
            <div className="space-y-6">
              {/* Quick Bar to Scrape Another Handle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card/60">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground font-medium">Currently viewing:</span>
                  <span className="font-bold text-foreground font-mono">@{activeDataset.profile.username}</span>
                  {activeDataset.profile.archetypeTag && (
                    <span className="text-muted-foreground text-[10px]">({activeDataset.profile.archetypeTag})</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearchModal(!showSearchModal)}
                    className="text-xs space-x-1.5 h-8"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Evaluate Another Username</span>
                  </Button>
                </div>
              </div>

              {/* Collapsible Scraper Bar if toggled */}
              {showSearchModal && (
                <UsernameSearchHero
                  onScrapeUsername={handleScrapeUsername}
                  isLoading={isScraping}
                  statusMessage={scrapingStatus}
                  errorMessage={scrapingError}
                />
              )}

              {/* Evaluation Tabs */}
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
            </div>
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
