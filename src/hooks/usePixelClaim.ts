import { useState, useCallback } from "react";
import { useLaserEyes } from "@omnisat/lasereyes";
import { useRee, usePoolList, utils as reeUtils, Network } from "@omnity/ree-client-ts-sdk";
import { toast } from "sonner";
import { PIXEL_CONSTANTS } from "@/constants/pixel";
import { shortenErrorMessage } from "@/utils/string";

/**
 * 计算 claim 时的实际到账金额
 * @param gross 要 claim 的"毛额"（单位：sats）
 * @returns 实际到账金额（毛额 - 手续费）
 */
export function calcClaimNet(gross: bigint): bigint {
  if (gross <= 0n) {
    throw new Error("gross amount must be positive");
  }
  const feePercent = 1n; // 配置: claim_fee_percent = 1 (%)
  const fee = (gross * feePercent) / 100n; // floor(gross * 1 / 100)
  return gross - fee;
}

export interface UsePixelClaimProps {
  onSuccess?: (txid: string) => void;
}

export interface UsePixelClaimReturn {
  // 状态
  isClaimLoading: boolean;
  isPoolsReady: boolean;
  
  // 池子信息
  availablePools: any[];
  poolsLoading: boolean;
  poolsError: string | null;
  
  // 方法
  executeClaim: (claimableAmount: number) => Promise<void>;
  
  // 计算属性
  canClaim: boolean;
}

export const usePixelClaim = ({ 
  onSuccess 
}: UsePixelClaimProps): UsePixelClaimReturn => {
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  
  // Wallet 和交易相关 hooks
  const { signPsbt, address, paymentAddress } = useLaserEyes();
  const { createTransaction, client } = useRee();
  const { pools: availablePools, loading: poolsLoading, error: poolsError } = usePoolList();

  // 计算属性
  const isPoolsReady = !poolsLoading && !poolsError && availablePools && availablePools.length > 0;
  const canClaim = !!address && !!paymentAddress && isPoolsReady;

  // ! 执行claim交易
  const executeClaim = useCallback(async (claimableAmount: number) => {
    if (!address || !paymentAddress) {
      toast.error("请先连接钱包", {
        description: "需要连接钱包才能claim余额",
      });
      return;
    }

    if (claimableAmount <= 0) {
      toast.error("没有可claim的余额", {
        description: "当前没有可claim的余额",
      });
      return;
    }

    setIsClaimLoading(true);

    try {
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

      // 使用真实的池子地址（这里使用第一个池子）
      const targetPool = availablePools[0];
      console.log("🎯 使用的池子:", targetPool);
      
      // 获取完整的池子信息，包含UTXO和nonce
      console.log("获取池子详细信息...");
      const poolInfo = await client.getPoolInfo(targetPool.address);
      console.log("🎯 池子详细信息:", poolInfo);
      
      console.log("创建claim交易:", {
        claimableAmount,
        poolAddress: targetPool.address,
        poolName: targetPool.name,
        poolNonce: poolInfo.nonce,
        poolUtxosCount: poolInfo.utxos?.length || 0,
        paymentAddress,
      });

      // 使用池子的第一个UTXO（如果没有UTXO则为undefined）
      const poolUtxo = poolInfo.utxos && poolInfo.utxos.length > 0 ? poolInfo.utxos[0] : undefined;
      console.log("使用的池子UTXO:", poolUtxo);

      // 创建交易
      const tx = await createTransaction();

      const claimIntention = {
        poolAddress: targetPool.address,
        action: PIXEL_CONSTANTS.CLAIM_ACTION,
        actionParams: JSON.stringify({
          amount: claimableAmount,
          to: paymentAddress,
        }),
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
          // claim通常不需要输入coins，或者根据具体逻辑调整
        ],
        outputCoins: [
          {
            coin: {
              id: PIXEL_CONSTANTS.BTC.id, // "0:0" for BTC
              value: calcClaimNet(BigInt(claimableAmount)),
            },
            to: paymentAddress,
          },
        ],
        nonce: poolInfo.nonce,
      };
      
      console.info('>>> claim intention: ', claimIntention);
      
      // 添加claim意图
      tx.addIntention(claimIntention);

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

      console.log("Claim交易发送成功:", txid);
      
      // 成功提示
      toast.success("Claim成功!", {
        description: `交易ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        duration: 5000,
      });

      // 调用成功回调
      onSuccess?.(txid);

    } catch (error: any) {
      console.error("Claim失败:", error);
      
      // 用户取消签名不显示错误
      if (error.code !== 4001) {
        toast.error("Claim失败", {
          description: shortenErrorMessage(error.message, 120) || "请稍后重试",
          duration: 5000,
        });
      }
    } finally {
      setIsClaimLoading(false);
    }
  }, [
    address, 
    paymentAddress, 
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
    isClaimLoading,
    isPoolsReady,
    
    // 池子信息
    availablePools,
    poolsLoading,
    poolsError,
    
    // 方法
    executeClaim,
    
    // 计算属性
    canClaim,
  };
};
