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
  const [gridSize] = useState<100 | 1000>(100); // 约定暂时只支持 100*100 大小的画布

  // 使用画布数据 Hook
  const { canvasState, refreshData, startPurchasePolling } = useCanvasData({
    enablePolling: true,
    pollingInterval: 8000, // 8秒轮询
    fetchOnMount: true,
  });

  // 使用排行榜数据 Hook
  const { 
    participants, 
    dataState: rankingDataState, 
    refreshData: refreshRankingData
  } = useRankingData({
    enablePolling: true,
    pollingInterval: 8000, // 8秒轮询
    fetchOnMount: true,
  });

  const { canvasInfo, initialPixelData, dataState } = canvasState;

  // 手动刷新数据
  const handleRefresh = () => {
    refreshData();
    refreshRankingData();
  };

  // 购买成功后的处理
  const handlePurchaseSuccess = async () => {
    console.log("🛒 开始购买后数据刷新流程");
    // 保存当前数据用于比较
    const originalData = [...initialPixelData];
    
    // 开始轮询直到数据变化
    await startPurchasePolling(originalData);
    
    // 同时刷新排行榜数据
    refreshRankingData();
    
    console.log("🎉 购买后数据刷新流程完成");
  };

  // 购买刷新完成处理
  const handlePurchaseRefreshComplete = () => {
    console.log("🎉 购买刷新完成回调被触发");
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
      
      {/* 钱包状态调试器 - 只在开发环境显示 */}
      <WalletDebugger position="bottom-right" minimizable={true} />
      </div>
    </ErrorBoundary>
  );
}

export default HomePage;
