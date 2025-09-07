import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number | null;
  chainId: number | null;
}

export interface WalletActions {
  connect: (address: string, balance?: number, chainId?: number) => void;
  disconnect: () => void;
  updateBalance: (balance: number) => void;
}

export type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()(
  persist(
    (set, get) => ({
      // State
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,

      // Actions
      connect: (address: string, balance = 0, chainId = 1) => {
        set({
          isConnected: true,
          address,
          balance,
          chainId,
        });
      },

      disconnect: () => {
        set({
          isConnected: false,
          address: null,
          balance: null,
          chainId: null,
        });
      },

      updateBalance: (balance: number) => {
        set({ balance });
      },
    }),
    {
      name: 'wallet-storage', // localStorage key
      partialize: (state) => ({
        isConnected: state.isConnected,
        address: state.address,
        balance: state.balance,
        chainId: state.chainId,
      }),
    }
  )
);
