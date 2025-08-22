import React, { useRef, useEffect, useState } from "react";
import type { DrawingMode, CanvasSize } from "../types";
import { useTranslation } from "react-i18next";

interface CanvasContainerProps {
  // Canvas引用
  canvasRef: React.RefObject<HTMLCanvasElement>;

  // 画布状态
  canvasSize: CanvasSize;
  onCanvasSizeChange: (size: CanvasSize) => void;

  // 鼠标事件
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;

  // 滚轮缩放
  onWheel: (e: WheelEvent) => void;

  // 绘制模式
  drawingMode: DrawingMode;

  // 当前悬停像素坐标
  currentHoverPixel: { x: number; y: number } | null;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  canvasRef,
  canvasSize,
  onCanvasSizeChange,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel,
  drawingMode,
  currentHoverPixel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const coordPanelRef = useRef<HTMLDivElement>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("left");
  const wasInsidePanelRef = useRef<boolean>(false);
  const lastSwitchAtRef = useRef<number>(0);
  const { t } = useTranslation();

  // 监听容器尺寸变化，自适应画布大小
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 初始化画布尺寸
    const initSize = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      if (width > 0 && height > 0) {
        onCanvasSizeChange({ width, height });
        canvas.width = width;
        canvas.height = height;
      }
    };

    // 立即执行一次初始化
    initSize();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          onCanvasSizeChange({ width, height });
          canvas.width = width;
          canvas.height = height;
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef, onCanvasSizeChange]);

  // 设置原生滚轮事件监听器 (passive: false)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (canvas && container) {
      // 为画布和容器添加原生滚轮事件监听器，设置 passive: false
      const options = { passive: false } as AddEventListenerOptions;

      canvas.addEventListener("wheel", onWheel, options);
      container.addEventListener("wheel", onWheel, options);

      return () => {
        canvas.removeEventListener("wheel", onWheel);
        container.removeEventListener("wheel", onWheel);
      };
    }
  }, [onWheel, canvasRef]);

  // 获取鼠标光标样式
  const getCursorStyle = () => {
    if (drawingMode === "erase") {
      return {
        cursor:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><rect x='2' y='8' width='12' height='8' rx='2' fill='%23ff6b6b' stroke='%23333' stroke-width='1'/><path d='M14 8L18 4' stroke='%23333' stroke-width='2' stroke-linecap='round'/></svg>\") 10 10, pointer",
      } as const;
    }
    if (drawingMode === "picker") {
      return {
        cursor:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'><path d='M3 17l4-4m0 0l1.5-1.5a2 2 0 0 1 2.83 0l.17.17a2 2 0 0 1 0 2.83L10 16m-3-3l9-9a2.12 2.12 0 0 1 3 3l-9 9m-3-3l3 3' stroke='white' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/><path d='M3 17l4-4m0 0l1.5-1.5a2 2 0 0 1 2.83 0l.17.17a2 2 0 0 1 0 2.83L10 16m-3-3l9-9a2.12 2.12 0 0 1 3 3l-9 9m-3-3l3 3' stroke='%23333' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/><circle cx='4' cy='16' r='1.5' fill='white'/><circle cx='4' cy='16' r='1' fill='%234f46e5'/></svg>\") 10 10, pointer",
      } as const;
    }
    if (drawingMode === "draw" || drawingMode === "locate") {
      return { cursor: "crosshair" } as const;
    }
    return { cursor: "pointer" } as const;
  };

  const getCanvasCursor = () => {
    switch (drawingMode) {
      case "draw":
      case "locate":
        return "cursor-crosshair";
      case "picker":
        return ""; // 由内联样式覆盖
      case "erase":
        return ""; // 由内联样式覆盖
      default:
        return "cursor-pointer";
    }
  };

  // 封装鼠标移动，检测是否进入面板区域，进入则切换到另一侧
  const handleMouseMove = (e: React.MouseEvent) => {
    onMouseMove(e);

    if (drawingMode !== "locate") return;
    const panelEl = coordPanelRef.current;
    if (!panelEl) return;

    const rect = panelEl.getBoundingClientRect();
    const { clientX, clientY } = e;
    const margin = 2; // 容错边距，减少边缘抖动
    const inside =
      clientX >= rect.left - margin &&
      clientX <= rect.right + margin &&
      clientY >= rect.top - margin &&
      clientY <= rect.bottom + margin;

    const now = Date.now();
    const cooldownMs = 150;

    if (
      inside &&
      !wasInsidePanelRef.current &&
      now - lastSwitchAtRef.current > cooldownMs
    ) {
      setPanelSide((side) => (side === "left" ? "right" : "left"));
      lastSwitchAtRef.current = now;
    }

    wasInsidePanelRef.current = inside;
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-0">
      {/* 画布容器 */}
      <div
        ref={containerRef}
        className="border border-border rounded-lg overflow-hidden bg-card w-full h-full min-h-[300px] relative"
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`w-full h-full ${getCanvasCursor()}`}
          style={{ ...getCursorStyle(), imageRendering: "pixelated" }}
          onMouseDown={onMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* 坐标显示 */}
        {drawingMode === "locate" && currentHoverPixel && (
          <div
            ref={coordPanelRef}
            className={`absolute top-2 ${panelSide === "left" ? "left-2" : "right-2"} bg-background/90 border border-border rounded-md px-3 py-2 text-sm font-mono shadow-lg pointer-events-none`}
          >
            <div className="text-xs text-muted-foreground mb-1">
              {t("pages.canvas.canvas.currentPosition")}
            </div>
            <div className="text-foreground">
              X: {currentHoverPixel.x}, Y: {currentHoverPixel.y}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {t("pages.canvas.canvas.clickToCopy")}
            </div>
          </div>
        )}
      </div>

      {/* 使用说明移除以便画布更大 */}
    </div>
  );
};
