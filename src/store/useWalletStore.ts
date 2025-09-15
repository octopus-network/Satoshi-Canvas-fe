import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

export interface WalletState {
  isConnected: boolean;
  address: string | null; // Bitcoin address for runes
  paymentAddress: string | null; // Payment address for BTC
  balance: number | null;
  provider: string | null; // 钱包提供商名称
  chainId: number | null;
}

export interface WalletActions {
  connect: (params: {
    address: string;
    paymentAddress: string;
    provider: string;
    balance?: number;
    chainId?: number;
  }) => void;
  disconnect: () => void;
  updateBalance: (balance: number) => void;
  updateAddresses: (address: string, paymentAddress: string) => void;
}

export type WalletStore = WalletState & WalletActions;

export const useWalletStore = create<WalletStore>()(
  devtools(
    persist(
      (set) => ({
        // State
        isConnected: false,
        address: null,
        paymentAddress: null,
        balance: null,
        provider: null,
        chainId: null,

        // Actions
        connect: ({
          address,
          paymentAddress,
          provider,
          balance = 0,
          chainId = 1,
        }) => {
          set({
            isConnected: true,
            address,
            paymentAddress,
            provider,
            balance,
            chainId,
          }, false, "wallet/connect");
        },

        disconnect: () => {
          set({
            isConnected: false,
            address: null,
            paymentAddress: null,
            provider: null,
            balance: null,
            chainId: null,
          }, false, "wallet/disconnect");
        },

        updateBalance: (balance: number) => {
          set({ balance }, false, "wallet/updateBalance");
        },

        updateAddresses: (address: string, paymentAddress: string) => {
          set({ address, paymentAddress }, false, "wallet/updateAddresses");
        },
      }),
      {
        name: "wallet-storage", // localStorage key
        partialize: (state) => ({
          isConnected: state.isConnected,
          address: state.address,
          paymentAddress: state.paymentAddress,
          provider: state.provider,
          balance: state.balance,
          chainId: state.chainId,
        }),
      }
    ),
    {
      name: "wallet-store", // DevTools 中的显示名称
    }
  )
);
