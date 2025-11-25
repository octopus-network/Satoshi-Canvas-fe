import { Toaster } from "sonner";
import { useThemeStore } from "@/store/useThemeStore";
import PixelCanvas from "@/components/PixelCanvas";
import ParticipantsList from "@/components/ParticipantsList";
import WalletInfo from "@/components/ui/wallet-info";
import WalletDebugger from "@/components/WalletDebugger";
import ErrorBoundary from "@/components/ui/error-boundary";
import { useCanvasData } from "@/hooks/useCanvasData";
import { useRankingData } from "@/hooks/useRankingData";
import { useCanvasDims } from "@/hooks/useCanvasDims";

function HomePage() {
  const { theme: themeConfig } = useThemeStore();
  
  // 从后端动态获取画布尺寸
  const { width, height } = useCanvasDims(true);
  
  // gridSize 使用 width（因为坐标校验和索引计算都基于 width）
  const gridSize = width;

  // Use canvas data Hook
  const { canvasState, refreshData, startPurchasePolling } = useCanvasData({
    enablePolling: true,
    pollingInterval: 8000, // 8 second polling
    fetchOnMount: true,
  });

  // Use ranking data Hook
  const { 
    participants, 
    dataState: rankingDataState, 
    refreshData: refreshRankingData
  } = useRankingData({
    enablePolling: true,
    pollingInterval: 8000, // 8 second polling
    fetchOnMount: true,
  });

  const { canvasInfo, initialPixelData, dataState } = canvasState;

  // Manually refresh data
  const handleRefresh = () => {
    refreshData();
    refreshRankingData();
  };

  // Handle post-draw success
  const handlePurchaseSuccess = async () => {
    // console.log("🛒 Start post-purchase data refresh process");
    // Save current data for comparison
    const originalData = [...initialPixelData];
    
    // Start polling until data changes
    await startPurchasePolling(originalData);
    
    // Also refresh ranking data
    refreshRankingData();
    
    // console.log("🎉 Post-purchase data refresh process complete");
  };

  // Handle purchase refresh completion
  const handlePurchaseRefreshComplete = () => {
    // console.log("🎉 Purchase refresh completion callback triggered");
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen bg-background text-foreground flex relative">
        {/* Pixel style background pattern overlay */}
        <div className="absolute inset-0 pixel-bg pointer-events-none" />
      {/* Left Sidebar (Participants Leaderboard) */}
      <aside className="hidden md:flex w-56 lg:w-64 h-full min-h-0 flex-col border-r-2 border-border bg-sidebar text-sidebar-foreground relative z-10">
        <div className="shrink-0 p-2 lg:p-3 border-b-2 border-border">
          <WalletInfo className="w-full" />
        </div>
        
        
        <ParticipantsList participants={participants} />
      </aside>

      {/* Right main view: Top toolbar + Bottom canvas fill */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative z-10">
        <div className="flex-1 min-h-0 flex flex-col">
          <PixelCanvas
            gridSize={gridSize}
            canvasHeight={height}
            pixelSize={gridSize <= 200 ? 6 : 2}
            initialData={initialPixelData}
            canvasInfo={canvasInfo}
            isRefreshing={dataState.isLoading || rankingDataState.isLoading}
            lastRefreshTime={dataState.lastUpdated || rankingDataState.lastUpdated || undefined}
            onRefresh={handleRefresh}
            onPurchaseSuccess={handlePurchaseSuccess}
            onPurchaseRefreshComplete={handlePurchaseRefreshComplete}
          />
        </div>
      </main>

      <Toaster
        position="top-right"
        theme={themeConfig.mode === "dark" ? "dark" : "light"}
        toastOptions={{
          className: "custom-toast",
        }}
      />
      
      {/* Wallet state debugger - only show in development environment */}
      <WalletDebugger position="bottom-right" minimizable={true} />
      </div>
    </ErrorBoundary>
  );
}

export default HomePage;
