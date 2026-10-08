import React, { useState, useMemo, useEffect } from "react";
import { DEFAULT_CONFIG, PRESET_CONFIGS } from "@/lib/defaults";
import { CREATOR_DATASETS, CreatorDataset } from "@/data/mockProfiles";
import { runEvaluation } from "@/lib/evaluator";
import { ReachConfig } from "@/types/evaluator";
import { Header } from "@/components/Header";
import { ParametersSidebar } from "@/components/ParametersSidebar";
import { ScorecardOverview } from "@/components/ScorecardOverview";
import { GlassBoxInspector } from "@/components/GlassBoxInspector";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { PostDataTable } from "@/components/PostDataTable";
import { ExportModal } from "@/components/ExportModal";
import { ApiKeyModal } from "@/components/ApiKeyModal";
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
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Search / Scraper state
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingStatus, setScrapingStatus] = useState("");
  const [scrapingError, setScrapingError] = useState<string | null>(null);

  // Stored API key (from localStorage)
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("brightdata_api_key") || "";
  });

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem("brightdata_api_key", key);
    } else {
      localStorage.removeItem("brightdata_api_key");
    }
  };

  // Dynamic live-scraped datasets storage
  const [scrapedDatasets, setScrapedDatasets] = useState<Record<string, CreatorDataset>>({});

  // Sync dark mode class on root html
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Combined pool of available datasets (archetypes + live scraped)
  const allDatasets = useMemo(() => {
    return {
      ...CREATOR_DATASETS,
      ...scrapedDatasets,
    };
  }, [scrapedDatasets]);

  // Active dataset (null if not yet selected)
  const activeDataset = selectedCreatorId ? allDatasets[selectedCreatorId] || null : null;

  // Real-time evaluation calculation (runs in < 1ms client-side when profile is selected)
  const evaluationResult = useMemo(() => {
    if (!activeDataset) return null;
    return runEvaluation(activeDataset.profile, activeDataset.posts, config);
  }, [activeDataset, config]);

  // Scrape handler calling Vercel /api/scrape serverless endpoint
  const handleScrapeUsername = async (rawHandle: string) => {
    const cleanUser = rawHandle.trim().toLowerCase().replace(/^@/, "");
    if (!cleanUser) return;

    setIsScraping(true);
    setScrapingError(null);
    setScrapingStatus(`Contacting Bright Data Instagram scraper for @${cleanUser}...`);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["x-brightdata-key"] = apiKey;
      }

      setScrapingStatus(`Querying Bright Data scraper (gd_l1vikfch901nx3by4) & platform cache...`);

      const response = await fetch(`/api/scrape?username=${encodeURIComponent(cleanUser)}`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresApiKey) {
          setApiKeyModalOpen(true);
        }
        throw new Error(data.error || `Scrape failed with status ${response.status}`);
      }

      if (!data.profile) {
        throw new Error(`No profile data returned for @${cleanUser}`);
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
      setScrapingStatus("Evaluation ready!");
    } catch (err: any) {
      console.error("Scraping error:", err);
      setScrapingError(err.message || "Failed to scrape profile. Please check the username or API key.");
    } finally {
      setIsScraping(false);
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
        onSelectCreator={setSelectedCreatorId}
        activeCreator={activeDataset ? activeDataset.profile : null}
        onResetDefaults={handleResetDefaults}
        onApplyPreset={handleApplyPreset}
        onOpenExport={() => setExportModalOpen(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        onToggleMobileParams={() => setMobileParamsOpen(!mobileParamsOpen)}
        mobileParamsOpen={mobileParamsOpen}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
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
            /* Empty State: Live Username Scraper + Archetypes Selection */
            <div className="space-y-6 max-w-4xl mx-auto py-2">
              <UsernameSearchHero
                onScrapeUsername={handleScrapeUsername}
                onSelectArchetype={setSelectedCreatorId}
                isLoading={isScraping}
                statusMessage={scrapingStatus}
                errorMessage={scrapingError}
                onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
                hasApiKey={Boolean(apiKey)}
              />

              <EmptyProfileState onSelectCreator={setSelectedCreatorId} />
            </div>
          ) : (
            /* Active Creator Evaluation Workspace */
            <div className="space-y-6">
              {/* Quick Search Bar to Scrape Another Handle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card/60">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground font-medium">Currently viewing:</span>
                  <span className="font-bold text-foreground font-mono">@{activeDataset.profile.username}</span>
                  <span className="text-muted-foreground text-[10px]">({activeDataset.profile.archetypeTag})</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSearchModal(!showSearchModal)}
                    className="text-xs space-x-1.5 h-8"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Scrape Another Username</span>
                  </Button>
                </div>
              </div>

              {/* Collapsible Scraper Bar if toggled */}
              {showSearchModal && (
                <UsernameSearchHero
                  onScrapeUsername={handleScrapeUsername}
                  onSelectArchetype={setSelectedCreatorId}
                  isLoading={isScraping}
                  statusMessage={scrapingStatus}
                  errorMessage={scrapingError}
                  onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
                  hasApiKey={Boolean(apiKey)}
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

      {/* Bright Data API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}

export default App;
