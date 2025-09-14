import React, { useRef, useEffect, useState } from "react";
import type { DrawingMode, CanvasSize } from "../types";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface CanvasContainerProps {
  // Canvas reference
  canvasRef: React.RefObject<HTMLCanvasElement>;

  // Canvas state
  canvasSize: CanvasSize;
  onCanvasSizeChange: (size: CanvasSize) => void;

  // Mouse events
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;

  // Wheel zoom
  onWheel: (e: WheelEvent) => void;

  // Zoom control (floating panel)
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;

  // Drawing mode
  drawingMode: DrawingMode;

  // Current hover pixel coordinates
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
  scale,
  onZoomIn,
  onZoomOut,
  onResetView,
  drawingMode,
  currentHoverPixel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const coordPanelRef = useRef<HTMLDivElement>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("left");
  const wasInsidePanelRef = useRef<boolean>(false);
  const lastSwitchAtRef = useRef<number>(0);
  const { t } = useTranslation();
  const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
  const [isHoveringZoomPanel, setIsHoveringZoomPanel] = useState(false);

  // Listen for container size changes, adaptive canvas size
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Initialize canvas size
    const initSize = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      if (width > 0 && height > 0) {
        onCanvasSizeChange({ width, height });
        canvas.width = width;
        canvas.height = height;
      }
    };

    // Execute initialization immediately once
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

  // Set native wheel event listener (passive: false)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (canvas && container) {
      // Add native wheel event listeners for canvas and container, set passive: false
      const options = { passive: false } as AddEventListenerOptions;

      canvas.addEventListener("wheel", onWheel, options);
      container.addEventListener("wheel", onWheel, options);

      return () => {
        canvas.removeEventListener("wheel", onWheel);
        container.removeEventListener("wheel", onWheel);
      };
    }
  }, [onWheel, canvasRef]);

  // Get mouse cursor style
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
        return ""; // Overridden by inline style
      case "erase":
        return ""; // Overridden by inline style
      default:
        return "cursor-pointer";
    }
  };

  // Wrap mouse movement, detect if entering panel area, switch to other side if entered
  const handleMouseMove = (e: React.MouseEvent) => {
    onMouseMove(e);

    if (drawingMode !== "locate") return;
    const panelEl = coordPanelRef.current;
    if (!panelEl) return;

    const rect = panelEl.getBoundingClientRect();
    const { clientX, clientY } = e;
    const margin = 2; // Error tolerance margin, reduce edge jitter
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

  const handleCanvasMouseEnter = () => {
    setIsHoveringCanvas(true);
  };

  const handleCanvasMouseLeave = () => {
    setIsHoveringCanvas(false);
    onMouseLeave();
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full min-h-0">
      {/* Canvas container */}
      <div
        ref={containerRef}
        className="border border-border rounded-lg overflow-hidden bg-card w-full h-full relative"
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
          onMouseEnter={handleCanvasMouseEnter}
          onMouseLeave={handleCanvasMouseLeave}
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Zoom control floating window: only shown when canvas is hovered or panel itself is hovered */}
        <div
          className={`absolute bottom-2 left-2 z-10 transition-opacity duration-150 ${
            isHoveringCanvas || isHoveringZoomPanel
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }`}
          onMouseEnter={() => setIsHoveringZoomPanel(true)}
          onMouseLeave={() => setIsHoveringZoomPanel(false)}
        >
          <div className="bg-background/90 border border-border rounded-md shadow-lg px-2 py-2 flex items-center gap-2">
            <Button
              className="cursor-pointer"
              variant="outline"
              size="sm"
              onClick={onZoomOut}
            >
              -
            </Button>
            <span className="text-xs min-w-[48px] text-center text-foreground">
              {Math.round(scale * 100)}%
            </span>
            <Button
              className="cursor-pointer"
              variant="outline"
              size="sm"
              onClick={onZoomIn}
            >
              +
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              size="sm"
              onClick={onResetView}
            >
              {t("pages.canvas.toolbar.reset")}
            </Button>
          </div>
        </div>

        {/* Coordinate display */}
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
    </div>
  );
};
