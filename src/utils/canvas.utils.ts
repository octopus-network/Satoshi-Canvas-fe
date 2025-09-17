/**
 * Canvas 相关的纯工具函数
 */

import type { PixelData } from "@/components/PixelCanvas/types";

/**
 * 从索引计算像素坐标
 * 像素按行优先顺序存储（0-9999对应100x100网格）
 * @param index 像素索引
 * @param gridSize 网格大小，默认100
 */
export function indexToCoordinates(index: number, gridSize: number = 100): { x: number; y: number } {
  const x = index % gridSize;
  const y = Math.floor(index / gridSize);
  return { x, y };
}

/**
 * 从坐标计算索引
 * @param x x坐标
 * @param y y坐标
 * @param gridSize 网格大小，默认100
 */
export function coordinatesToIndex(x: number, y: number, gridSize: number = 100): number {
  return y * gridSize + x;
}

/**
 * 验证像素坐标是否在有效范围内
 * @param x x坐标
 * @param y y坐标
 * @param gridSize 网格大小，默认100
 */
export function isValidCoordinates(x: number, y: number, gridSize: number = 100): boolean {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

/**
 * 验证颜色格式是否有效
 * @param color 颜色字符串
 */
export function isValidColor(color: string): boolean {
  // 验证十六进制颜色格式 #rrggbb
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  return hexColorRegex.test(color);
}

/**
 * 将像素数据转换为坐标映射
 * @param pixels 像素数据数组
 */
export function pixelsToCoordinateMap(pixels: PixelData[]): Map<string, string> {
  const map = new Map<string, string>();
  pixels.forEach(pixel => {
    const key = `${pixel.x},${pixel.y}`;
    map.set(key, pixel.color);
  });
  return map;
}

/**
 * 将坐标映射转换为像素数据数组
 * @param coordinateMap 坐标映射
 */
export function coordinateMapToPixels(coordinateMap: Map<string, string>): PixelData[] {
  const pixels: PixelData[] = [];
  coordinateMap.forEach((color, key) => {
    const [x, y] = key.split(',').map(Number);
    pixels.push({ x, y, color });
  });
  return pixels;
}

/**
 * 计算两个像素点之间的距离
 * @param p1 第一个像素点
 * @param p2 第二个像素点
 */
export function pixelDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 获取指定像素周围的邻居像素坐标
 * @param x 中心x坐标
 * @param y 中心y坐标
 * @param radius 半径，默认1
 * @param gridSize 网格大小，默认100
 */
export function getNeighborCoordinates(
  x: number, 
  y: number, 
  radius: number = 1, 
  gridSize: number = 100
): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue; // 跳过中心点
      
      const nx = x + dx;
      const ny = y + dy;
      
      if (isValidCoordinates(nx, ny, gridSize)) {
        neighbors.push({ x: nx, y: ny });
      }
    }
  }
  
  return neighbors;
}

/**
 * 检查像素数据是否有重复坐标
 * @param pixels 像素数据数组
 */
export function hasDuplicateCoordinates(pixels: PixelData[]): boolean {
  const coordinateSet = new Set<string>();
  
  for (const pixel of pixels) {
    const key = `${pixel.x},${pixel.y}`;
    if (coordinateSet.has(key)) {
      return true;
    }
    coordinateSet.add(key);
  }
  
  return false;
}

/**
 * 移除重复坐标的像素（保留最后一个）
 * @param pixels 像素数据数组
 */
export function removeDuplicatePixels(pixels: PixelData[]): PixelData[] {
  const coordinateMap = new Map<string, PixelData>();
  
  pixels.forEach(pixel => {
    const key = `${pixel.x},${pixel.y}`;
    coordinateMap.set(key, pixel);
  });
  
  return Array.from(coordinateMap.values());
}

/**
 * 按颜色分组像素数据
 * @param pixels 像素数据数组
 */
export function groupPixelsByColor(pixels: PixelData[]): Map<string, PixelData[]> {
  const colorGroups = new Map<string, PixelData[]>();
  
  pixels.forEach(pixel => {
    const color = pixel.color.toLowerCase();
    if (!colorGroups.has(color)) {
      colorGroups.set(color, []);
    }
    colorGroups.get(color)!.push(pixel);
  });
  
  return colorGroups;
}

/**
 * 计算像素数据的边界框
 * @param pixels 像素数据数组
 */
export function getPixelsBoundingBox(pixels: PixelData[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} | null {
  if (pixels.length === 0) return null;
  
  let minX = pixels[0].x;
  let minY = pixels[0].y;
  let maxX = pixels[0].x;
  let maxY = pixels[0].y;
  
  pixels.forEach(pixel => {
    minX = Math.min(minX, pixel.x);
    minY = Math.min(minY, pixel.y);
    maxX = Math.max(maxX, pixel.x);
    maxY = Math.max(maxY, pixel.y);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
