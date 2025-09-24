import { useState, useCallback } from "react";
import { useLaserEyes } from "@omnisat/lasereyes";
import { useRee, usePoolList, utils as reeUtils, Network } from "@omnity/ree-client-ts-sdk";
import { toast } from "sonner";
import { PIXEL_CONSTANTS } from "@/constants/pixel";
import { shortenErrorMessage } from "@/utils/string";

/**
 * Calculate the actual amount when claiming
 * @param gross The "gross" amount to claim (unit: sats)
 * @returns Actual amount received (gross - fees)
 */
export function calcClaimNet(gross: bigint): bigint {
  if (gross <= 0n) {
    throw new Error("gross amount must be positive");
  }
  const feePercent = 1n; // Configuration: claim_fee_percent = 1 (%)
  const fee = (gross * feePercent) / 100n; // floor(gross * 1 / 100)
  return gross - fee;
}

export interface UsePixelClaimProps {
  onSuccess?: (txid: string) => void;
}

export interface UsePixelClaimReturn {
  // State
  isClaimLoading: boolean;
  isPoolsReady: boolean;
  
  // Pool information
  availablePools: any[];
  poolsLoading: boolean;
  poolsError: string | null;
  
  // Methods
  executeClaim: (claimableAmount: number) => Promise<void>;
  
  // Computed properties
  canClaim: boolean;
}

export const usePixelClaim = ({ 
  onSuccess 
}: UsePixelClaimProps): UsePixelClaimReturn => {
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  
  // Wallet and transaction related hooks
  const { signPsbt, address, paymentAddress } = useLaserEyes();
  const { createTransaction, client } = useRee();
  const { pools: availablePools, loading: poolsLoading, error: poolsError } = usePoolList();

  // Computed properties
  const isPoolsReady = !poolsLoading && !poolsError && availablePools && availablePools.length > 0;
  const canClaim = !!address && !!paymentAddress && isPoolsReady;

  // Execute claim transaction
  const executeClaim = useCallback(async (claimableAmount: number) => {
    if (!address || !paymentAddress) {
      toast.error("Please connect wallet first", {
        description: "Need to connect wallet to claim balance",
      });
      return;
    }

    if (claimableAmount <= 0) {
      toast.error("No claimable balance", {
        description: "Currently no claimable balance",
      });
      return;
    }

    setIsClaimLoading(true);

    try {
      // Check pool loading status
      if (poolsLoading) {
        throw new Error("Pool information is loading, please try again later");
      }
      
      if (poolsError) {
        throw new Error(`Pool information loading failed: ${poolsError}`);
      }
      
      // Check if there are available pools
      if (!availablePools || availablePools.length === 0) {
        throw new Error("No available pools, please try again later");
      }

      // Use real pool address (using the first pool here)
      const targetPool = availablePools[0];
      // console.log("🎯 Using pool:", targetPool);
      
      // Get complete pool information, including UTXO and nonce
      // console.log("Getting detailed pool information...");
      const poolInfo = await client.getPoolInfo(targetPool.address);
      // console.log("🎯 Detailed pool information:", poolInfo);
      
      // console.log("Creating claim transaction:", {
      //   claimableAmount,
      //   poolAddress: targetPool.address,
      //   poolName: targetPool.name,
      //   poolNonce: poolInfo.nonce,
      //   poolUtxosCount: poolInfo.utxos?.length || 0,
      //   paymentAddress,
      // });

      // Use the first UTXO of the pool (undefined if no UTXO)
      const poolUtxo = poolInfo.utxos && poolInfo.utxos.length > 0 ? poolInfo.utxos[0] : undefined;
      // console.log("Using pool UTXO:", poolUtxo);

      // Create transaction
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
          // claim usually doesn't need input coins, or adjust according to specific logic
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
      
      // Add claim intention
      tx.addIntention(claimIntention);

      // console.log("Building PSBT...");
      // Build PSBT
      const { psbt } = await tx.build();
      
      // console.log("Requesting user signature...");
      // Request user signature
      const res = await signPsbt(psbt.toBase64());
      const signedPsbtHex = res?.signedPsbtHex ?? "";

      if (!signedPsbtHex) {
        throw new Error("Signature failed");
      }

      // console.log("Sending transaction...");
      // Send transaction
      const txid = await tx.send(signedPsbtHex);

      // console.log("Claim transaction sent successfully:", txid);
      
      // Success notification
      toast.success("Claim successful!", {
        description: `Transaction ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        duration: 5000,
      });

      // Call success callback
      onSuccess?.(txid);

    } catch (error: any) {
      console.error("Claim failed:", error);
      
      // Don't show error for user cancelling signature
      if (error.code !== 4001) {
        toast.error("Claim failed", {
          description: shortenErrorMessage(error.message, 120) || "Please try again later",
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
    // State
    isClaimLoading,
    isPoolsReady,
    
    // Pool information
    availablePools,
    poolsLoading,
    poolsError,
    
    // Methods
    executeClaim,
    
    // Computed properties
    canClaim,
  };
};
