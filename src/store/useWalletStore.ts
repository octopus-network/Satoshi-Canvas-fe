import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";

export interface WalletState {
  isConnected: boolean;
  address: string | null; // Bitcoin address for runes
  paymentAddress: string | null; // Payment address for BTC
  provider: string | null; // 钱包提供商名称
  chainId: number | null;
}

export interface WalletActions {
  connect: (params: {
    address: string;
    paymentAddress: string;
    provider: string;
    chainId?: number;
  }) => void;
  disconnect: () => void;
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
        provider: null,
        chainId: null,

        // Actions
        connect: ({
          address,
          paymentAddress,
          provider,
          chainId = 1,
        }) => {
          set({
            isConnected: true,
            address,
            paymentAddress,
            provider,
            chainId,
          }, false, "wallet/connect");
        },

        disconnect: () => {
          set({
            isConnected: false,
            address: null,
            paymentAddress: null,
            provider: null,
            chainId: null,
          }, false, "wallet/disconnect");
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
          chainId: state.chainId,
        }),
      }
    ),
    {
      name: "wallet-store", // DevTools 中的显示名称
    }
  )
);
