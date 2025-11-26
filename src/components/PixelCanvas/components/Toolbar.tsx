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

  // Dialog states for tooltip control
  isImportDialogOpen?: boolean;
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
  isImportDialogOpen = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [disableClearTooltip, setDisableClearTooltip] = useState(false);
  const [disableImportTooltip, setDisableImportTooltip] = useState(false);
  const { t } = useTranslation();

  // 当import dialog关闭后，暂时禁用tooltip，防止自动显示（无论是确认还是取消）
  const prevImportDialogOpenRef = useRef(isImportDialogOpen);
  const importButtonRef = useRef<HTMLButtonElement | null>(null);
  const importTooltipTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const wasOpen = prevImportDialogOpenRef.current;
    const isNowOpen = isImportDialogOpen;
    
    // 清除之前的timer
    if (importTooltipTimerRef.current) {
      clearTimeout(importTooltipTimerRef.current);
      importTooltipTimerRef.current = null;
    }
    
    // 当dialog打开时，禁用tooltip
    if (isNowOpen) {
      setDisableImportTooltip(true);
    }
    // 当dialog从打开变为关闭时，继续禁用tooltip
    // 设置一个最大延迟时间，即使鼠标不离开也会恢复
    else if (wasOpen && !isNowOpen) {
      setDisableImportTooltip(true);
      // 设置最大延迟时间（3秒），如果用户鼠标一直不离开，也会恢复
      importTooltipTimerRef.current = setTimeout(() => {
        setDisableImportTooltip(false);
        importTooltipTimerRef.current = null;
      }, 3000);
    }
    
    // 更新ref以跟踪当前状态
    prevImportDialogOpenRef.current = isNowOpen;
    
    return () => {
      if (importTooltipTimerRef.current) {
        clearTimeout(importTooltipTimerRef.current);
        importTooltipTimerRef.current = null;
      }
    };
  }, [isImportDialogOpen]);
  
  // 处理鼠标离开import按钮
  const handleImportButtonMouseLeave = () => {
    // 如果dialog已关闭且tooltip被禁用，则恢复tooltip
    if (!isImportDialogOpen && disableImportTooltip) {
      // 清除最大延迟timer
      if (importTooltipTimerRef.current) {
        clearTimeout(importTooltipTimerRef.current);
        importTooltipTimerRef.current = null;
      }
      // 延迟一点时间再恢复，确保鼠标真的离开了
      setTimeout(() => {
        setDisableImportTooltip(false);
      }, 100);
    }
  };

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
        <div className="w-full flex flex-nowrap gap-2 sm:gap-4 items-center bg-muted/50 p-2 sm:p-4 border-2 border-border pixel-shadow" style={{ borderRadius: "var(--radius)" }}>
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
            <span className="text-xs sm:text-sm font-medium text-foreground hidden sm:inline">
              {t("pages.canvas.toolbar.mode")}
            </span>
            <div className="flex border-2 border-border bg-background p-1 pixel-shadow-sm" style={{ borderRadius: "var(--radius-sm)" }}>
              <TooltipProvider>
                <Tooltip delayDuration={350}>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex items-center justify-center w-8 h-8 transition-all duration-200 cursor-pointer mr-1 border-2 ${
                        drawingMode === "draw"
                          ? "bg-primary text-primary-foreground border-primary pixel-shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                      }`}
                      style={{ borderRadius: "var(--radius-sm)" }}
                      onClick={() => onDrawingModeChange("draw")}
                      type="button"
                    >
                      <Pencil className="w-4 h-4 pixel-icon" />
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
                      className={`flex items-center justify-center w-8 h-8 transition-all duration-200 cursor-pointer mr-1 border-2 ${
                        drawingMode === "picker"
                          ? "bg-primary text-primary-foreground border-primary pixel-shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                      }`}
                      style={{ borderRadius: "var(--radius-sm)" }}
                      onClick={() => onDrawingModeChange("picker")}
                      type="button"
                    >
                      <Pipette className="w-4 h-4 pixel-icon" />
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
                      className={`flex items-center justify-center w-8 h-8 transition-all duration-200 cursor-pointer border-2 ${
                        drawingMode === "inspect"
                          ? "bg-primary text-primary-foreground border-primary pixel-shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                      }`}
                      style={{ borderRadius: "var(--radius-sm)" }}
                      onClick={() => onDrawingModeChange("inspect")}
                      type="button"
                    >
                      <Search className="w-4 h-4 pixel-icon" />
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
            <Tooltip 
              delayDuration={350}
              open={isImportDialogOpen || disableImportTooltip ? false : undefined}
            >
              <TooltipTrigger asChild>
                <Button
                  ref={importButtonRef}
                  className="cursor-pointer"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fileInputRef.current?.click();
                    // 点击时暂时禁用tooltip，防止在文件选择对话框打开时显示
                    // useEffect会在dialog关闭时处理tooltip的禁用
                  }}
                  onMouseLeave={handleImportButtonMouseLeave}
                >
                  <ImagePlus className="w-4 h-4 mr-1 pixel-icon" />
                  {t("pages.canvas.toolbar.importImage")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("pages.canvas.toolbar.importTip")}</p>
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
              <AlertDialog 
                open={isClearDialogOpen} 
                onOpenChange={(open) => {
                  setIsClearDialogOpen(open);
                  // 当对话框关闭时（无论是确认还是取消），暂时禁用tooltip
                  if (!open) {
                    setDisableClearTooltip(true);
                    setTimeout(() => setDisableClearTooltip(false), 500);
                  }
                }}
              >
                <Tooltip 
                  delayDuration={350} 
                  open={isClearDialogOpen || disableClearTooltip ? false : undefined}
                >
                  <TooltipTrigger asChild>
                    <div>
                      <AlertDialogTrigger asChild>
                        <Button
                          className="cursor-pointer"
                          variant="destructive"
                          size="sm"
                        >
                          <Trash className="w-4 h-4 mr-1 pixel-icon" />
                          {t("pages.canvas.toolbar.clearUser")}
                        </Button>
                      </AlertDialogTrigger>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t("pages.canvas.toolbar.clearUserTip")}</p>
                  </TooltipContent>
                </Tooltip>
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
                    <AlertDialogAction
                      onClick={() => {
                        onClearUserDrawing();
                        setIsClearDialogOpen(false);
                      }}
                    >
                      {t("pages.canvas.toolbar.clearUser")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                    <Download className="w-4 h-4 mr-1 pixel-icon" />
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
