// 像素购买相关常量
export const PIXEL_CONSTANTS = {
  // Mock 交易池地址 (后续需要更新为真实地址)
  POOL_ADDRESS: "2N5muMepJizJE1gR7FbHJU6CD18V3BpNF5o",
  
  // Mock 像素代币配置
  PIXEL_COIN: {
    id: "PIXEL", // 像素代币 ID
    symbol: "PIXEL",
    decimals: 0, // 像素通常不可分割
  },
  
  // Mock BTC 配置
  BTC: {
    id: "0:0",
    symbol: "BTC", 
    decimals: 8,
  },
  
  // 购买动作标识
  PURCHASE_ACTION: "buy_pixels",
  
  // Claim动作标识
  CLAIM_ACTION: "claim",
  
  // 1 BTC = 100,000,000 satoshis
  // 默认每个空像素价格 (satoshis)
  DEFAULT_EMPTY_PIXEL_PRICE: 100, // 0.000001 BTC = 100 satoshis
  
  
  // 网络费用 (satoshis)
  DEFAULT_NETWORK_FEE: 1000,
  
  // Mock 交易状态
  TX_STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed", 
    FAILED: "failed",
  },
} as const;

// 像素购买价格计算
export const calculatePixelPrice = (
  emptyPixelCount: number,
  repaintPixelTotalPrice: number, // 重绘像素的总价格（聪为单位）
  emptyPixelPrice: number = PIXEL_CONSTANTS.DEFAULT_EMPTY_PIXEL_PRICE
) => {
  const emptyPixelTotal = emptyPixelCount * emptyPixelPrice;
  
  return {
    emptyPixelTotal,
    repaintPixelTotal: repaintPixelTotalPrice, 
    totalPrice: emptyPixelTotal + repaintPixelTotalPrice + PIXEL_CONSTANTS.DEFAULT_NETWORK_FEE,
    networkFee: PIXEL_CONSTANTS.DEFAULT_NETWORK_FEE,
  };
};

// Mock 池子信息
// export const mockPoolInfo = {
//   address: PIXEL_CONSTANTS.POOL_ADDRESS,
//   name: "Pixel Canvas Pool",
//   btc_reserved: BigInt(1000000000), // 10 BTC in satoshis
//   coin_reserved: [
//     {
//       id: PIXEL_CONSTANTS.PIXEL_COIN.id,
//       value: BigInt(1000000), // 1M pixels
//     }
//   ],
//   nonce: BigInt(1),
//   utxos: [
//     {
//       txid: "mock_utxo_txid_123456789",
//       vout: 0,
//       sats: BigInt(100000000), // 1 BTC
//       coins: [
//         {
//           id: PIXEL_CONSTANTS.PIXEL_COIN.id,
//           value: BigInt(1000000),
//         }
//       ] as [{ id: string; value: bigint; }],
//     }
//   ],
// };

// Mock 购买报价
// export const createMockPurchaseOffer = (emptyPixelCount: number, repaintPixelTotalPrice: number = 0) => {
//   const pricing = calculatePixelPrice(emptyPixelCount, repaintPixelTotalPrice);
  
//   return {
//     pool_utxo: {
//       ...mockPoolInfo.utxos[0],
//       coins: mockPoolInfo.utxos[0].coins as [{ id: string; value: bigint; }],
//     },
//     nonce: mockPoolInfo.nonce,
//     input_btc: {
//       id: PIXEL_CONSTANTS.BTC.id,
//       value: BigInt(pricing.totalPrice),
//     },
//     output_pixels: {
//       id: PIXEL_CONSTANTS.PIXEL_COIN.id,
//       value: BigInt(emptyPixelCount),
//     },
//   };
// };
