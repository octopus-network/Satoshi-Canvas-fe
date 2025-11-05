/**
 * Canvas related pure utility functions
 */

import type { PixelData } from "@/components/PixelCanvas/types";

/**
 * Calculate pixel coordinates from index
 * Pixels are stored in row-major order (0-1048575 corresponds to 1024x1024 grid)
 * @param index Pixel index
 * @param gridSize Grid size, default 1024
 */
export function indexToCoordinates(index: number, gridSize: number = 1024): { x: number; y: number } {
  const x = index % gridSize;
  const y = Math.floor(index / gridSize);
  return { x, y };
}

/**
 * Calculate index from coordinates
 * @param x x coordinate
 * @param y y coordinate
 * @param gridSize Grid size, default 1024
 */
export function coordinatesToIndex(x: number, y: number, gridSize: number = 1024): number {
  return y * gridSize + x;
}

/**
 * Validate if pixel coordinates are within valid range
 * @param x x coordinate
 * @param y y coordinate
 * @param gridSize Grid size, default 1024
 */
export function isValidCoordinates(x: number, y: number, gridSize: number = 1024): boolean {
  return x >= 0 && x < gridSize && y >= 0 && y < gridSize;
}

/**
 * Validate if color format is valid
 * @param color Color string
 */
export function isValidColor(color: string): boolean {
  // Validate hexadecimal color format #rrggbb
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  return hexColorRegex.test(color);
}

/**
 * Convert pixel data to coordinate mapping
 * @param pixels Pixel data array
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
 * Convert coordinate mapping to pixel data array
 * @param coordinateMap Coordinate mapping
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
 * Calculate distance between two pixel points
 * @param p1 First pixel point
 * @param p2 Second pixel point
 */
export function pixelDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get neighbor pixel coordinates around specified pixel
 * @param x Center x coordinate
 * @param y Center y coordinate
 * @param radius Radius, default 1
 * @param gridSize Grid size, default 1024
 */
export function getNeighborCoordinates(
  x: number, 
  y: number, 
  radius: number = 1, 
  gridSize: number = 1024
): { x: number; y: number }[] {
  const neighbors: { x: number; y: number }[] = [];
  
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      if (dx === 0 && dy === 0) continue; // Skip center point
      
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
 * Check if pixel data has duplicate coordinates
 * @param pixels Pixel data array
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
 * Remove pixels with duplicate coordinates (keep the last one)
 * @param pixels Pixel data array
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
 * Group pixel data by color
 * @param pixels Pixel data array
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
 * Calculate bounding box of pixel data
 * @param pixels Pixel data array
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
