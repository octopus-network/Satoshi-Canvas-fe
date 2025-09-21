import { useState, useCallback, useEffect } from "react";
import { useLaserEyes } from "@omnisat/lasereyes";
import { useRee, usePoolList, utils as reeUtils, Network } from "@omnity/ree-client-ts-sdk";
import { toast } from "sonner";
import { PIXEL_CONSTANTS } from "@/constants/pixel";
// import { submitDrawIntents, type PurchaseIntent, type PurchaseIntents } from "@/services/canvas.service"; // 暂时不使用
import { shortenErrorMessage } from "@/utils/string";

export interface UsePixelPurchaseProps {
  userPixels: Map<string, string>;
  paintedPixelInfoList: Array<{ x: number; y: number; price: number }>; // Price in BTC
  onSuccess?: (txid: string) => void;
}

export interface UsePixelPurchaseReturn {
  // 状态
  isPurchaseLoading: boolean;
  isPoolsReady: boolean;
  
  // 池子信息
  availablePools: any[];
  poolsLoading: boolean;
  poolsError: string | null;
  
  // 方法
  executePurchase: () => Promise<void>;
  
  // 计算属性
  pixelCount: number;
  canPurchase: boolean;
}

export const usePixelPurchase = ({ 
  userPixels, 
  paintedPixelInfoList,
  onSuccess 
}: UsePixelPurchaseProps): UsePixelPurchaseReturn => {
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  
  // Wallet 和交易相关 hooks
  const { signPsbt, address, paymentAddress } = useLaserEyes();
  const { createTransaction, client } = useRee();
  const { pools: availablePools, loading: poolsLoading, error: poolsError } = usePoolList();

  // 计算属性
  const pixelCount = userPixels.size;
  const isPoolsReady = !poolsLoading && !poolsError && availablePools && availablePools.length > 0;
  const canPurchase = !!address && !!paymentAddress && pixelCount > 0 && isPoolsReady;

  // Debug: 池子信息日志
  useEffect(() => {
    console.log("🏊 池子状态更新:", { 
      poolsLoading, 
      poolsError, 
      poolCount: availablePools?.length 
    });
    
    if (poolsError) {
      console.log("🏊 池子列表加载失败:", { errorInfo: poolsError });
      toast.error("池子信息加载失败", {
        description: shortenErrorMessage(poolsError, 120) || "请检查网络连接或稍后重试",
        duration: 5000,
      });
    } else if (!poolsLoading && availablePools && availablePools.length > 0) {
      console.log("🏊 获取到的池子列表:", availablePools);
      console.log("🏊 第一个池子详情:", availablePools[0]);
      console.log("🏊 池子数量:", availablePools.length);
      
      // 打印每个池子的地址和名称
      availablePools.forEach((pool: any, index: number) => {
        console.log(`🏊 池子 ${index + 1}:`, {
          name: pool.name,
          address: pool.address,
        });
      });

      // 显示池子信息加载成功的提示（仅显示一次）
      toast.success("池子信息加载成功", {
        description: `发现 ${availablePools.length} 个可用池子`,
        duration: 3000,
      });
    } else if (!poolsLoading && (!availablePools || availablePools.length === 0)) {
      console.log("🏊 没有找到可用的池子");
      toast.error("没有找到可用的池子", {
        description: "请稍后重试或联系管理员",
        duration: 5000,
      });
    } else if (poolsLoading) {
      console.log("🏊 池子列表正在加载中...");
    }
  }, [availablePools, poolsLoading, poolsError]);

  // ! 执行购买交易
  const executePurchase = useCallback(async () => {
    if (!address || !paymentAddress) {
      toast.error("请先连接钱包", {
        description: "需要连接钱包才能购买像素",
      });
      return;
    }

    if (pixelCount === 0) {
      toast.error("没有要购买的像素", {
        description: "请先绘制一些像素",
      });
      return;
    }

    setIsPurchaseLoading(true);

    try {
      // 临时 mock API 代码已注释
      /* 
      console.log("🎨 使用临时 mock API 进行绘制");
      
      const drawIntents = convertToDrawIntents(userPixels, paymentAddress);
      console.log("绘制意图:", drawIntents);
      
      const txid = await submitDrawIntents(drawIntents);
      
      console.log("绘制成功，交易ID:", txid);
      
      // 成功提示
      toast.success("绘制成功!", {
        description: `交易ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        duration: 5000,
      });

      // 调用成功回调
      onSuccess?.(txid);

      return;
      */

      // 恢复原有的 ree 平台代码
      // 检查池子加载状态
      if (poolsLoading) {
        throw new Error("池子信息正在加载中，请稍后重试");
      }
      
      if (poolsError) {
        throw new Error(`池子信息加载失败: ${poolsError}`);
      }
      
      // 检查是否有可用的池子
      if (!availablePools || availablePools.length === 0) {
        throw new Error("没有可用的池子，请稍后重试");
      }

      // 使用真实的池子地址（这里使用第一个池子，实际应用中可能需要查找特定的像素池子）
      const targetPool = availablePools[0];
      console.log("🎯 使用的池子:", targetPool);
      
      // 获取完整的池子信息，包含UTXO和nonce
      console.log("获取池子详细信息...");
      const poolInfo = await client.getPoolInfo(targetPool.address);
      console.log("🎯 池子详细信息:", poolInfo);
      
      // 计算空白像素和非空白像素的价格
      const paintedPixelMap = new Map<string, number>();
      paintedPixelInfoList.forEach((pixel) => {
        const key = `${pixel.x},${pixel.y}`;
        // Convert pixel.price from BTC to satoshis
        paintedPixelMap.set(key, pixel.price * 100000000);
      });

      let emptyPixelCount = 0;
      let repaintTotalPriceSatoshis = 0;

      userPixels.forEach((_color, key) => {
        if (paintedPixelMap.has(key)) {
          // Previously painted pixels - use price from backend (in satoshis)
          repaintTotalPriceSatoshis += paintedPixelMap.get(key)!;
        } else {
          // Empty pixels
          emptyPixelCount++;
        }
      });

      // 计算真实的像素价格（使用真实价格数据）
      const emptyPixelTotalPriceSatoshis = emptyPixelCount * PIXEL_CONSTANTS.DEFAULT_EMPTY_PIXEL_PRICE;
      const totalPriceSatoshis = emptyPixelTotalPriceSatoshis + repaintTotalPriceSatoshis;
      
      console.log("创建购买交易:", {
        pixelCount,
        emptyPixelCount,
        repaintPixelCount: pixelCount - emptyPixelCount,
        emptyPixelTotalPriceSatoshis,
        repaintTotalPriceSatoshis,
        totalPriceSatoshis,
        poolAddress: targetPool.address,
        poolName: targetPool.name,
        poolNonce: poolInfo.nonce,
        poolUtxosCount: poolInfo.utxos?.length || 0,
      });

      // 使用池子的第一个UTXO（如果没有UTXO则为undefined）
      const poolUtxo = poolInfo.utxos && poolInfo.utxos.length > 0 ? poolInfo.utxos[0] : undefined;
      console.log("使用的池子UTXO:", poolUtxo);

      // 创建交易
      const tx = await createTransaction();

      const tmpIntention = {
        poolAddress: targetPool.address,
        action: PIXEL_CONSTANTS.PURCHASE_ACTION,
        actionParams: JSON.stringify(
          Array.from(userPixels.entries()).map(([key, color]) => {
            const [x, y] = key.split(',').map(Number);
            return {
              x,
              y,
              owner: paymentAddress,
              color,
            };
          })
        ),
        poolUtxos: poolUtxo ? [
          reeUtils.formatPoolUtxo(
            targetPool.address,
            {
              ...poolUtxo,
              coins: poolUtxo.coins as [{ id: string; value: bigint; }],
            },
            Network.Testnet
          ),
        ] : [],
        inputCoins: [
          {
            coin: {
              id: PIXEL_CONSTANTS.BTC.id, // "0:0" for BTC
              value: BigInt(totalPriceSatoshis),
            },
            from: paymentAddress,
          },
        ],
        outputCoins: [
          // 不需要
          // {
          //   coin: purchaseOffer.output_pixels,
          //   to: address,
          // },
        ],
        nonce: poolInfo.nonce,
      };
      console.info('>>> test tmpIntention: ', tmpIntention);
      // 添加购买像素的意图
      tx.addIntention(tmpIntention);

      console.log("构建 PSBT...");
      // 构建 PSBT
      const { psbt } = await tx.build();
      
      console.log("请求用户签名...");
      // 请求用户签名
      const res = await signPsbt(psbt.toBase64());
      const signedPsbtHex = res?.signedPsbtHex ?? "";

      if (!signedPsbtHex) {
        throw new Error("签名失败");
      }

      console.log("发送交易...");
      // 发送交易
      const txid = await tx.send(signedPsbtHex);

      console.log("交易发送成功:", txid);
      
      // 成功提示
      toast.success("购买成功!", {
        description: `交易ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        duration: 5000,
      });

      // 调用成功回调
      onSuccess?.(txid);

    } catch (error: any) {
      console.error("购买失败:", error);
      
      // 用户取消签名不显示错误
      if (error.code !== 4001) {
        toast.error("购买失败", {
          description: error.message || "请稍后重试",
          duration: 5000,
        });
      }
    } finally {
      setIsPurchaseLoading(false);
    }
  }, [
    address, 
    paymentAddress, 
    pixelCount, 
    userPixels,
    paintedPixelInfoList,
    availablePools,
    poolsLoading,
    poolsError,
    signPsbt,
    createTransaction,
    client,
    onSuccess
  ]);

  return {
    // 状态
    isPurchaseLoading,
    isPoolsReady,
    
    // 池子信息
    availablePools,
    poolsLoading,
    poolsError,
    
    // 方法
    executePurchase,
    
    // 计算属性
    pixelCount,
    canPurchase,
  };
};
