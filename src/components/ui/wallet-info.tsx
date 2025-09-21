import React from "react";
import { Copy, LogOut, Wallet, Coins, RefreshCw, Bitcoin, Download } from "lucide-react";
import { useWalletStore } from "@/store/useWalletStore";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useClaimableBalance } from "@/hooks/useClaimableBalance";
import { usePixelClaim } from "@/hooks/usePixelClaim";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FadeTransition } from "@/components/ui/fade-transition";
import { toast } from "sonner";

interface WalletInfoProps {
  className?: string;
}

const WalletInfo: React.FC<WalletInfoProps> = ({ className = "" }) => {
  const { address, paymentAddress, provider } = useWalletStore();
  const { disconnectWallet } = useWalletConnection();
  const {
    claimableSats,
    isLoading: isClaimableLoading,
    error: claimableError,
    refreshBalance,
    clearError,
  } = useClaimableBalance();
  
  const {
    isClaimLoading,
    canClaim,
    executeClaim,
  } = usePixelClaim({
    onSuccess: async (txid) => {
      console.log("Claim成功，交易ID:", txid);
      // 立即刷新余额
      await refreshBalance();
      // 延迟3秒再次刷新，确保链上状态已更新
      setTimeout(() => {
        refreshBalance();
      }, 3000);
    },
  });

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = (addr: string, type: string) => {
    navigator.clipboard.writeText(addr);
    toast.success(`${type}地址已复制到剪贴板`);
  };

  const handleDisconnect = async () => {
    const result = await disconnectWallet();
    if (result.success) {
      toast.success("钱包已断开连接");
    } else {
      toast.error(result.error || "断开连接失败");
    }
  };

  const handleRefreshClaimable = async () => {
    if (claimableError) {
      clearError();
    }
    await refreshBalance();
    // toast.success("可领取余额已刷新");
  };

  const handleClaim = async () => {
    if (claimableSats > 0) {
      await executeClaim(claimableSats);
    }
  };

  if (!address) return null;

  return (
    <TooltipProvider>
      <div
        className={`bg-background border rounded-lg p-4 space-y-3 ${className}`}
      >
        {/* Project title */}
        <div className="flex items-center gap-2 pb-2 border-b">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <h2 className="font-bold text-lg text-foreground">Pixel Land</h2>
        </div>

        {/* Wallet info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="w-4 h-4" />
            <span>钱包已连接</span>
            {provider && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                {provider}
              </span>
            )}
          </div>

          {/* Bitcoin Address (for runes) */}
          {/* <div className="space-y-1">
          <span className="text-xs text-muted-foreground">
            Bitcoin 地址 (符文)
          </span>
          <div className="flex items-center justify-between bg-muted/50 rounded-md p-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-mono text-sm font-medium">
                {shortenAddress(address)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyAddress(address, "Bitcoin")}
              className="h-6 w-6 p-0 hover:bg-background cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </div> */}

          {/* 钱包详情 */}
          {paymentAddress && (
            <div className="space-y-3">
              {/* BTC 地址 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Bitcoin className="size-3" />
                  <span>钱包地址</span>
                </div>
                <div className="flex items-center justify-between bg-muted/50 rounded-md p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="font-mono text-sm font-medium">
                      {shortenAddress(paymentAddress)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(paymentAddress, "钱包")}
                    className="h-4 w-4 p-0 hover:bg-background cursor-pointer"
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              {/* 可领取余额 */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="size-3" />
                  <span>Claimable Balance</span>
                </div>

                <div className="relative bg-muted/50 rounded-md p-2">
                  {/* 加载遮罩层 - 带淡入淡出动画 */}
                  <FadeTransition
                    show={isClaimableLoading}
                    className="absolute inset-0 bg-background/80 backdrop-blur-[1px] rounded-md flex items-center justify-center"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="size-3 animate-spin" />
                      <span>加载中...</span>
                    </div>
                  </FadeTransition>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                      <div className="flex items-center gap-1 min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-mono text-sm font-medium truncate max-w-[116px]">
                              {claimableError
                                ? "-"
                                : (claimableSats / 100000000).toFixed(8)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              {claimableError
                                ? "获取失败"
                                : `${(claimableSats / 100000000).toFixed(8)} BTC`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="font-mono text-sm font-medium text-muted-foreground">
                          BTC
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRefreshClaimable}
                      disabled={isClaimableLoading}
                      className="h-4 w-4 p-0 hover:bg-background cursor-pointer"
                    >
                      <RefreshCw
                        className={`size-3 ${isClaimableLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Claim button */}
        {claimableSats > 0 && (
          <Button
            variant="default"
            size="sm"
            onClick={handleClaim}
            disabled={isClaimLoading || !canClaim || claimableError !== null}
            className="w-full text-xs gap-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 cursor-pointer"
          >
            <Download className={`size-3 mr-0.5 ${isClaimLoading ? "animate-pulse" : ""}`} />
            {isClaimLoading 
              ? "处理中..." 
              : `Claim ${(Number(BigInt(claimableSats)) / 100000000).toFixed(8)} BTC`
            }
          </Button>
        )}

        {/* Disconnect button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="w-full text-xs gap-1 hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
        >
          <LogOut className="size-3 mr-0.5" />
          断开连接
        </Button>
      </div>
    </TooltipProvider>
  );
};

export default WalletInfo;
