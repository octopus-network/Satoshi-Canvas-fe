import React, {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

// 导入类型定义
import type {
  PixelCanvasProps,
  PixelCanvasRef,
  PixelData,
  DrawingOperation,
  DrawingMode,
  ImageImportConfig,
  ProcessedImageData,
  HistoryEntry,
} from "./types";

// 导入常量
import { DEFAULT_PIXEL_SIZE, IMAGE_IMPORT } from "./constants";

// 导入工具函数
import { extractImagePixels } from "./utils";

// 导入子组件
import { Toolbar } from "./components/Toolbar";
import { ImageImportDialog } from "./components/ImageImportDialog";
import { CanvasContainer } from "./components/CanvasContainer";
import { CanvasInfo } from "./components/CanvasInfo";
import { PurchaseDialog } from "./components/PurchaseDialog";

// 导入图标
import { ShoppingCart } from "lucide-react";

// 导入自定义hooks
import { useCanvasDrawing } from "./hooks/useCanvasDrawing";

const PixelCanvas = forwardRef<PixelCanvasRef, PixelCanvasProps>(
  (
    {
      gridSize,
      pixelSize = DEFAULT_PIXEL_SIZE,
      initialData,
      onDrawingChange,
      onUserPixelCountChange,
      canvasInfo,
    },
    ref
  ) => {
    // 画板状态 - 分离初始数据和用户数据
    const [initialPixels, setInitialPixels] = useState<Map<string, string>>(
      new Map()
    );
    const [userPixels, setUserPixels] = useState<Map<string, string>>(
      new Map()
    );
    const [currentColor, setCurrentColor] = useState("#000000");
    const [drawingMode, setDrawingMode] = useState<DrawingMode>("draw");
    const [currentHoverPixel, setCurrentHoverPixel] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [showGrid, setShowGrid] = useState(true);

    // 绘制操作记录
    const [drawingOperations, setDrawingOperations] = useState<
      DrawingOperation[]
    >([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // 最近使用的颜色
    const [recentColors, setRecentColors] = useState<string[]>([]);

    // 图片导入相关状态
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
      null
    );
    const [imageImportConfig, setImageImportConfig] =
      useState<ImageImportConfig>(IMAGE_IMPORT.DEFAULT_CONFIG);
    const [processedImageData, setProcessedImageData] =
      useState<ProcessedImageData | null>(null);

    // 视图状态
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [isViewInitialized, setIsViewInitialized] = useState(false);

    // 历史栈（仅针对用户层变更）
    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

    // 购买相关状态
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
    const [emptyPixelPrice] = useState(0.0005); // mock空白像素单价

    // 添加颜色到最近使用列表
    const addToRecentColors = useCallback((color: string) => {
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== color);
        return [color, ...filtered].slice(0, IMAGE_IMPORT.MAX_RECENT_COLORS);
      });
    }, []);

    // 取色器颜色选择处理
    const handleColorPicked = useCallback(
      (color: string) => {
        setCurrentColor(color);
        addToRecentColors(color);
      },
      [addToRecentColors]
    );

    // 使用画布绘制hook
    const {
      canvasRef,
      draw,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleWheelZoom,
      zoomIn,
      zoomOut,
      resetView,
      exportPNG,
    } = useCanvasDrawing({
      gridSize,
      pixelSize,
      scale,
      offset,
      canvasSize,
      showGrid,
      initialPixels,
      userPixels,
      drawingMode,
      currentColor,
      isInitialized,
      setScale,
      setOffset,
      setUserPixels,
      setDrawingOperations,
      setCurrentHoverPixel,
      onDrawingChange,
      onUserPixelCountChange,
      onHistoryEntry: (entry) => {
        // 新的笔触加入撤销栈并清空重做栈
        setUndoStack((prev) => [...prev, entry]);
        setRedoStack([]);
      },
      onColorPicked: handleColorPicked,
    });

    // 导出 PNG 按钮回调
    const handleExportPNG = useCallback(async () => {
      const blob = await exportPNG({ scale: 1, backgroundColor: null });
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date();
      const timestamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}_${String(today.getHours()).padStart(2, "0")}${String(today.getMinutes()).padStart(2, "0")}${String(today.getSeconds()).padStart(2, "0")}`;
      a.download = `pixel-canvas_${gridSize}x${gridSize}_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [exportPNG, gridSize]);

    // 颜色变更处理
    const handleColorChange = useCallback((color: string) => {
      setCurrentColor(color);
    }, []);

    // 数据导入方法
    const importData = useCallback(
      (data: PixelData[]) => {
        const newInitialPixels = new Map<string, string>();
        const newUserPixels = new Map<string, string>();
        data.forEach(({ x, y, color }) => {
          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const key = `${x},${y}`;
            newInitialPixels.set(key, color);
          }
        });
        setInitialPixels(newInitialPixels);
        setUserPixels(() => newUserPixels);
        setIsInitialized(true);
        setDrawingOperations([]);
        setUndoStack([]);
        setRedoStack([]);

        // 延迟调用回调，避免在状态更新过程中调用
        setTimeout(() => {
          onDrawingChange?.([]);
          onUserPixelCountChange?.(newUserPixels.size);
        }, 0);
      },
      [gridSize] // 只依赖gridSize
    );

    // 处理图片文件选择
    const handleImageFileSelect = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith("image/")) {
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            setSelectedImage(img);
            const maxSize = Math.min(gridSize * 0.5, 200);
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const newConfig = {
              scale: Math.max(0.01, Math.min(10, scale)),
              offsetX: Math.floor((gridSize - img.width * scale) / 2),
              offsetY: Math.floor((gridSize - img.height * scale) / 2),
              opacity: 1,
            };
            setImageImportConfig(newConfig);

            // 立即处理预览数据，避免初始空白
            const processed = extractImagePixels(img, newConfig, gridSize);
            setProcessedImageData(processed);

            setIsImportDialogOpen(true);
          };
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
        event.target.value = "";
      },
      [gridSize]
    );

    // 处理图片预览更新（用户调整配置时）
    useEffect(() => {
      if (selectedImage && isImportDialogOpen) {
        const processed = extractImagePixels(
          selectedImage,
          imageImportConfig,
          gridSize
        );
        setProcessedImageData(processed);
      }
    }, [imageImportConfig]); // 只在配置变化时更新

    // 确认图片导入
    const confirmImageImport = useCallback(() => {
      if (!processedImageData) return;

      // 计算新的用户像素数据
      const newUserPixels = new Map(userPixels);
      processedImageData.pixels.forEach(({ x, y, color }) => {
        const key = `${x},${y}`;
        newUserPixels.set(key, color);
      });

      // 更新用户像素数据
      setUserPixels(() => newUserPixels);

      // 延迟通知像素数量变化
      setTimeout(() => {
        onUserPixelCountChange?.(newUserPixels.size);
      }, 0);

      if (isInitialized) {
        const importOperations: DrawingOperation[] =
          processedImageData.pixels.map(({ x, y, color }) => ({
            x,
            y,
            color,
            timestamp: Date.now(),
            type: "draw" as const,
          }));

        // 更新绘制操作
        setDrawingOperations((prev) => {
          const updated = [...prev, ...importOperations];
          return updated;
        });

        // 延迟通知操作变化
        setTimeout(() => {
          setDrawingOperations((current) => {
            onDrawingChange?.(current);
            return current;
          });
        }, 0);

        // 写入历史栈：导入图片作为一个历史分组
        const changes: HistoryEntry["changes"] = processedImageData.pixels.map(
          ({ x, y, color }) => {
            const key = `${x},${y}`;
            return {
              key,
              before: userPixels.get(key),
              after: color,
            };
          }
        );
        const entry: HistoryEntry = {
          kind: "import",
          changes,
          operations: importOperations,
        };
        setUndoStack((prev) => [...prev, entry]);
        setRedoStack([]);
      }

      setIsImportDialogOpen(false);
      setSelectedImage(null);
      setProcessedImageData(null);
    }, [processedImageData, isInitialized, userPixels]); // 移除回调函数依赖

    // 取消图片导入
    const cancelImageImport = useCallback(() => {
      setIsImportDialogOpen(false);
      setSelectedImage(null);
      setProcessedImageData(null);
    }, []);

    // 清空画布
    const clearCanvas = useCallback(() => {
      setInitialPixels(new Map());
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      setDrawingOperations([]);
      // 清空后重新初始化，确保后续绘制操作能正常工作
      setIsInitialized(true);
      setUndoStack([]);
      setRedoStack([]);

      // 延迟调用回调，避免无限循环
      setTimeout(() => {
        onDrawingChange?.([]);
        onUserPixelCountChange?.(emptyUserPixels.size);
      }, 0);
    }, []); // 移除回调函数依赖

    // 清空用户绘制
    const clearUserDrawing = useCallback(() => {
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      setDrawingOperations([]);
      setUndoStack([]);
      setRedoStack([]);

      // 延迟调用回调，避免无限循环
      setTimeout(() => {
        onDrawingChange?.([]);
        onUserPixelCountChange?.(emptyUserPixels.size);
      }, 0);
    }, []); // 移除回调函数依赖

    // 撤销/重做实现（仅作用于用户层）
    const applyHistoryEntry = useCallback(
      (entry: HistoryEntry, direction: "undo" | "redo") => {
        // 应用变化到 userPixels
        const next = new Map(userPixels);
        entry.changes.forEach(({ key, before, after }) => {
          const value = direction === "undo" ? before : after;
          if (value == null) next.delete(key);
          else next.set(key, value);
        });
        setUserPixels(next);

        // 更新操作记录（仅更新展示用途，不做严格逆操作运算）
        setDrawingOperations((prev) => {
          const ops = entry.operations;
          if (direction === "undo") {
            // 撤销：附加一个反向的操作快照以供面板展示
            const reversed: DrawingOperation[] = ops.map((op) => ({
              x: op.x,
              y: op.y,
              color: op.color,
              timestamp: Date.now(),
              type: op.type === "draw" ? ("erase" as const) : ("draw" as const),
            }));
            const updated = [...prev, ...reversed];
            setTimeout(() => onDrawingChange?.(updated), 0);
            return updated;
          }
          // 重做：再附加原操作
          const redoOps: DrawingOperation[] = ops.map((op) => ({
            ...op,
            timestamp: Date.now(),
          }));
          const updated = [...prev, ...redoOps];
          setTimeout(() => onDrawingChange?.(updated), 0);
          return updated;
        });

        // 回调数量变化
        setTimeout(() => {
          onUserPixelCountChange?.(next.size);
        }, 0);
      },
      [userPixels, drawingOperations]
    );

    const undo = useCallback(() => {
      setUndoStack((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        applyHistoryEntry(last, "undo");
        setRedoStack((redoPrev) => [...redoPrev, last]);
        return prev.slice(0, -1);
      });
    }, [applyHistoryEntry]);

    const redo = useCallback(() => {
      setRedoStack((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        applyHistoryEntry(last, "redo");
        setUndoStack((undoPrev) => [...undoPrev, last]);
        return prev.slice(0, -1);
      });
    }, [applyHistoryEntry]);

    // 购买相关处理函数
    const handlePurchase = useCallback(() => {
      setIsPurchaseDialogOpen(true);
    }, []);

    const handlePurchaseConfirm = useCallback(async () => {
      setIsPurchaseLoading(true);

      // Mock购买过程，模拟异步操作
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsPurchaseLoading(false);
      setIsPurchaseDialogOpen(false);

      // TODO: 这里将来会调用实际的购买API
      console.log("购买完成！");
    }, []);

    // 获取用户绘制的像素数据
    const getUserPixelData = useCallback((): PixelData[] => {
      const pixelData: PixelData[] = [];
      userPixels.forEach((color, key) => {
        const [x, y] = key.split(",").map(Number);
        pixelData.push({ x, y, color });
      });
      return pixelData;
    }, [userPixels]);

    // 处理初始数据导入
    useEffect(() => {
      // 仅在初次挂载或传入了非空 initialData 时初始化，避免每次渲染都重置
      if (isInitialized) return;
      if (initialData && initialData.length > 0) {
        importData(initialData);
      } else {
        setIsInitialized(true);
        setDrawingOperations([]);
        setUndoStack([]);
        setRedoStack([]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, initialData]);

    // 初始化和重绘
    useEffect(() => {
      draw();
    }, [draw]);

    // 初始化视图位置（只执行一次）
    useEffect(() => {
      if (!isViewInitialized && canvasSize.width > 0 && canvasSize.height > 0) {
        resetView();
        setIsViewInitialized(true);
      }
    }, [canvasSize, isViewInitialized, resetView]);

    // 当画布容器尺寸改变时重新绘制（不重置视图）
    useEffect(() => {
      draw();
    }, [canvasSize, draw]);

    // 重置画布当网格大小改变时
    useEffect(() => {
      // 仅在 gridSize 变化时重置；initialData 不参与依赖，避免父组件传入 [] 导致反复重置
      setInitialPixels(new Map());
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      resetView();
      setDrawingOperations([]);
      setIsInitialized(false);
      setUndoStack([]);
      setRedoStack([]);
      setIsViewInitialized(false);

      if (initialData && initialData.length > 0) {
        setTimeout(() => {
          importData(initialData);
        }, 0);
      } else {
        setIsInitialized(true);
        setTimeout(() => {
          onDrawingChange?.([]);
          onUserPixelCountChange?.(emptyUserPixels.size);
        }, 0);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gridSize]);

    // 暴露给外部的方法
    useImperativeHandle(ref, () => ({
      getCurrentPixelData: () => {
        const pixelData: PixelData[] = [];
        const mergedPixels = new Map([...initialPixels, ...userPixels]);
        mergedPixels.forEach((color, key) => {
          const [x, y] = key.split(",").map(Number);
          pixelData.push({ x, y, color });
        });
        return pixelData;
      },
      getDrawingOperations: () => {
        return drawingOperations;
      },
      getUserDrawingData: () => {
        const pixelData: PixelData[] = [];
        userPixels.forEach((color, key) => {
          const [x, y] = key.split(",").map(Number);
          pixelData.push({ x, y, color });
        });
        return pixelData;
      },
      importData: (data: PixelData[]) => {
        importData(data);
      },
      clearCanvas: () => {
        clearCanvas();
      },
      clearUserDrawing: () => {
        clearUserDrawing();
      },
      undo: () => {
        undo();
      },
      redo: () => {
        redo();
      },
    }));

    return (
      <div className="flex flex-col gap-4 p-4 w-full h-full min-h-0 overflow-hidden">
        {/* Canvas Information Bar */}
        <CanvasInfo canvasInfo={canvasInfo} />

        {/* 工具栏 */}
        <Toolbar
          gridSize={gridSize}
          currentColor={currentColor}
          onColorChange={handleColorChange}
          recentColors={recentColors}
          onAddToRecentColors={addToRecentColors}
          drawingMode={drawingMode}
          onDrawingModeChange={setDrawingMode}
          onImageFileSelect={handleImageFileSelect}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid(!showGrid)}
          onUndo={undo}
          onRedo={redo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onClearCanvas={clearCanvas}
          onClearUserDrawing={clearUserDrawing}
          onExportPNG={handleExportPNG}
        />

        {/* 图片导入对话框 */}
        <ImageImportDialog
          isOpen={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          selectedImage={selectedImage}
          config={imageImportConfig}
          onConfigChange={setImageImportConfig}
          processedImageData={processedImageData}
          gridSize={gridSize}
          onConfirm={confirmImageImport}
          onCancel={cancelImageImport}
        />

        {/* 画布容器 */}
        <div className="flex-1 min-h-0 relative">
          <CanvasContainer
            canvasRef={canvasRef}
            canvasSize={canvasSize}
            onCanvasSizeChange={setCanvasSize}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheelZoom}
            scale={scale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetView}
            drawingMode={drawingMode}
            currentHoverPixel={currentHoverPixel}
          />

          {/* 悬浮的购买按钮 - 当有用户绘制数据时显示 */}
          {userPixels.size > 0 && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handlePurchase}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center gap-2 font-medium cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5" />
                Purchase ({userPixels.size})
              </button>
            </div>
          )}
        </div>

        {/* 购买对话框 */}
        <PurchaseDialog
          isOpen={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
          userPixelData={getUserPixelData()}
          paintedPixelInfoList={canvasInfo?.paintedPixelInfoList || []}
          emptyPixelPrice={emptyPixelPrice}
          onConfirm={handlePurchaseConfirm}
          isLoading={isPurchaseLoading}
        />
      </div>
    );
  }
);

export default PixelCanvas;
export type { PixelCanvasRef, PixelData, DrawingOperation };
