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
    onSuccess: async () => {
      // console.log("Claim successful, transaction ID:", txid);
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
        className={`bg-background border-2 border-border pixel-shadow p-4 space-y-3 ${className}`}
        style={{ borderRadius: "var(--radius)" }}
      >
        {/* Project title */}
        <div className="flex items-center gap-2 pb-2 border-b-2 border-border">
          <div className="w-8 h-8 bg-primary border-2 border-primary pixel-shadow-sm flex items-center justify-center" style={{ borderRadius: "var(--radius-sm)" }}>
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              className="w-5 h-5 text-primary-foreground"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.05-1.243 15.533.362 9.105 1.963 2.67 8.475-1.243 14.9.358c6.43 1.605 10.342 8.113 8.738 14.546z" 
                fill="#F7931A"
              />
              <path 
                d="M17.464 10.427c.26-1.737-1.06-2.673-2.864-3.297l.585-2.345-1.43-.356-.57 2.286c-.376-.094-.763-.182-1.147-.27l.575-2.305-1.43-.356-.585 2.345c-.312-.071-.618-.138-.915-.204l.002-.007-1.97-.492-.38 1.526s1.06.243 1.038.258c.58.145.685.53.667.835l-.67 2.687c.04.01.092.024.15.047l-.154-.038-.953 3.823c-.072.18-.254.45-.666.348.015.021-1.04-.259-1.04-.259l-.71 1.644 1.863.464c.346.086.685.177 1.017.26l-.59 2.37 1.428.356.585-2.345c.389.105.765.202 1.128.29l-.583 2.338 1.43.356.59-2.366c2.447.463 4.287.276 5.062-1.94.632-1.81-.031-2.854-1.335-3.536.95-.219 1.664-.843 1.855-2.135zm-3.01 4.22c-.448 1.798-3.484.826-4.467.582l.797-3.194c.983.245 4.13.733 3.67 2.612zm.448-4.252c-.409 1.64-2.94.807-3.76.603l.722-2.896c.82.204 3.473.584 3.038 2.293z" 
                fill="#FFF"
              />
            </svg>
          </div>
          <h2 className="font-bold text-sm sm:text-lg text-foreground pixel-font-sm">Satoshi Canvas</h2>
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
                  <Wallet className="size-3 pixel-icon" />
                  <span>Wallet Address</span>
                </div>
                <div className="flex items-center justify-between bg-muted/50 border-2 border-border pixel-shadow-sm p-2" style={{ borderRadius: "var(--radius-sm)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 border border-green-600 pixel-blink" style={{ borderRadius: "var(--radius-sm)" }} />
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
                    <Copy className="size-3 pixel-icon" />
                  </Button>
                </div>
              </div>

              {/* Claimable Balance */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Coins className="size-3 pixel-icon" />
                  <span>Claimable Balance</span>
                </div>

                <div className="relative bg-muted/50 border-2 border-border pixel-shadow-sm p-2" style={{ borderRadius: "var(--radius-sm)" }}>
                  {/* Loading overlay with fade animation */}
                  <FadeTransition
                    show={isClaimableLoading}
                    className="absolute inset-0 bg-background/80 flex items-center justify-center"
                    style={{ borderRadius: "var(--radius-sm)" }}
                  >
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="size-3 animate-spin pixel-icon" />
                      <span>Loading...</span>
                    </div>
                  </FadeTransition>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-2 h-2 bg-yellow-500 border border-yellow-600 pixel-blink" style={{ borderRadius: "var(--radius-sm)" }} />
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
                className="w-full text-xs gap-1 bg-green-600 hover:bg-green-700 border-green-700 cursor-pointer"
              >
                <Download className={`size-3 mr-0.5 pixel-icon ${isClaimLoading ? "animate-pulse" : ""}`} />
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
              <LogOut className="size-3 mr-0.5 pixel-icon" />
              Disconnect
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default WalletInfo;
