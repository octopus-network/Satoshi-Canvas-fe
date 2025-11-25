import { useCallback, useEffect } from "react";
import {
  useLaserEyes,
  XVERSE,
  ProviderType,
} from "@omnisat/lasereyes";
import { useRee } from "@omnity/ree-client-ts-sdk/react";
import { useWalletStore } from "@/store/useWalletStore";
import { WALLETS } from "@/constants/wallets";
import { toast } from "sonner";

export const useWalletConnection = () => {
  const {
    connect: laserConnect,
    disconnect: laserDisconnect,
    isConnecting,
    address,
    paymentAddress,
    hasXverse,
  } = useLaserEyes();
  
  const { updateWallet } = useRee();
  const { connect, disconnect, isConnected } = useWalletStore();

  // 同步地址到 Ree SDK
  useEffect(() => {
    if (address && paymentAddress) {
      updateWallet({
        address,
        paymentAddress,
      });
    }
  }, [address, paymentAddress, updateWallet]);

  // 连接钱包
  const connectWallet = useCallback(async (walletType: string) => {
    try {
      if (walletType === "xverse") {
        if (!hasXverse) {
          // 如果没有安装钱包，打开下载页面
          window.open(WALLETS.xverse.url, "_blank");
          return { success: false, error: "钱包未安装" };
        }

        // 连接钱包
        await laserConnect(XVERSE as ProviderType);
        
        return { success: true };
      }
      
      return { success: false, error: "不支持的钱包类型" };
    } catch (error) {
      console.error("连接钱包失败:", error);
      // toast.error("连接失败", {
      //   description: "请先在 Xverse 中解锁并选择 Bitcoin 账户。",
      // });
      toast.error("Connection failed", {
        description: "Please unlock Xverse and select a Bitcoin account.",
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "连接失败" 
      };
    }
  }, [laserConnect, hasXverse]);

  // 断开钱包连接
  const disconnectWallet = useCallback(async () => {
    try {
      await laserDisconnect();
      disconnect();
      return { success: true };
    } catch (error) {
      console.error("断开钱包连接失败:", error);
      toast.error("断开钱包连接失败，请稍后重试");
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "断开连接失败" 
      };
    }
  }, [laserDisconnect, disconnect]);

  // 当 LaserEyes 连接状态改变时，同步到本地状态
  useEffect(() => {
    if (address && paymentAddress && !isConnected) {
      connect({
        address,
        paymentAddress,
        provider: "xverse",
      });
    } else if (!address && !paymentAddress && isConnected) {
      disconnect();
    }
  }, [address, paymentAddress, isConnected, connect, disconnect]);

  return {
    connectWallet,
    disconnectWallet,
    isConnecting,
    isConnected,
    address,
    paymentAddress,
    hasXverse,
  };
};
