import React from "react";
import { Copy, LogOut, Wallet, Coins, RefreshCw, Download } from "lucide-react";
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
import ConnectWalletButton from "@/components/ui/connect-wallet-button";
import { toast } from "sonner";

interface WalletInfoProps {
  className?: string;
}

const WalletInfo: React.FC<WalletInfoProps> = ({ className = "" }) => {
  const { address, paymentAddress, isConnected } = useWalletStore();
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
      console.log("Claim successful, transaction ID:", txid);
      // Refresh balance immediately
      await refreshBalance();
      // Refresh again after 3 seconds to ensure on-chain state is updated
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
    toast.success(`${type} address copied to clipboard`);
  };

  const handleDisconnect = async () => {
    const result = await disconnectWallet();
    if (result.success) {
      toast.success("Wallet disconnected");
    } else {
      toast.error(result.error || "Failed to disconnect");
    }
  };

  const handleRefreshClaimable = async () => {
    if (claimableError) {
      clearError();
    }
    await refreshBalance();
    // toast.success("Claimable balance refreshed");
  };

  const handleClaim = async () => {
    if (claimableSats > 0) {
      await executeClaim(claimableSats);
    }
  };

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

        {/* Connect wallet if not connected */}
        {!isConnected && (
          <ConnectWalletButton className="w-full text-xs" variant="default" size="sm">
            Connect Wallet
          </ConnectWalletButton>
        )}

        {/* Wallet info - only show when connected */}
        {isConnected && address && (
          <div className="space-y-3">

          {/* Bitcoin Address (for runes) */}
          {/* <div className="space-y-1">
          <span className="text-xs text-muted-foreground">
            Bitcoin Address (runes)
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

          {/* Wallet Details */}
          {paymentAddress && (
            <div className="space-y-3">
              {/* BTC Address */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wallet className="size-3" />
                  <span>Wallet Address</span>
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
                    onClick={() => copyAddress(paymentAddress, "Wallet")}
                    className="h-4 w-4 p-0 hover:bg-background cursor-pointer"
                  >
                    <Copy className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Claimable Balance */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="size-3" />
                  <span>Claimable Balance</span>
                </div>

                <div className="relative bg-muted/50 rounded-md p-2">
                  {/* Loading overlay with fade animation */}
                  <FadeTransition
                    show={isClaimableLoading}
                    className="absolute inset-0 bg-background/80 backdrop-blur-[1px] rounded-md flex items-center justify-center"
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="size-3 animate-spin" />
                      <span>Loading...</span>
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
                                ? "Failed to fetch"
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
                  ? "Processing..." 
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
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default WalletInfo;
