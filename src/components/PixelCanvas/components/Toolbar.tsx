import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pencil,
  Eraser,
  ImagePlus,
  LocateFixed,
  Grid3X3,
  File,
  Pipette,
  Trash,
} from "lucide-react";
import { Download } from "lucide-react";
import { Undo2, Redo2 } from "lucide-react";
import type { DrawingMode } from "../types";
import { ColorPicker } from "./ColorPicker";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  // 网格相关
  gridSize: 100 | 1000;
  onGridSizeChange?: (size: 100 | 1000) => void;

  // 颜色相关
  currentColor: string;
  onColorChange: (color: string) => void;
  recentColors: string[];
  onAddToRecentColors: (color: string) => void;

  // 绘制模式
  drawingMode: DrawingMode;
  onDrawingModeChange: (mode: DrawingMode) => void;

  // 图片导入
  onImageFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // 网格显示
  showGrid: boolean;
  onToggleGrid: () => void;

  // 历史操作
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // 操作按钮
  onClearCanvas: () => void;
  onClearUserDrawing: () => void;

  // 导出
  onExportPNG?: () => void;

  // 大数据量测试（已迁移到功能测试面板，保留类型兼容不使用）
  onImportLargeTest?: (size: number) => void;
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
  showGrid,
  onToggleGrid,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearUserDrawing,
  onExportPNG,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto flex flex-nowrap gap-4 items-center bg-muted/50 p-4 rounded-lg border border-border">
        {/* 全局隐藏文件输入，保证 Dropdown 关闭后仍可触发 change */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageFileSelect}
          className="hidden"
        />

        {/* 绘制模式选择 */}
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
                      drawingMode === "erase"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => onDrawingModeChange("erase")}
                    type="button"
                  >
                    <Eraser className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("pages.canvas.toolbar.modeErase")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip delayDuration={350}>
                <TooltipTrigger asChild>
                  <button
                    className={`flex items-center justify-center w-8 h-8 rounded transition-all duration-200 cursor-pointer ${
                      drawingMode === "locate"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => onDrawingModeChange("locate")}
                    type="button"
                  >
                    <LocateFixed className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("pages.canvas.toolbar.modeLocate")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip delayDuration={350}>
                <TooltipTrigger asChild>
                  <button
                    className={`flex items-center justify-center w-8 h-8 rounded transition-all duration-200 cursor-pointer ${
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
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 颜色选择 */}
        <ColorPicker
          currentColor={currentColor}
          onColorChange={onColorChange}
          recentColors={recentColors}
          onAddToRecentColors={onAddToRecentColors}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* 网格显示控制（外露） */}
        <div className="flex gap-2 items-center">
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
        </div>

        <Separator orientation="vertical" className="h-6" />
        <Separator orientation="vertical" className="h-6" />

        {/* 历史（撤销/重做） */}
        <div className="flex gap-2 items-center">
          <span className="text-sm font-medium text-foreground">
            {t("pages.canvas.toolbar.history")}
          </span>
          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="w-4 h-4 mr-0.5" />
                  {t("pages.canvas.toolbar.undo")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("pages.canvas.toolbar.undoTip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip delayDuration={350}>
              <TooltipTrigger>
                <Button
                  className="cursor-pointer"
                  variant="outline"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="w-4 h-4 mr-0.5" />
                  {t("pages.canvas.toolbar.redo")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("pages.canvas.toolbar.redoTip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* 操作按钮（清理） */}
        <div className="flex gap-2">
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

        <Separator orientation="vertical" className="h-6" />

        {/* 文件操作（DropdownMenu） */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button className="cursor-pointer" variant="outline" size="sm">
              <File className="w-4 h-4 mr-1" />
              {t("pages.canvas.toolbar.fileOps")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="p-1">
            <DropdownMenuItem asChild>
              <button
                className="flex w-full items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="w-4 h-4" />
                {t("pages.canvas.toolbar.importImage")}
              </button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <button
                className="flex w-full items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent text-sm"
                onClick={onExportPNG}
              >
                <Download className="w-4 h-4" />
                {t("pages.canvas.toolbar.saveImage")}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
