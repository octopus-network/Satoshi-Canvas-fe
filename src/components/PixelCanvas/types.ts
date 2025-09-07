// Import canvas info types
import type { CanvasInfo } from "@/types/canvas";

export interface PixelCanvasProps {
  gridSize: 100 | 1000;
  pixelSize?: number;
  onGridSizeChange?: (size: 100 | 1000) => void;
  // 新增：初始数据导入
  initialData?: PixelData[];
  // 新增：绘制操作变更回调
  onDrawingChange?: (operations: DrawingOperation[]) => void;
  // 新增：用户绘制像素数量变更回调
  onUserPixelCountChange?: (count: number) => void;
  // 新增：当前画板信息
  canvasInfo?: CanvasInfo;
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
}

// 新增：绘制操作接口
export interface DrawingOperation {
  x: number;
  y: number;
  color: string;
  timestamp: number;
  type: "draw" | "erase"; // 新增：操作类型
}

// 新增：绘制模式类型
export type DrawingMode = "draw" | "erase" | "locate" | "picker";

// 新增：撤销/重做所需的像素变更记录（仅针对用户图层 userPixels）
export interface PixelChange {
  key: string; // "x,y"
  before?: string; // 撤销时恢复到 before
  after?: string; // 重做时恢复到 after
}

// 新增：历史分组（按笔触或图片导入为粒度）
export interface HistoryEntry {
  kind: "stroke" | "import";
  changes: PixelChange[];
  operations: DrawingOperation[];
}

// 新增：组件引用接口
export interface PixelCanvasRef {
  getCurrentPixelData: () => PixelData[];
  getDrawingOperations: () => DrawingOperation[];
  getUserDrawingData: () => PixelData[]; // 新增：获取用户最终实际绘制的数据
  importData: (data: PixelData[]) => void;
  clearCanvas: () => void;
  clearUserDrawing: () => void; // 新增：只清除用户绘制
  undo: () => void; // 新增：撤销最近一次笔触或图片导入
  redo: () => void; // 新增：重做最近一次被撤销的操作
}

// 新增：图片导入相关接口
export interface ImageImportConfig {
  scale: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface ProcessedImageData {
  pixels: PixelData[];
  originalWidth: number;
  originalHeight: number;
  scaledWidth: number;
  scaledHeight: number;
}

export interface InputValues {
  scale: string;
  offsetX: string;
  offsetY: string;
  opacity: string;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

export interface MousePosition {
  x: number;
  y: number;
}

export interface PixelCoordinates {
  pixelX: number;
  pixelY: number;
}
