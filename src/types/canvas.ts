/**
 * Participant/Painter in the leaderboard
 */
export interface Participant {
  /** Participant's wallet address */
  address: string;
  /** Number of pixels painted by this participant */
  paintedPixelCount: number;
  /** Total value of pixels painted by this participant */
  paintedPrice: number;
}

/**
 * Canvas information response interface
 */
export interface CanvasInfo {
  /** Total number of pixels painted on the canvas */
  paintedPixelCount: number;
  /** Total value of the canvas (BTC) */
  totalValue: number;
  /** List of painted pixel information */
  paintedPixelInfoList: PixelInfo[];
}

/**
 * Pixel information interface
 */
export interface PixelInfo {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Pixel color */
  color: string;
  /** Current pixel price */
  price: number;
}

/**
 * Combined API response (if both are integrated)
 */
export interface CanvasDataResponse {
  /** Canvas information */
  canvasInfo: CanvasInfo;
  /** Participants leaderboard */
  participants: Participant[];
}
