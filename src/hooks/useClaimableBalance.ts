import { useState, useEffect, useCallback } from "react";
import { canvasService } from "@/services/canvas.service";
import { useWalletStore } from "@/store/useWalletStore";

interface ClaimableBalanceState {
  address: string | null;
  claimableSats: number;
  claimableBTC: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UseClaimableBalanceReturn extends ClaimableBalanceState {
  refreshBalance: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing claimable balance
 */
export const useClaimableBalance = (): UseClaimableBalanceReturn => {
  const { isConnected, paymentAddress } = useWalletStore();
  const [state, setState] = useState<ClaimableBalanceState>({
    address: null,
    claimableSats: 0,
    claimableBTC: 0,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });

  const fetchClaimableBalance = useCallback(async (address: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const balanceData = await canvasService.getClaimableBalance(address);
      setState(prev => ({
        ...prev,
        address: balanceData.address,
        claimableSats: balanceData.claimableSats,
        claimableBTC: balanceData.claimableBTC,
        isLoading: false,
        lastUpdated: new Date(),
      }));
    } catch (error) {
      console.error("Failed to fetch claimable balance:", error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch claimable balance",
      }));
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (isConnected && paymentAddress) {
      await fetchClaimableBalance(paymentAddress);
    }
  }, [isConnected, paymentAddress, fetchClaimableBalance]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 当钱包连接状态或 paymentAddress 变化时，自动获取余额
  useEffect(() => {
    if (isConnected && paymentAddress) {
      fetchClaimableBalance(paymentAddress);
    } else {
      // 清空状态当钱包未连接或没有地址时
      setState({
        address: null,
        claimableSats: 0,
        claimableBTC: 0,
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    }
  }, [isConnected, paymentAddress, fetchClaimableBalance]);

  // Periodically refresh balance (every 30 seconds) - only when wallet is connected
  useEffect(() => {
    if (!isConnected || !paymentAddress) return;

    const interval = setInterval(() => {
      fetchClaimableBalance(paymentAddress);
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected, paymentAddress, fetchClaimableBalance]);

  return {
    ...state,
    refreshBalance,
    clearError,
  };
};
