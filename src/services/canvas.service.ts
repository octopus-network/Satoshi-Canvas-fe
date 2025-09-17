/**
 * Canvas API 服务层
 * 处理画布数据相关的业务逻辑和 API 调用
 */

import type { PixelData } from "@/components/PixelCanvas/types";
import type { CanvasInfo, Participant } from "@/types/canvas";

// API 返回的 Pixel 结构
export interface ApiPixel {
  owner: string | null; // None 表示无人持有，Some 则为持有者地址
  price: number; // 当前标价 (satoshis)
  color: string; // 24-bit RGB888 颜色
  x: number; // 像素坐标 x
  y: number; // 像素坐标 y
}

// API 返回的 Ranking 结构
export interface ApiRankingItem {
  account: string; // 用户钱包地址
  pixel_count: number; // 绘制的像素数量
  total_value: number; // 总价值 (satoshis)
}

// Canvas API 响应
export interface CanvasApiResponse {
  pixels: ApiPixel[];
}

// Canvas API 常量
export const CANVAS_API = {
  BASE_URL: "https://tzw3y-raaaa-aaaar-qbtya-cai.raw.icp0.io",
  ENDPOINTS: {
    CANVAS: "/canvas",
    RANKING: "/rank",
  },
  POLLING_INTERVAL: 8000, // 8秒轮询间隔
  GRID_SIZE: 100, // 画布网格大小 (100x100)
} as const;

/**
 * 解析 JSON 响应数据
 */
export async function parseCanvasResponse(response: Response): Promise<ApiPixel[]> {
  try {
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("解析 JSON 数据失败:", error);
    return [];
  }
}

/**
 * 获取画布数据
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
    
    // 过滤掉无效的像素数据（API 直接返回坐标，无需计算）
    const validPixels = pixels.filter((pixel) => 
      pixel.color && 
      typeof pixel.x === 'number' && 
      typeof pixel.y === 'number' &&
      pixel.x >= 0 && pixel.x < CANVAS_API.GRID_SIZE &&
      pixel.y >= 0 && pixel.y < CANVAS_API.GRID_SIZE
    );

    return { pixels: validPixels };
  } catch (error) {
    console.error("获取画布数据失败:", error);
    throw error;
  }
}

/**
 * 将 API 像素数据转换为 PixelData 格式
 */
export function convertApiPixelsToPixelData(apiPixels: ApiPixel[]): PixelData[] {
  return apiPixels.map((pixel) => ({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
  }));
}

/**
 * 从 API 数据生成画布信息
 */
export function generateCanvasInfo(apiPixels: ApiPixel[]): CanvasInfo {
  const paintedPixelCount = apiPixels.length;
  const totalValue = apiPixels.reduce((sum, pixel) => sum + pixel.price, 0);
  
  const paintedPixelInfoList = apiPixels.map((pixel) => ({
    x: pixel.x,
    y: pixel.y,
    color: pixel.color,
    price: pixel.price / 100000000, // 转换为 BTC 单位 (假设 price 是 satoshis)
  }));

  return {
    paintedPixelCount,
    totalValue: totalValue / 100000000, // 转换为 BTC 单位
    paintedPixelInfoList,
  };
}

/**
 * 将 API 排行榜数据转换为 Participant 格式
 */
export function convertApiRankingToParticipants(apiRanking: ApiRankingItem[]): Participant[] {
  return apiRanking.map((item) => ({
    address: item.account,
    paintedPixelCount: item.pixel_count,
    paintedPrice: item.total_value / 100000000, // 转换为 BTC 单位 (假设 total_value 是 satoshis)
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
}

// 导出单例实例
export const canvasService = CanvasService.getInstance();
