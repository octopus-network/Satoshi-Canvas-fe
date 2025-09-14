// Import canvas info types
import type { CanvasInfo } from "@/types/canvas";

export interface PixelCanvasProps {
  gridSize: 100 | 1000;
  pixelSize?: number;
  onGridSizeChange?: (size: 100 | 1000) => void;
  // New: initial data import
  initialData?: PixelData[];
  // New: drawing operation change callback
  onDrawingChange?: (operations: DrawingOperation[]) => void;
  // New: user drawn pixel count change callback
  onUserPixelCountChange?: (count: number) => void;
  // New: current canvas info
  canvasInfo?: CanvasInfo;
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
}

// New: drawing operation interface
export interface DrawingOperation {
  x: number;
  y: number;
  color: string;
  timestamp: number;
  type: "draw" | "erase"; // New: operation type
}

// New: drawing mode type
export type DrawingMode = "draw" | "erase" | "locate" | "picker";

// New: pixel change records needed for undo/redo (only for user layer userPixels)
export interface PixelChange {
  key: string; // "x,y"
  before?: string; // Restore to before when undoing
  after?: string; // Restore to after when redoing
}

// New: history grouping (by stroke or image import granularity)
export interface HistoryEntry {
  kind: "stroke" | "import";
  changes: PixelChange[];
  operations: DrawingOperation[];
}

// New: component reference interface
export interface PixelCanvasRef {
  getCurrentPixelData: () => PixelData[];
  getDrawingOperations: () => DrawingOperation[];
  getUserDrawingData: () => PixelData[]; // New: get user final actual drawing data
  importData: (data: PixelData[]) => void;
  clearCanvas: () => void;
  clearUserDrawing: () => void; // New: only clear user drawing
  undo: () => void; // New: undo the most recent stroke or image import
  redo: () => void; // New: redo the most recent undone operation
}

// New: image import related interface
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
