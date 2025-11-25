import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pencil,
  ImagePlus,
  // Grid3X3,
  Pipette,
  Trash,
  Search,
  Download,
} from "lucide-react";
import type { DrawingMode } from "../types";
import { ColorPicker } from "./ColorPicker";
import { useTranslation } from "react-i18next";
import { PIXEL_LIMIT } from "../constants";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ToolbarProps {
  // Grid related
  gridSize: number;
  onGridSizeChange?: (size: number) => void;

  // Color related
  currentColor: string;
  onColorChange: (color: string) => void;
  recentColors: string[];
  onAddToRecentColors: (color: string) => void;

  // Drawing mode
  drawingMode: DrawingMode;
  onDrawingModeChange: (mode: DrawingMode) => void;

  // Image import
  onImageFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // Grid display
  showGrid: boolean;
  onToggleGrid: () => void;

  // History operations
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Action buttons
  onClearCanvas: () => void;
  onClearUserDrawing: () => void;

  // Export
  onExportPNG?: () => void;
  onExport?: () => void;

  // Large data testing (migrated to feature test panel, kept for type compatibility)
  onImportLargeTest?: (size: number) => void;

  // Pixel limit info
  currentUserPixelCount?: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  // gridSize,
  // onGridSizeChange,
  currentColor,
  onColorChange,
  recentColors,
  onAddToRecentColors,
  drawingMode,
  onDrawingModeChange,
  onImageFileSelect,
  // showGrid,
  // onToggleGrid,
  // onUndo,
  // onRedo,
  // canUndo,
  // canRedo,
  onClearUserDrawing,
  onExport,
  // onExportPNG, // Export function removed
  currentUserPixelCount = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const viewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement | null;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      // Map vertical scroll to horizontal scroll and prevent default elastic scroll
      const delta = (e.deltaY || 0) + (e.deltaX || 0);
      if (delta !== 0) {
        e.preventDefault();
        viewport.scrollLeft += delta;
      }
    };

    const updateFades = () => {
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
      const current = viewport.scrollLeft;
      setShowLeftFade(current > 1);
      setShowRightFade(maxScrollLeft > 0 && current < maxScrollLeft - 1);
    };

    const handleScroll = () => updateFades();
    const resizeObserver = new ResizeObserver(() => updateFades());

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    viewport.addEventListener("scroll", handleScroll, { passive: true });
    resizeObserver.observe(viewport);
    if (viewport.firstElementChild) {
      resizeObserver.observe(viewport.firstElementChild as Element);
    }
    // Initialize once
    updateFades();

    return () => {
      viewport.removeEventListener("wheel", handleWheel as EventListener);
      viewport.removeEventListener("scroll", handleScroll as EventListener);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="w-full relative" ref={containerRef}>
      <ScrollArea
        className="w-full overscroll-none"
        viewportClassName="overscroll-none"
      >
        <div className="w-full flex flex-nowrap gap-4 items-center bg-muted/50 p-4 rounded-lg border border-border">
          {/* Global hidden file input, ensure change can still be triggered after Dropdown closes */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onImageFileSelect}
            className="hidden"
          />

          {/* Drawing mode selection */}
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-foreground">
              {t("pages.canvas.toolbar.mode")}
            </span>
            <div className="flex rounded-md border border-border bg-background p-1">
              <TooltipProvider>
                <Tooltip delayDuration={350}>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex items-center justify-center w-8 h-8 rounded transition-all duration-200 cursor-pointer mr-1 ${
                        drawingMode === "draw"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => onDrawingModeChange("draw")}
                      type="button"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("pages.canvas.toolbar.modeDraw")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip delayDuration={350}>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex items-center justify-center w-8 h-8 rounded transition-all duration-200 cursor-pointer mr-1 ${
                        drawingMode === "picker"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => onDrawingModeChange("picker")}
                      type="button"
                    >
                      <Pipette className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("pages.canvas.toolbar.modePicker")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip delayDuration={350}>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex items-center justify-center w-8 h-8 rounded transition-all duration-200 cursor-pointer ${
                        drawingMode === "inspect"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                      onClick={() => onDrawingModeChange("inspect")}
                      type="button"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("pages.canvas.toolbar.modeInspect")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Color selection */}
          <ColorPicker
            currentColor={currentColor}
            onColorChange={onColorChange}
            recentColors={recentColors}
            onAddToRecentColors={onAddToRecentColors}
          />

          <Separator orientation="vertical" className="h-6" />

          {/* Image import button */}
          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger asChild>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-4 h-4 mr-1" />
                  {t("pages.canvas.toolbar.importImage")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("pages.canvas.toolbar.importImage")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Grid display control (exposed) */}
          {/* <div className="flex gap-2 items-center">
            <span className="text-sm font-medium text-foreground">
              {t("pages.canvas.toolbar.grid")}
            </span>
            <TooltipProvider>
              <Tooltip delayDuration={350}>
                <TooltipTrigger>
                  <Button
                    className="cursor-pointer min-w-22"
                    variant={showGrid ? "default" : "outline"}
                    size="sm"
                    onClick={onToggleGrid}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="ml-1">
                      {showGrid
                        ? t("pages.canvas.toolbar.hide")
                        : t("pages.canvas.toolbar.show")}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {showGrid
                      ? t("pages.canvas.toolbar.hideGrid")
                      : t("pages.canvas.toolbar.showGrid")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div> */}

          <Separator orientation="vertical" className="h-6" />

          {/* Action buttons (cleanup) */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip delayDuration={350}>
                <TooltipTrigger asChild>
                  <div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="cursor-pointer"
                          variant="destructive"
                          size="sm"
                        >
                          <Trash className="w-4 h-4 mr-1" />
                          {t("pages.canvas.toolbar.clearUser")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("pages.canvas.toolbar.confirmClearUserTitle")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("pages.canvas.toolbar.confirmClearUserDesc")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={onClearUserDrawing}>
                            {t("pages.canvas.toolbar.clearUser")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("pages.canvas.toolbar.clearUserTip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip delayDuration={350}>
                <TooltipTrigger asChild>
                  <Button
                    className="cursor-pointer"
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    {t("pages.canvas.toolbar.export")}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("pages.canvas.toolbar.exportTip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Pixel limit info */}
          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 px-3 py-2 text-xs cursor-help hover:bg-muted/50 transition-colors rounded">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-muted-foreground text-[10px] leading-tight whitespace-nowrap">
                      {t("pages.canvas.toolbar.pixelUsageLabel")}
                    </span>
                    <span className="text-foreground font-semibold leading-tight whitespace-nowrap">
                      {t("pages.canvas.toolbar.pixelUsage", {
                        current: currentUserPixelCount.toLocaleString(),
                        max: PIXEL_LIMIT.MAX_PIXELS.toLocaleString(),
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div
                      className={`h-2.5 w-24 rounded-full bg-muted/50 overflow-hidden shadow-inner ${
                        currentUserPixelCount >= PIXEL_LIMIT.MAX_PIXELS
                          ? "bg-destructive/20"
                          : ""
                      }`}
                    >
                      <div
                        className={`h-full transition-all duration-300 ease-out ${
                          currentUserPixelCount >= PIXEL_LIMIT.MAX_PIXELS
                            ? "bg-destructive"
                            : currentUserPixelCount / PIXEL_LIMIT.MAX_PIXELS > 0.8
                            ? "bg-orange-500"
                            : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (currentUserPixelCount / PIXEL_LIMIT.MAX_PIXELS) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    {currentUserPixelCount >= PIXEL_LIMIT.MAX_PIXELS && (
                      <span className="text-destructive font-bold text-sm leading-none" title={t("pages.canvas.toolbar.pixelLimitReached")}>
                        ⚠
                      </span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <p className="text-sm leading-relaxed">
                  {t("pages.canvas.toolbar.pixelUsageTooltip", {
                    max: PIXEL_LIMIT.MAX_PIXELS.toLocaleString(),
                    current: currentUserPixelCount.toLocaleString(),
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="pr-4" />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-background to-transparent" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
};
