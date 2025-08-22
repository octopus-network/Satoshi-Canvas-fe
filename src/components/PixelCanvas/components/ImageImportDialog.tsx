import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon,
  Clipboard as ClipboardIcon,
  XIcon,
} from "lucide-react";
import type {
  ImageImportConfig,
  ProcessedImageData,
  InputValues,
} from "../types";
import { IMAGE_IMPORT } from "../constants";
import {
  validateScale,
  validateOffsetX,
  validateOffsetY,
  validateOpacity,
} from "../utils";
import { useTranslation } from "react-i18next";

interface ImageImportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImage: HTMLImageElement | null;
  config: ImageImportConfig;
  onConfigChange: (config: ImageImportConfig) => void;
  processedImageData: ProcessedImageData | null;
  gridSize: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImageImportDialog: React.FC<ImageImportDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedImage,
  config,
  onConfigChange,
  processedImageData,
  gridSize,
  onConfirm,
  onCancel,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [inputValues, setInputValues] = useState<InputValues>({
    scale: "1.000",
    offsetX: "0",
    offsetY: "0",
    opacity: "100",
  });
  const { t } = useTranslation();

  // 同步配置值到输入框
  useEffect(() => {
    if (selectedImage && isOpen) {
      setInputValues({
        scale: config.scale.toFixed(3),
        offsetX: config.offsetX.toString(),
        offsetY: config.offsetY.toString(),
        opacity: Math.round(config.opacity * 100).toString(),
      });
    }
  }, [config, selectedImage, isOpen]);

  // 在预览canvas上绘制图片预览
  useEffect(() => {
    if (!processedImageData || !isOpen) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 设置canvas尺寸
    const previewSize = IMAGE_IMPORT.PREVIEW_SIZE;
    canvas.width = previewSize;
    canvas.height = previewSize;

    // 清空画布
    ctx.clearRect(0, 0, previewSize, previewSize);

    // 计算缩放比例
    const scale = previewSize / gridSize;

    // 绘制网格背景
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;
    for (
      let i = 0;
      i <= gridSize;
      i += Math.max(1, Math.floor(gridSize / 20))
    ) {
      const pos = i * scale;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, previewSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(previewSize, pos);
      ctx.stroke();
    }

    // 绘制导入的像素
    processedImageData.pixels.forEach(({ x, y, color }) => {
      ctx.fillStyle = color;
      ctx.fillRect(
        x * scale,
        y * scale,
        Math.max(1, scale),
        Math.max(1, scale)
      );
    });

    // 绘制边框
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      config.offsetX * scale,
      config.offsetY * scale,
      processedImageData.scaledWidth * scale,
      processedImageData.scaledHeight * scale
    );
  }, [processedImageData, config, gridSize, isOpen]);

  // 验证和应用函数
  const validateAndApplyScale = useCallback(
    (value: string) => {
      const numValue = parseFloat(value);
      if (validateScale(value)) {
        onConfigChange({ ...config, scale: numValue });
        return true;
      }
      return false;
    },
    [config, onConfigChange]
  );

  const validateAndApplyOffsetX = useCallback(
    (value: string) => {
      if (!processedImageData) return false;
      const numValue = parseInt(value);
      if (validateOffsetX(value, processedImageData.scaledWidth, gridSize)) {
        onConfigChange({ ...config, offsetX: numValue });
        return true;
      }
      return false;
    },
    [config, onConfigChange, processedImageData, gridSize]
  );

  const validateAndApplyOffsetY = useCallback(
    (value: string) => {
      if (!processedImageData) return false;
      const numValue = parseInt(value);
      if (validateOffsetY(value, processedImageData.scaledHeight, gridSize)) {
        onConfigChange({ ...config, offsetY: numValue });
        return true;
      }
      return false;
    },
    [config, onConfigChange, processedImageData, gridSize]
  );

  const validateAndApplyOpacity = useCallback(
    (value: string) => {
      const numValue = parseInt(value);
      if (validateOpacity(value)) {
        onConfigChange({ ...config, opacity: numValue / 100 });
        return true;
      }
      return false;
    },
    [config, onConfigChange]
  );

  // 处理输入框键盘事件
  const handleInputKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      type: "scale" | "offsetX" | "offsetY" | "opacity"
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        let isValid = false;

        switch (type) {
          case "scale":
            isValid = validateAndApplyScale(target.value);
            break;
          case "offsetX":
            isValid = validateAndApplyOffsetX(target.value);
            break;
          case "offsetY":
            isValid = validateAndApplyOffsetY(target.value);
            break;
          case "opacity":
            isValid = validateAndApplyOpacity(target.value);
            break;
        }

        if (!isValid) {
          // 恢复到当前有效值
          setInputValues((prev) => ({
            ...prev,
            [type]:
              type === "scale"
                ? config.scale.toFixed(3)
                : type === "opacity"
                  ? Math.round(config.opacity * 100).toString()
                  : type === "offsetX"
                    ? config.offsetX.toString()
                    : config.offsetY.toString(),
          }));
        }
        target.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        // 恢复到当前有效值
        setInputValues((prev) => ({
          ...prev,
          [type]:
            type === "scale"
              ? config.scale.toFixed(3)
              : type === "opacity"
                ? Math.round(config.opacity * 100).toString()
                : type === "offsetX"
                  ? config.offsetX.toString()
                  : config.offsetY.toString(),
        }));
        target.blur();
      }
    },
    [
      config,
      validateAndApplyScale,
      validateAndApplyOffsetX,
      validateAndApplyOffsetY,
      validateAndApplyOpacity,
    ]
  );

  // 处理输入框失去焦点
  const handleInputBlur = useCallback(
    (type: "scale" | "offsetX" | "offsetY" | "opacity", value: string) => {
      let isValid = false;

      switch (type) {
        case "scale":
          isValid = validateAndApplyScale(value);
          break;
        case "offsetX":
          isValid = validateAndApplyOffsetX(value);
          break;
        case "offsetY":
          isValid = validateAndApplyOffsetY(value);
          break;
        case "opacity":
          isValid = validateAndApplyOpacity(value);
          break;
      }

      if (!isValid) {
        // 恢复到当前有效值
        setInputValues((prev) => ({
          ...prev,
          [type]:
            type === "scale"
              ? config.scale.toFixed(3)
              : type === "opacity"
                ? Math.round(config.opacity * 100).toString()
                : type === "offsetX"
                  ? config.offsetX.toString()
                  : config.offsetY.toString(),
        }));
      }
    },
    [
      config,
      validateAndApplyScale,
      validateAndApplyOffsetX,
      validateAndApplyOffsetY,
      validateAndApplyOpacity,
    ]
  );

  // 判断输入值是否有效
  const isInputValid = useCallback(
    (type: "scale" | "offsetX" | "offsetY" | "opacity", value: string) => {
      switch (type) {
        case "scale":
          return validateScale(value);
        case "offsetX":
          return processedImageData
            ? validateOffsetX(value, processedImageData.scaledWidth, gridSize)
            : true;
        case "offsetY":
          return processedImageData
            ? validateOffsetY(value, processedImageData.scaledHeight, gridSize)
            : true;
        case "opacity":
          return validateOpacity(value);
        default:
          return true;
      }
    },
    [processedImageData, gridSize]
  );

  // 从剪贴板导入坐标，格式示例：614,457
  const handlePasteCoordinates = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      const match = text.match(/(-?\d+)\s*,\s*(-?\d+)/);
      if (!match) return;
      const pastedX = parseInt(match[1], 10);
      const pastedY = parseInt(match[2], 10);
      if (isNaN(pastedX) || isNaN(pastedY)) return;
      if (!processedImageData) return;

      const minX = -Math.floor(processedImageData.scaledWidth / 2);
      const maxX = gridSize;
      const minY = -Math.floor(processedImageData.scaledHeight / 2);
      const maxY = gridSize;
      const clamp = (v: number, min: number, max: number) =>
        Math.min(Math.max(v, min), max);

      const newX = clamp(pastedX, minX, maxX);
      const newY = clamp(pastedY, minY, maxY);

      onConfigChange({ ...config, offsetX: newX, offsetY: newY });
      setInputValues((prev) => ({
        ...prev,
        offsetX: String(newX),
        offsetY: String(newY),
      }));
    } catch (err) {
      // ignore errors silently
    }
  }, [processedImageData, gridSize, onConfigChange, config]);

  if (!selectedImage || !processedImageData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-4xl h-[85vh] sm:h-[90vh] overflow-hidden p-0 gap-0 !flex !flex-col"
      >
        <div className="bg-background border-b px-6 py-4 flex items-center justify-between shrink-0">
          <DialogTitle>{t("pages.canvas.import.title")}</DialogTitle>
          <DialogClose className="ring-offset-background focus:ring-ring rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
            <Button variant="ghost" size="icon" className="cursor-pointer">
              <XIcon className="w-5 h-5" />
            </Button>
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：预览 */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">
                  {t("pages.canvas.import.preview")}
                </Label>
                <div className="mt-2 border border-border rounded-lg p-4 bg-card">
                  <canvas
                    ref={previewCanvasRef}
                    className="w-full max-w-[300px] mx-auto border border-border rounded"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {t("pages.canvas.import.previewHint")}
                  </p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>{t("pages.canvas.import.originalSize")}:</strong>{" "}
                  {processedImageData.originalWidth} ×{" "}
                  {processedImageData.originalHeight}
                </p>
                <p>
                  <strong>{t("pages.canvas.import.scaledSize")}:</strong>{" "}
                  {processedImageData.scaledWidth} ×{" "}
                  {processedImageData.scaledHeight}
                </p>
                <p>
                  <strong>{t("pages.canvas.import.pixelCount")}:</strong>{" "}
                  {processedImageData.pixels.length}
                </p>
                <p>
                  <strong>{t("pages.canvas.import.position")}:</strong> (
                  {config.offsetX}, {config.offsetY})
                </p>
              </div>
            </div>

            {/* 右侧：控制面板 */}
            <div className="space-y-6">
              {/* 缩放控制 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("pages.canvas.import.scale")}: {config.scale.toFixed(3)}x
                </Label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[config.scale]}
                    onValueChange={([value]: number[]) =>
                      onConfigChange({ ...config, scale: value })
                    }
                    min={0.01}
                    max={10}
                    step={0.01}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={inputValues.scale}
                    onChange={(e) => {
                      setInputValues((prev) => ({
                        ...prev,
                        scale: e.target.value,
                      }));
                    }}
                    onBlur={(e) => handleInputBlur("scale", e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, "scale")}
                    min={0.01}
                    max={10}
                    step={0.001}
                    placeholder="0.001-10.000"
                    className={`w-20 px-2 py-1 text-xs border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      isInputValid("scale", inputValues.scale)
                        ? "border-border"
                        : "border-red-500"
                    }`}
                  />
                  <span className="text-xs text-muted-foreground">x</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {IMAGE_IMPORT.SCALE_PRESETS.map((scaleValue) => (
                    <Button
                      key={scaleValue}
                      variant="outline"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto cursor-pointer"
                      onClick={() =>
                        onConfigChange({ ...config, scale: scaleValue })
                      }
                    >
                      {scaleValue}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* X轴偏移 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("pages.canvas.import.offsetX")}: {config.offsetX}
                </Label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[config.offsetX]}
                    onValueChange={([value]: number[]) =>
                      onConfigChange({ ...config, offsetX: value })
                    }
                    min={-Math.floor(processedImageData.scaledWidth / 2)}
                    max={gridSize}
                    step={1}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={config.offsetX}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const minVal = -Math.floor(
                        processedImageData.scaledWidth / 2
                      );
                      const maxVal = gridSize;
                      if (!isNaN(value) && value >= minVal && value <= maxVal) {
                        onConfigChange({ ...config, offsetX: value });
                      }
                    }}
                    min={-Math.floor(processedImageData.scaledWidth / 2)}
                    max={gridSize}
                    className="w-20 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
              </div>

              {/* Y轴偏移 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("pages.canvas.import.offsetY")}: {config.offsetY}
                </Label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[config.offsetY]}
                    onValueChange={([value]: number[]) =>
                      onConfigChange({ ...config, offsetY: value })
                    }
                    min={-Math.floor(processedImageData.scaledHeight / 2)}
                    max={gridSize}
                    step={1}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={config.offsetY}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      const minVal = -Math.floor(
                        processedImageData.scaledHeight / 2
                      );
                      const maxVal = gridSize;
                      if (!isNaN(value) && value >= minVal && value <= maxVal) {
                        onConfigChange({ ...config, offsetY: value });
                      }
                    }}
                    min={-Math.floor(processedImageData.scaledHeight / 2)}
                    max={gridSize}
                    className="w-20 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">px</span>
                </div>
              </div>

              {/* 从剪贴板导入坐标 */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasteCoordinates}
                  className="cursor-pointer"
                >
                  <ClipboardIcon className="w-4 h-4 mr-0.5" />
                  {t("pages.canvas.import.pasteFromClipboard")}
                </Button>
              </div>

              {/* 透明度控制 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("pages.canvas.import.opacity")}:{" "}
                  {Math.round(config.opacity * 100)}%
                </Label>
                <div className="flex gap-2 items-center">
                  <Slider
                    value={[config.opacity]}
                    onValueChange={([value]: number[]) =>
                      onConfigChange({ ...config, opacity: value })
                    }
                    min={0.01}
                    max={1}
                    step={0.01}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    value={Math.round(config.opacity * 100)}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1 && value <= 100) {
                        onConfigChange({ ...config, opacity: value / 100 });
                      }
                    }}
                    min={1}
                    max={100}
                    className="w-16 px-2 py-1 text-xs border border-border rounded bg-background text-foreground"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              {/* 快速位置设置 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t("pages.canvas.import.quickPosition")}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({ ...config, offsetX: 0, offsetY: 0 })
                    }
                  >
                    {t("pages.canvas.import.topLeft")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: Math.floor(
                          (gridSize - processedImageData.scaledWidth) / 2
                        ),
                        offsetY: 0,
                      })
                    }
                  >
                    {t("pages.canvas.import.topCenter")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: gridSize - processedImageData.scaledWidth,
                        offsetY: 0,
                      })
                    }
                  >
                    {t("pages.canvas.import.topRight")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: 0,
                        offsetY: Math.floor(
                          (gridSize - processedImageData.scaledHeight) / 2
                        ),
                      })
                    }
                  >
                    {t("pages.canvas.import.leftCenter")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: Math.floor(
                          (gridSize - processedImageData.scaledWidth) / 2
                        ),
                        offsetY: Math.floor(
                          (gridSize - processedImageData.scaledHeight) / 2
                        ),
                      })
                    }
                  >
                    {t("pages.canvas.import.center")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: gridSize - processedImageData.scaledWidth,
                        offsetY: Math.floor(
                          (gridSize - processedImageData.scaledHeight) / 2
                        ),
                      })
                    }
                  >
                    {t("pages.canvas.import.rightCenter")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: 0,
                        offsetY: gridSize - processedImageData.scaledHeight,
                      })
                    }
                  >
                    {t("pages.canvas.import.bottomLeft")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: Math.floor(
                          (gridSize - processedImageData.scaledWidth) / 2
                        ),
                        offsetY: gridSize - processedImageData.scaledHeight,
                      })
                    }
                  >
                    {t("pages.canvas.import.bottomCenter")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      onConfigChange({
                        ...config,
                        offsetX: gridSize - processedImageData.scaledWidth,
                        offsetY: gridSize - processedImageData.scaledHeight,
                      })
                    }
                  >
                    {t("pages.canvas.import.bottomRight")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-background border-t px-6 py-4 flex gap-2 justify-end shrink-0">
          <Button onClick={onConfirm} className="cursor-pointer">
            <ImageIcon className="w-4 h-4 mr-0.5" />
            {t("pages.canvas.import.confirm")}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            className="cursor-pointer"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
