import xverseIcon from "@/assets/images/logos/xverse.png";

export interface WalletInfo {
  name: string;
  icon: string;
  url: string;
  id: string;
}

export const XVERSE_WALLET: WalletInfo = {
  name: "Xverse",
  icon: xverseIcon,
  url: "https://www.xverse.app",
  id: "xverse",
};

export const WALLETS: Record<string, WalletInfo> = {
  xverse: XVERSE_WALLET,
};
