/**
 * Canvas API service layer
 * Handles canvas data related business logic and API calls
 */

import type { PixelData } from "@/components/PixelCanvas/types";
import type { CanvasInfo, Participant } from "@/types/canvas";

// API returned Pixel structure
export interface ApiPixel {
  owner: string | null; // None means no owner, Some is the owner's address
  price: number; // Current price (satoshis)
  color: string; // 24-bit RGB888 color
  x: number; // Pixel coordinate x
  y: number; // Pixel coordinate y
}

// API returned Ranking structure
export interface ApiRankingItem {
  account: string; // User wallet address
  pixel_count: number; // Number of pixels drawn
  total_value: number; // Total value (satoshis)
}

// API returned Claimable structure
export interface ApiClaimableResponse {
  address: string; // User wallet address
  claimable_sats: number; // Number of claimable satoshis
}

// Canvas API response
export interface CanvasApiResponse {
  pixels: ApiPixel[];
}

// Canvas API constants
export const CANVAS_API = {
  BASE_URL: "https://p4nzc-yiaaa-aaaao-qkg2q-cai.raw.icp0.io",
  ENDPOINTS: {
    CANVAS: "/canvas",
    RANKING: "/rank",
    DRAW: "/draw", // New drawing interface
    CLAIMABLE: "/claimable", // New claimable balance interface
  },
  POLLING_INTERVAL: 8000, // 8 second polling interval
  GRID_SIZE: 100, // Canvas grid size (100x100)
} as const;

// Purchase intent interface definition
export interface PurchaseIntent {
  x: number;
  y: number;
  owner: string; // Buyer address (paymentAddress)
  color: string; // Expected color
}

export type PurchaseIntents = PurchaseIntent[];

/**
 * Parse JSON response data
 */
export async function parseCanvasResponse(response: Response): Promise<ApiPixel[]> {
  try {
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to parse JSON data:", error);
    return [];
  }
}

/**
 * Fetch canvas data
 */
export async function fetchCanvasData(): Promise<CanvasApiResponse> {
  try {
    const response = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.CANVAS}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const pixels = await parseCanvasResponse(response);
    
    // Filter out invalid pixel data (API returns coordinates directly, no calculation needed)
    const validPixels = pixels.filter((pixel) => 
      pixel.color && 
      typeof pixel.x === 'number' && 
      typeof pixel.y === 'number' &&
      pixel.x >= 0 && pixel.x < CANVAS_API.GRID_SIZE &&
      pixel.y >= 0 && pixel.y < CANVAS_API.GRID_SIZE
    );

    return { pixels: validPixels };
  } catch (error) {
    console.error("Failed to fetch canvas data:", error);
    throw error;
  }
}

/**
 * Convert API pixel data to PixelData format
 */
export function convertApiPixelsToPixelData(apiPixels: ApiPixel[]): PixelData[] {
  return apiPixels.map((pixel) => ({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
  }));
}

/**
 * Generate canvas info from API data
 */
export function generateCanvasInfo(apiPixels: ApiPixel[]): CanvasInfo {
  const paintedPixelCount = apiPixels.length;
  const totalValue = apiPixels.reduce((sum, pixel) => sum + pixel.price, 0);
  
  const paintedPixelInfoList = apiPixels.map((pixel) => ({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    price: pixel.price / 100000000, // Convert to BTC units (assuming price is satoshis)
  }));

  return {
    paintedPixelCount,
    totalValue: totalValue / 100000000, // Convert to BTC units
    paintedPixelInfoList,
  };
}

/**
 * Convert API ranking data to Participant format
 */
export function convertApiRankingToParticipants(apiRanking: ApiRankingItem[]): Participant[] {
  return apiRanking.map((item) => ({
    address: item.account,
    paintedPixelCount: item.pixel_count,
    paintedPrice: item.total_value / 100000000, // Convert to BTC units (assuming total_value is satoshis)
  }));
}

/**
 * 获取排行榜数据
 */
export async function fetchRankingData(): Promise<ApiRankingItem[]> {
  try {
    const response = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.RANKING}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("获取排行榜数据失败:", error);
    throw error;
  }
}

/**
 * 获取可领取余额数据
 */
export async function fetchClaimableBalance(address: string): Promise<ApiClaimableResponse> {
  try {
    const response = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.CLAIMABLE}?address=${encodeURIComponent(address)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("获取可领取余额失败:", error);
    throw error;
  }
}

/**
 * 带重试机制的数据获取
 */
export async function fetchCanvasDataWithRetry(
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<CanvasApiResponse> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchCanvasData();
    } catch (error) {
      lastError = error as Error;
      console.warn(`获取画布数据失败 (尝试 ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // 指数退避
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * 带重试机制的排行榜数据获取
 */
export async function fetchRankingDataWithRetry(
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<ApiRankingItem[]> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchRankingData();
    } catch (error) {
      lastError = error as Error;
      console.warn(`获取排行榜数据失败 (尝试 ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // 指数退避
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * 带重试机制的可领取余额数据获取
 */
export async function fetchClaimableBalanceWithRetry(
  address: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<ApiClaimableResponse> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchClaimableBalance(address);
    } catch (error) {
      lastError = error as Error;
      console.warn(`获取可领取余额失败 (尝试 ${attempt}/${maxRetries}):`, error);
      
      if (attempt < maxRetries) {
        // 指数退避
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

/**
 * 提交绘制意图到后端API (备用函数，当前已恢复使用 ree 平台)
 * 保留此函数以供将来可能的使用
 */
export async function submitDrawIntents(intents: PurchaseIntents): Promise<string> {
  try {
    console.log("Submit drawing intents:", intents);
    
    const response = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.DRAW}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(intents),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 假设返回交易ID或成功标识
    const result = await response.text();
    console.log("Drawing submission successful:", result);
    
    // 返回模拟的交易ID
    return result || `mock_tx_${Date.now()}`;
  } catch (error) {
    console.error("提交绘制意图失败:", error);
    throw error;
  }
}

/**
 * Canvas 服务类
 * 封装所有画布相关的 API 操作
 */
export class CanvasService {
  private static instance: CanvasService;

  private constructor() {}

  static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService();
    }
    return CanvasService.instance;
  }

  /**
   * 获取画布数据
   */
  async getCanvasData(): Promise<{
    pixelData: PixelData[];
    canvasInfo: CanvasInfo;
  }> {
    const response = await fetchCanvasDataWithRetry();
    const pixelData = convertApiPixelsToPixelData(response.pixels);
    const canvasInfo = generateCanvasInfo(response.pixels);
    
    return { pixelData, canvasInfo };
  }

  /**
   * 获取画布统计信息
   */
  async getCanvasStats(): Promise<{
    paintedPixelCount: number;
    totalValue: number;
    averagePrice: number;
  }> {
    const response = await fetchCanvasDataWithRetry();
    const paintedPixelCount = response.pixels.length;
    const totalValue = response.pixels.reduce((sum, pixel) => sum + pixel.price, 0) / 100000000;
    const averagePrice = paintedPixelCount > 0 ? totalValue / paintedPixelCount : 0;

    return {
      paintedPixelCount,
      totalValue,
      averagePrice,
    };
  }

  /**
   * 获取排行榜数据
   */
  async getRankingData(): Promise<ApiRankingItem[]> {
    return await fetchRankingDataWithRetry();
  }

  /**
   * 获取转换后的参与者排行榜数据
   */
  async getParticipants(): Promise<Participant[]> {
    const apiRanking = await fetchRankingDataWithRetry();
    return convertApiRankingToParticipants(apiRanking);
  }

  /**
   * 获取可领取余额数据
   */
  async getClaimableBalance(address: string): Promise<{
    address: string;
    claimableSats: number;
    claimableBTC: number;
  }> {
    const response = await fetchClaimableBalanceWithRetry(address);
    return {
      address: response.address,
      claimableSats: response.claimable_sats,
      claimableBTC: response.claimable_sats / 100000000, // 转换为 BTC 单位
    };
  }
}

// 导出单例实例
export const canvasService = CanvasService.getInstance();
