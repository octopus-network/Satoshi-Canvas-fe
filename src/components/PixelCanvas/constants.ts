// 默认色卡颜色
export const DEFAULT_COLORS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#FFC0CB",
  "#A52A2A",
  "#808080",
  "#90EE90",
  "#FFB6C1",
  "#4CAF50",
  "#2196F3",
  "#FF9800",
  "#E91E63",
  "#9C27B0",
  "#673AB7",
  "#3F51B5",
  "#009688",
  "#795548",
];

// 缩放相关常量
export const ZOOM_LIMITS = {
  MIN: 0.1,
  MAX: 10,
  SCALE_FACTOR: 1.2, // 按钮缩放的倍率
} as const;

// 缩放倍率预设（按钮逐级缩放使用）
export const ZOOM_PRESETS = [
  0.1,
  0.125,
  0.25,
  0.3333,
  0.5,
  0.6667,
  0.75,
  1,
  1.25,
  1.5,
  2,
  3,
  4,
  5,
  6,
  8,
  10,
] as const;

// 图片导入相关常量
export const IMAGE_IMPORT = {
  MAX_RECENT_COLORS: 18,
  PREVIEW_SIZE: 300,
  SCALE_PRESETS: [0.1, 0.25, 0.5, 1, 2, 5],
  DEFAULT_CONFIG: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    opacity: 1,
  },
} as const;

// 画布相关常量
export const CANVAS = {
  MIN_HEIGHT: 400,
  DEFAULT_HEIGHT_VH: 60,
  MAX_HEIGHT_VH: 80,
  GRID_THRESHOLD_SCALE: 0.5, // 从2改为0.5，让网格在更小缩放时也显示
} as const;

// 默认像素大小
export const DEFAULT_PIXEL_SIZE = 4;
