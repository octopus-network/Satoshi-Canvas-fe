import { toast } from "sonner";
import i18n from "@/i18n";
import type {
  PixelData,
  ImageImportConfig,
  ProcessedImageData,
  CanvasSize,
  Offset,
  MousePosition,
  PixelCoordinates,
} from "./types";

// 复制坐标到剪贴板
export const copyCoordinateToClipboard = async (x: number, y: number) => {
  const coordText = `${x},${y}`;
  try {
    await navigator.clipboard.writeText(coordText);
    toast.success(i18n.t("toast.coordinateCopied"), {
      description: i18n.t("toast.currentCoordinate", { x, y }),
      duration: 2000,
    });
  } catch (err) {
    // 如果剪贴板API不可用，尝试使用传统方法
    const textArea = document.createElement("textarea");
    textArea.value = coordText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success(i18n.t("toast.coordinateCopied"), {
        description: i18n.t("toast.currentCoordinate", { x, y }),
        duration: 2000,
      });
    } catch {
      toast.error(i18n.t("toast.copyFailed"));
    }
    document.body.removeChild(textArea);
  }
};

// 验证并处理16进制颜色
export const validateAndApplyHexColor = (
  value: string,
  currentColor: string
): string => {
  const trimmedValue = value.trim();

  // 如果输入为空，恢复到当前颜色
  if (!trimmedValue) {
    return currentColor;
  }

  // 确保以#开头
  let hexValue = trimmedValue.startsWith("#")
    ? trimmedValue
    : `#${trimmedValue}`;

  // 支持3位16进制颜色（如#RGB -> #RRGGBB）
  if (/^#[0-9A-Fa-f]{3}$/.test(hexValue)) {
    const [r, g, b] = hexValue.slice(1);
    hexValue = `#${r}${r}${g}${g}${b}${b}`;
  }

  // 验证6位16进制颜色格式
  if (/^#[0-9A-Fa-f]{6}$/.test(hexValue)) {
    return hexValue.toUpperCase();
  } else {
    // 如果验证失败，恢复到当前颜色
    return currentColor;
  }
};

// 获取鼠标在画布中的坐标
export const getCanvasCoordinates = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  scale: number,
  offset: Offset
): MousePosition => {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / scale - offset.x;
  const y = (clientY - rect.top) / scale - offset.y;
  return { x, y };
};

// 获取像素坐标
export const getPixelCoordinates = (
  canvasX: number,
  canvasY: number,
  pixelSize: number,
  gridSize: number
): PixelCoordinates | null => {
  const pixelX = Math.floor(canvasX / pixelSize);
  const pixelY = Math.floor(canvasY / pixelSize);

  if (pixelX >= 0 && pixelX < gridSize && pixelY >= 0 && pixelY < gridSize) {
    return { pixelX, pixelY };
  }
  return null;
};

// 提取图片像素数据
export const extractImagePixels = (
  img: HTMLImageElement,
  config: ImageImportConfig,
  gridSize: number
): ProcessedImageData => {
  // 创建临时canvas用于图片处理（仅创建可见裁剪区域大小，避免巨型内存分配）
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    return {
      pixels: [],
      originalWidth: 0,
      originalHeight: 0,
      scaledWidth: 0,
      scaledHeight: 0,
    };
  }

  const scaledWidth = Math.floor(img.width * config.scale);
  const scaledHeight = Math.floor(img.height * config.scale);

  // 计算缩放后图片与画布(grid)的相交区域（在缩放坐标系中）
  const visibleXStart = Math.max(0, -config.offsetX);
  const visibleYStart = Math.max(0, -config.offsetY);
  const visibleXEnd = Math.min(scaledWidth, gridSize - config.offsetX);
  const visibleYEnd = Math.min(scaledHeight, gridSize - config.offsetY);

  const cropWidth = Math.max(0, visibleXEnd - visibleXStart);
  const cropHeight = Math.max(0, visibleYEnd - visibleYStart);

  // 若无相交，直接返回基本信息
  if (cropWidth === 0 || cropHeight === 0) {
    return {
      pixels: [],
      originalWidth: img.width,
      originalHeight: img.height,
      scaledWidth,
      scaledHeight,
    };
  }

  // 仅创建相交区域大小的画布，避免 OOM
  tempCanvas.width = cropWidth;
  tempCanvas.height = cropHeight;

  // 将原图按比例裁剪并缩放绘制到临时画布
  // 这里将缩放后相交区域 [visibleXStart, visibleYStart, cropWidth, cropHeight]
  // 映射回原图坐标系做局部 drawImage，再缩放到目标大小
  const srcX = Math.max(0, Math.floor(visibleXStart / config.scale));
  const srcY = Math.max(0, Math.floor(visibleYStart / config.scale));
  const srcW = Math.max(
    1,
    Math.min(img.width - srcX, Math.ceil(cropWidth / config.scale))
  );
  const srcH = Math.max(
    1,
    Math.min(img.height - srcY, Math.ceil(cropHeight / config.scale))
  );

  tempCtx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, cropWidth, cropHeight);

  // 读取像素数据（仅相交区域）
  let imageData: ImageData;
  try {
    imageData = tempCtx.getImageData(0, 0, cropWidth, cropHeight);
  } catch (err) {
    console.error("getImageData failed:", err);
    // 极端情况下（比如内存不足），优雅降级：返回空像素，保留尺寸信息
    return {
      pixels: [],
      originalWidth: img.width,
      originalHeight: img.height,
      scaledWidth,
      scaledHeight,
    };
  }

  const pixels: PixelData[] = [];

  // 转换像素数据（将临时画布像素映射到画布坐标系）
  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const index = (y * cropWidth + x) * 4;
      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      const a = imageData.data[index + 3];

      if (a > 0) {
        const alpha = (a / 255) * config.opacity;
        if (alpha > 0.1) {
          const canvasX = x + visibleXStart + config.offsetX;
          const canvasY = y + visibleYStart + config.offsetY;

          // 额外防御：确保像素在画布范围内
          if (
            canvasX >= 0 &&
            canvasX < gridSize &&
            canvasY >= 0 &&
            canvasY < gridSize
          ) {
            const finalR = Math.round(r * alpha + 255 * (1 - alpha));
            const finalG = Math.round(g * alpha + 255 * (1 - alpha));
            const finalB = Math.round(b * alpha + 255 * (1 - alpha));

            const color = `#${finalR
              .toString(16)
              .padStart(2, "0")}${finalG.toString(16).padStart(2, "0")}${finalB
              .toString(16)
              .padStart(2, "0")}`.toUpperCase();

            pixels.push({
              x: canvasX,
              y: canvasY,
              color,
            });
          }
        }
      }
    }
  }

  return {
    pixels,
    originalWidth: img.width,
    originalHeight: img.height,
    scaledWidth,
    scaledHeight,
  };
};

// 图片导入配置验证函数
export const validateScale = (value: string): boolean => {
  const numValue = parseFloat(value);
  return !isNaN(numValue) && numValue >= 0.01 && numValue <= 10;
};

export const validateOffsetX = (
  value: string,
  scaledWidth: number,
  gridSize: number
): boolean => {
  const numValue = parseInt(value);
  const minVal = -Math.floor(scaledWidth / 2);
  const maxVal = gridSize;
  return !isNaN(numValue) && numValue >= minVal && numValue <= maxVal;
};

export const validateOffsetY = (
  value: string,
  scaledHeight: number,
  gridSize: number
): boolean => {
  const numValue = parseInt(value);
  const minVal = -Math.floor(scaledHeight / 2);
  const maxVal = gridSize;
  return !isNaN(numValue) && numValue >= minVal && numValue <= maxVal;
};

export const validateOpacity = (value: string): boolean => {
  const numValue = parseInt(value);
  return !isNaN(numValue) && numValue >= 1 && numValue <= 100;
};

// 计算以鼠标位置为中心的缩放
export const calculateMouseCenteredZoom = (
  mouseX: number,
  mouseY: number,
  currentScale: number,
  currentOffset: Offset,
  scaleFactor: number,
  minScale: number,
  maxScale: number
): { scale: number; offset: Offset } => {
  // 计算缩放前鼠标指向的世界坐标
  const worldX = mouseX / currentScale - currentOffset.x;
  const worldY = mouseY / currentScale - currentOffset.y;

  // 计算新的缩放比例
  const newScale = Math.max(
    minScale,
    Math.min(maxScale, currentScale * scaleFactor)
  );

  // 计算新的偏移量，保持鼠标指向的世界坐标在屏幕上的位置不变
  const newOffset = {
    x: mouseX / newScale - worldX,
    y: mouseY / newScale - worldY,
  };

  return { scale: newScale, offset: newOffset };
};

// 计算以画布中心为基准的缩放
export const calculateCenterZoom = (
  canvasSize: CanvasSize,
  currentScale: number,
  currentOffset: Offset,
  scaleFactor: number,
  minScale: number,
  maxScale: number
): { scale: number; offset: Offset } => {
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;

  // 计算中心点的世界坐标
  const worldX = centerX / currentScale - currentOffset.x;
  const worldY = centerY / currentScale - currentOffset.y;

  const newScale = Math.max(
    minScale,
    Math.min(maxScale, currentScale * scaleFactor)
  );

  // 计算新的偏移量，保持中心点位置不变
  const newOffset = {
    x: centerX / newScale - worldX,
    y: centerY / newScale - worldY,
  };

  return { scale: newScale, offset: newOffset };
};

// 基于目标缩放值的中心缩放（用于按预设跳转）
export const calculateCenterZoomToTargetScale = (
  canvasSize: CanvasSize,
  currentScale: number,
  currentOffset: Offset,
  targetScale: number,
  minScale: number,
  maxScale: number
): { scale: number; offset: Offset } => {
  const centerX = canvasSize.width / 2;
  const centerY = canvasSize.height / 2;

  const worldX = centerX / currentScale - currentOffset.x;
  const worldY = centerY / currentScale - currentOffset.y;

  const newScale = Math.max(minScale, Math.min(maxScale, targetScale));

  const newOffset = {
    x: centerX / newScale - worldX,
    y: centerY / newScale - worldY,
  };

  return { scale: newScale, offset: newOffset };
};

// 颜色转换工具函数

// RGB转HSV
export const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  r = r / 255;
  g = g / 255;
  b = b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const v = max;

  if (delta !== 0) {
    s = delta / max;

    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }
    h = h * 60;
    if (h < 0) h += 360;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
};

// HSV转RGB
export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  s = s / 100;
  v = v / 100;
  h = h / 60;

  const c = v * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = v - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (0 <= h && h < 1) {
    r = c; g = x; b = 0;
  } else if (1 <= h && h < 2) {
    r = x; g = c; b = 0;
  } else if (2 <= h && h < 3) {
    r = 0; g = c; b = x;
  } else if (3 <= h && h < 4) {
    r = 0; g = x; b = c;
  } else if (4 <= h && h < 5) {
    r = x; g = 0; b = c;
  } else if (5 <= h && h < 6) {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
};

// HEX转RGB
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// RGB转HEX
export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
};

// HEX转HSV
export const hexToHsv = (hex: string): { h: number; s: number; v: number } | null => {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsv(rgb.r, rgb.g, rgb.b) : null;
};

// HSV转HEX
export const hsvToHex = (h: number, s: number, v: number): string => {
  const rgb = hsvToRgb(h, s, v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
};