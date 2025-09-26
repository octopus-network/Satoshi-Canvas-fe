import { useState, useCallback, useEffect } from "react";
import { useLaserEyes } from "@omnisat/lasereyes";
import { useRee, usePoolList, utils as reeUtils, Network } from "@omnity/ree-client-ts-sdk";
import { toast } from "sonner";
import { PIXEL_CONSTANTS } from "@/constants/pixel";
// import { submitDrawIntents, type PurchaseIntent, type PurchaseIntents } from "@/services/canvas.service"; // Temporarily not used
import { shortenErrorMessage } from "@/utils/string";

export interface UsePixelPurchaseProps {
  userPixels: Map<string, string>;
  paintedPixelInfoList: Array<{ x: number; y: number; price: number }>; // Price in BTC
  onSuccess?: (txid: string) => void;
}

export interface UsePixelPurchaseReturn {
  // State
  isPurchaseLoading: boolean;
  isPoolsReady: boolean;
  
  // Pool information
  availablePools: any[];
  poolsLoading: boolean;
  poolsError: string | null;
  
  // Methods
  executePurchase: () => Promise<void>;
  
  // Computed properties
  pixelCount: number;
  canPurchase: boolean;
}

export const usePixelPurchase = ({ 
  userPixels, 
  paintedPixelInfoList,
  onSuccess 
}: UsePixelPurchaseProps): UsePixelPurchaseReturn => {
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  
  // Wallet and transaction related hooks
  const { signPsbt, address, paymentAddress } = useLaserEyes();
  const { createTransaction, client } = useRee();
  const { pools: availablePools, loading: poolsLoading, error: poolsError } = usePoolList();

  // Computed properties
  const pixelCount = userPixels.size;
  const isPoolsReady = !poolsLoading && !poolsError && availablePools && availablePools.length > 0;
  const canPurchase = !!address && !!paymentAddress && pixelCount > 0 && isPoolsReady;

  // Debug: Pool information logging
  useEffect(() => {
    // console.log("🏊 Pool status update:", { 
    //   poolsLoading, 
    //   poolsError, 
    //   poolCount: availablePools?.length 
    // });
    
    if (poolsError) {
      // console.log("🏊 Pool list loading failed:", { errorInfo: poolsError });
      toast.error("Pool information loading failed", {
        description: shortenErrorMessage(poolsError, 120) || "Please check network connection or try again later",
        duration: 5000,
      });
    } else if (!poolsLoading && availablePools && availablePools.length > 0) {
      // console.log("🏊 Pool list obtained:", availablePools);
      // console.log("🏊 First pool details:", availablePools[0]);
      // console.log("🏊 Pool count:", availablePools.length);
      
      // Print address and name of each pool
      availablePools.forEach(() => {
        // console.log(`🏊 Pool ${index + 1}:`, {
        //   name: pool.name,
        //   address: pool.address,
        // });
      });

      // Show pool information loading success notification (only once)
      // toast.success("Pool information loaded successfully", {
      //   description: `Found ${availablePools.length} available pools`,
      //   duration: 3000,
      // });
    } else if (!poolsLoading && (!availablePools || availablePools.length === 0)) {
      // console.log("🏊 No available pools found");
      toast.error("No available pools found", {
        description: "Please try again later or contact administrator",
        duration: 5000,
      });
    } else if (poolsLoading) {
      // console.log("🏊 Pool list is loading...");
    }
  }, [availablePools, poolsLoading, poolsError]);

  // Execute purchase transaction
  const executePurchase = useCallback(async () => {
    if (!address || !paymentAddress) {
      toast.error("Please connect wallet first", {
        description: "Need to connect wallet to purchase pixels",
      });
      return;
    }

    if (pixelCount === 0) {
      toast.error("No pixels to purchase", {
        description: "Please draw some pixels first",
      });
      return;
    }

    setIsPurchaseLoading(true);

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

      // Use real pool address (using the first pool here, in actual application may need to find specific pixel pool)
      const targetPool = availablePools[0];
      console.log("🎯 Using pool:", targetPool);
      
      // Get complete pool information, including UTXO and nonce
      console.log("Getting detailed pool information...");
      const poolInfo = await client.getPoolInfo(targetPool.address);
      console.log("🎯 Detailed pool information:", poolInfo);
      
      // Calculate prices for empty pixels and non-empty pixels
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

      // Calculate real pixel prices (using real price data)
      const emptyPixelTotalPriceSatoshis = emptyPixelCount * PIXEL_CONSTANTS.DEFAULT_EMPTY_PIXEL_PRICE;
      const totalPriceSatoshis = emptyPixelTotalPriceSatoshis + repaintTotalPriceSatoshis;
      
      console.log("Creating purchase transaction:", {
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

      // Use the first UTXO of the pool (undefined if no UTXO)
      const poolUtxo = poolInfo.utxos && poolInfo.utxos.length > 0 ? poolInfo.utxos[0] : undefined;
      console.log("Using pool UTXO:", poolUtxo);

      // Create transaction
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
          // Not needed
          // {
          //   coin: purchaseOffer.output_pixels,
          //   to: address,
          // },
        ],
        nonce: poolInfo.nonce,
      };
      // Add pixel purchase intention
      tx.addIntention(tmpIntention);

      console.log("Building PSBT...");
      // Build PSBT
      const { psbt } = await tx.build();
      
      console.log("Requesting user signature...");
      // Request user signature
      const res = await signPsbt(psbt.toBase64());
      const signedPsbtHex = res?.signedPsbtHex ?? "";

      if (!signedPsbtHex) {
        throw new Error("Signature failed");
      }

      console.log("Sending transaction...");
      // Send transaction
      const txid = await tx.send(signedPsbtHex);

      console.log("Transaction sent successfully:", txid);
      
      // Success notification
      toast.success("Purchase successful!", {
        description: `Transaction ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        duration: 5000,
      });

      // Call success callback
      onSuccess?.(txid);

    } catch (error: any) {
      console.error("Purchase failed:", error);
      
      // Don't show error for user cancelling signature
      if (error.code !== 4001) {
        toast.error("Purchase failed", {
          description: error.message || "Please try again later",
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
    // State
    isPurchaseLoading,
    isPoolsReady,
    
    // Pool information
    availablePools,
    poolsLoading,
    poolsError,
    
    // Methods
    executePurchase,
    
    // Computed properties
    pixelCount,
    canPurchase,
  };
};
