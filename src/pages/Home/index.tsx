import { useState } from "react";
import { Toaster } from "sonner";
import { useThemeStore } from "@/store/useThemeStore";
import { useWalletStore } from "@/store/useWalletStore";
import PixelCanvas from "@/components/PixelCanvas";
import ParticipantsList from "@/components/ParticipantsList";
import ConnectWalletButton from "@/components/ui/connect-wallet-button";
import WalletInfo from "@/components/ui/wallet-info";
import WalletDebugger from "@/components/WalletDebugger";
import ErrorBoundary from "@/components/ui/error-boundary";
import { useCanvasData } from "@/hooks/useCanvasData";
import { useRankingData } from "@/hooks/useRankingData";

function HomePage() {
  const { theme: themeConfig } = useThemeStore();
  const { isConnected } = useWalletStore();
  const [gridSize] = useState<100 | 1000>(100); // Convention: temporarily only support 100*100 size canvas

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

  // Handle post-purchase success
  const handlePurchaseSuccess = async () => {
    console.log("🛒 Start post-purchase data refresh process");
    // Save current data for comparison
    const originalData = [...initialPixelData];
    
    // Start polling until data changes
    await startPurchasePolling(originalData);
    
    // Also refresh ranking data
    refreshRankingData();
    
    console.log("🎉 Post-purchase data refresh process complete");
  };

  // Handle purchase refresh completion
  const handlePurchaseRefreshComplete = () => {
    console.log("🎉 Purchase refresh completion callback triggered");
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen bg-background text-foreground flex">
      {/* Left Sidebar (Participants Leaderboard) */}
      <aside className="hidden md:flex w-64 h-full min-h-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="shrink-0 p-3 border-b">
          {isConnected ? (
            <WalletInfo className="w-full" />
          ) : (
            <ConnectWalletButton className="text-xs w-full" />
          )}
        </div>
        
        
        <ParticipantsList participants={participants} />
      </aside>

      {/* Right main view: Top toolbar + Bottom canvas fill */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          <PixelCanvas
            gridSize={gridSize}
            pixelSize={gridSize === 100 ? 6 : 2}
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
