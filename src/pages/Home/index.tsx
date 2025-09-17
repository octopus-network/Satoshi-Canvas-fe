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
import { RefreshCw, AlertCircle } from "lucide-react";

function HomePage() {
  const { theme: themeConfig } = useThemeStore();
  const { isConnected } = useWalletStore();
  const [gridSize] = useState<100 | 1000>(100); // 约定暂时只支持 100*100 大小的画布

  // 使用画布数据 Hook
  const { canvasState, refreshData, isPolling } = useCanvasData({
    enablePolling: true,
    pollingInterval: 8000, // 8秒轮询
    fetchOnMount: true,
  });

  // 使用排行榜数据 Hook
  const { 
    participants, 
    dataState: rankingDataState, 
    refreshData: refreshRankingData,
    isPolling: isRankingPolling 
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
        
        {/* 数据状态显示和刷新按钮 */}
        <div className="shrink-0 p-3 border-b bg-background/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">数据状态</span>
            <button
              onClick={handleRefresh}
              disabled={dataState.isLoading || rankingDataState.isLoading}
              className="p-1 rounded hover:bg-background/50 transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw className={`w-3 h-3 ${(dataState.isLoading || rankingDataState.isLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {(dataState.error || rankingDataState.error) ? (
            <div className="space-y-1">
              {dataState.error && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  <span>画布数据失败</span>
                </div>
              )}
              {rankingDataState.error && (
                <div className="flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="w-3 h-3" />
                  <span>排行榜数据失败</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span>画布: {isPolling ? '实时更新' : '已停止'}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isRankingPolling ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span>排行榜: {isRankingPolling ? '实时更新' : '已停止'}</span>
              </div>
              {(dataState.lastUpdated || rankingDataState.lastUpdated) && (
                <div className="mt-1">
                  {dataState.lastUpdated && (
                    <div>画布: {dataState.lastUpdated.toLocaleTimeString()}</div>
                  )}
                  {rankingDataState.lastUpdated && (
                    <div>排行榜: {rankingDataState.lastUpdated.toLocaleTimeString()}</div>
                  )}
                </div>
              )}
            </div>
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
