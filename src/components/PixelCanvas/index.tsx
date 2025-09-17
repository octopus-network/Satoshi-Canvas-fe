import React, {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

// Import type definitions
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

// Import constants
import { DEFAULT_PIXEL_SIZE, IMAGE_IMPORT } from "./constants";
import { PIXEL_CONSTANTS } from "@/constants/pixel";

// Import utility functions
import { extractImagePixels } from "./utils";

// Import child components
import { Toolbar } from "./components/Toolbar";
import { ImageImportDialog } from "./components/ImageImportDialog";
import { CanvasContainer } from "./components/CanvasContainer";
import { CanvasInfo } from "./components/CanvasInfo";
import { PurchaseDialog } from "./components/PurchaseDialog";

// Import icons
import { ShoppingCart } from "lucide-react";

// Import custom hooks
import { useCanvasDrawing } from "./hooks/useCanvasDrawing";

// Import purchase hook
import { usePixelPurchase } from "@/hooks/usePixelPurchase";

// Import debug store
import { useDebugStore } from "@/store/useDebugStore";

const PixelCanvas = forwardRef<PixelCanvasRef, PixelCanvasProps>(
  (
    {
      gridSize,
      pixelSize = DEFAULT_PIXEL_SIZE,
      initialData,
      onDrawingChange,
      onUserPixelCountChange,
      canvasInfo,
      isRefreshing,
      lastRefreshTime,
      onRefresh,
      onPurchaseSuccess,
      onPurchaseRefreshComplete,
    },
    ref
  ) => {
    // Canvas state - separate initial data and user data
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

    // Drawing operation records
    const [drawingOperations, setDrawingOperations] = useState<
      DrawingOperation[]
    >([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Recently used colors
    const [recentColors, setRecentColors] = useState<string[]>([]);

    // Image import related state
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(
      null
    );
    const [imageImportConfig, setImageImportConfig] =
      useState<ImageImportConfig>(IMAGE_IMPORT.DEFAULT_CONFIG);
    const [processedImageData, setProcessedImageData] =
      useState<ProcessedImageData | null>(null);

    // View state
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [isViewInitialized, setIsViewInitialized] = useState(false);

    // History stack (only for user layer changes)
    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

    // Purchase related state
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    const [emptyPixelPrice] = useState(PIXEL_CONSTANTS.DEFAULT_EMPTY_PIXEL_PRICE / 100000000); // Convert satoshis to BTC
    const [isPurchaseRefreshing, setIsPurchaseRefreshing] = useState(false); // 购买后刷新loading状态

    // 购买刷新完成处理
    const handlePurchaseRefreshComplete = useCallback(() => {
      console.log("🎉 购买后数据刷新完成，关闭loading");
      setIsPurchaseRefreshing(false);
      onPurchaseRefreshComplete?.();
    }, [onPurchaseRefreshComplete]);

    // 购买成功后的处理函数
    const handlePurchaseSuccess = useCallback(async () => {
      console.log("🎉 购买成功，清空用户绘制状态并开始轮询刷新");
      
      // 清空用户绘制数据
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      
      // 清空绘制操作记录
      setDrawingOperations([]);
      
      // 清空历史记录
      setUndoStack([]);
      setRedoStack([]);
      
      // 触发回调更新
      setTimeout(() => {
        onDrawingChange?.([]);
        onUserPixelCountChange?.(emptyUserPixels.size);
      }, 0);
      
      // 开始购买后的刷新loading
      setIsPurchaseRefreshing(true);
      
      try {
        // 触发购买后的特殊刷新逻辑（通过父组件）
        await onPurchaseSuccess?.();
        
        // 购买刷新完成
        handlePurchaseRefreshComplete();
      } catch (error) {
        console.error("购买后刷新失败:", error);
        // 即使失败也要关闭loading
        handlePurchaseRefreshComplete();
      }
    }, [onDrawingChange, onUserPixelCountChange, onPurchaseSuccess, handlePurchaseRefreshComplete]);

    // 监听购买刷新完成事件
    useEffect(() => {
      if (onPurchaseRefreshComplete) {
        // 这里可以添加额外的购买刷新完成处理逻辑
      }
    }, [onPurchaseRefreshComplete]);

    // Purchase hook
    const { 
      isPurchaseLoading, 
      executePurchase, 
      canPurchase,
      isPoolsReady 
    } = usePixelPurchase({
      userPixels,
      paintedPixelInfoList: canvasInfo?.paintedPixelInfoList || [],
      onSuccess: (txid) => {
        console.log("购买成功，交易ID:", txid);
        setIsPurchaseDialogOpen(false);
        
        // 购买成功后的处理
        handlePurchaseSuccess();
      }
    });

    // Debug store
    const { isDebugMode } = useDebugStore();

    // Add color to recently used list
    const addToRecentColors = useCallback((color: string) => {
      setRecentColors((prev) => {
        const filtered = prev.filter((c) => c !== color);
        return [color, ...filtered].slice(0, IMAGE_IMPORT.MAX_RECENT_COLORS);
      });
    }, []);

    // Color picker color selection handling
    const handleColorPicked = useCallback(
      (color: string) => {
        setCurrentColor(color);
        addToRecentColors(color);
      },
      [addToRecentColors]
    );

    // Use canvas drawing hook
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
        // New stroke added to undo stack and clear redo stack
        setUndoStack((prev) => [...prev, entry]);
        setRedoStack([]);
      },
      onColorPicked: handleColorPicked,
    });

    // Export PNG button callback
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

    // Color change handling
    const handleColorChange = useCallback((color: string) => {
      setCurrentColor(color);
    }, []);

    // Data import method - 首次导入时清空所有数据
    const importData = useCallback(
      (data: PixelData[]) => {
        console.log("📥 importData 被调用（首次导入），数据:", data);
        const newInitialPixels = new Map<string, string>();
        const newUserPixels = new Map<string, string>();
        
        data.forEach(({ x, y, color }) => {
          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const key = `${x},${y}`;
            newInitialPixels.set(key, color);
            console.log(`🎨 设置像素: (${x}, ${y}) -> ${color}`);
          } else {
            console.warn(`⚠️  无效像素坐标: (${x}, ${y}), gridSize: ${gridSize}`);
          }
        });
        
        console.log("🗂️  初始像素 Map:", newInitialPixels);
        
        setInitialPixels(newInitialPixels);
        setUserPixels(() => newUserPixels);
        setIsInitialized(true);
        setDrawingOperations([]);
        setUndoStack([]);
        setRedoStack([]);

        // Delay callback invocation to avoid calling during state update process
        setTimeout(() => {
          onDrawingChange?.([]);
          onUserPixelCountChange?.(newUserPixels.size);
        }, 0);
      },
      [gridSize] // Only depend on gridSize
    );

    // Update initial data method - 仅更新底层数据，保留用户绘制
    const updateInitialData = useCallback(
      (data: PixelData[]) => {
        console.log("🔄 updateInitialData 被调用（更新底层数据），数据:", data);
        const newInitialPixels = new Map<string, string>();
        
        data.forEach(({ x, y, color }) => {
          if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
            const key = `${x},${y}`;
            newInitialPixels.set(key, color);
            console.log(`🎨 更新底层像素: (${x}, ${y}) -> ${color}`);
          } else {
            console.warn(`⚠️  无效像素坐标: (${x}, ${y}), gridSize: ${gridSize}`);
          }
        });
        
        console.log("🗂️  更新后的初始像素 Map:", newInitialPixels);
        console.log("👤 保留用户像素 Map:", userPixels);
        
        setInitialPixels(newInitialPixels);
        // 不修改 userPixels，保留用户绘制内容
      },
      [gridSize, userPixels]
    );

    // Handle image file selection
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

            // Process preview data immediately to avoid initial blank
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

    // Handle image preview update (when user adjusts configuration)
    useEffect(() => {
      if (selectedImage && isImportDialogOpen) {
        const processed = extractImagePixels(
          selectedImage,
          imageImportConfig,
          gridSize
        );
        setProcessedImageData(processed);
      }
    }, [imageImportConfig]); // Only update when configuration changes

    // Confirm image import
    const confirmImageImport = useCallback(() => {
      if (!processedImageData) return;

      // Calculate new user pixel data
      const newUserPixels = new Map(userPixels);
      processedImageData.pixels.forEach(({ x, y, color }) => {
        const key = `${x},${y}`;
        newUserPixels.set(key, color);
      });

      // Update user pixel data
      setUserPixels(() => newUserPixels);

      // Delay notification of pixel count change
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

        // Update drawing operations
        setDrawingOperations((prev) => {
          const updated = [...prev, ...importOperations];
          return updated;
        });

        // Delay notification of operation change
        setTimeout(() => {
          setDrawingOperations((current) => {
            onDrawingChange?.(current);
            return current;
          });
        }, 0);

        // Write to history stack: import image as a history group
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
    }, [processedImageData, isInitialized, userPixels]); // Remove callback function dependency

    // Cancel image import
    const cancelImageImport = useCallback(() => {
      setIsImportDialogOpen(false);
      setSelectedImage(null);
      setProcessedImageData(null);
    }, []);

    // Clear canvas
    const clearCanvas = useCallback(() => {
      setInitialPixels(new Map());
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      setDrawingOperations([]);
      // Reinitialize after clearing to ensure subsequent drawing operations work normally
      setIsInitialized(true);
      setUndoStack([]);
      setRedoStack([]);

      // Delay callback invocation to avoid infinite loop
      setTimeout(() => {
        onDrawingChange?.([]);
        onUserPixelCountChange?.(emptyUserPixels.size);
      }, 0);
    }, []); // Remove callback function dependency

    // Clear user drawing
    const clearUserDrawing = useCallback(() => {
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      setDrawingOperations([]);
      setUndoStack([]);
      setRedoStack([]);

      // Delay callback invocation to avoid infinite loop
      setTimeout(() => {
        onDrawingChange?.([]);
        onUserPixelCountChange?.(emptyUserPixels.size);
      }, 0);
    }, []); // Remove callback function dependency

    // Undo/redo implementation (only for user layer)
    const applyHistoryEntry = useCallback(
      (entry: HistoryEntry, direction: "undo" | "redo") => {
        // Apply changes to userPixels
        const next = new Map(userPixels);
        entry.changes.forEach(({ key, before, after }) => {
          const value = direction === "undo" ? before : after;
          if (value == null) next.delete(key);
          else next.set(key, value);
        });
        setUserPixels(next);

        // Update operation records (only for display purposes, no strict reverse operation calculation)
        setDrawingOperations((prev) => {
          const ops = entry.operations;
          if (direction === "undo") {
            // Undo: append a reverse operation snapshot for panel display
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
          // Redo: append original operation again
          const redoOps: DrawingOperation[] = ops.map((op) => ({
            ...op,
            timestamp: Date.now(),
          }));
          const updated = [...prev, ...redoOps];
          setTimeout(() => onDrawingChange?.(updated), 0);
          return updated;
        });

        // Callback count change
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

    // Purchase related handling functions
    const handlePurchase = useCallback(() => {
      setIsPurchaseDialogOpen(true);
    }, []);

    const handlePurchaseConfirm = useCallback(async () => {
      await executePurchase();
    }, [executePurchase]);

    // Get user drawn pixel data
    const getUserPixelData = useCallback((): PixelData[] => {
      const pixelData: PixelData[] = [];
      userPixels.forEach((color, key) => {
        const [x, y] = key.split(",").map(Number);
        pixelData.push({ x, y, color });
      });
      return pixelData;
    }, [userPixels]);

    // Handle initial data import and updates
    useEffect(() => {
      console.log("🔍 PixelCanvas useEffect 触发:", { 
        isInitialized, 
        initialDataLength: initialData?.length || 0,
        initialData: initialData?.slice(0, 5) // 只显示前5个像素用于调试
      });
      
      if (!isInitialized) {
        // 首次初始化
        if (initialData && initialData.length > 0) {
          console.log("📥 首次导入初始数据:", initialData);
          importData(initialData);
        } else {
          console.log("🔧 初始化空画布");
          setIsInitialized(true);
          setDrawingOperations([]);
          setUndoStack([]);
          setRedoStack([]);
        }
      } else {
        // 已初始化，仅更新底层数据
        if (initialData && initialData.length > 0) {
          console.log("🔄 更新底层数据，保留用户绘制");
          updateInitialData(initialData);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, initialData]);

    // Initialization and redraw
    useEffect(() => {
      draw();
    }, [draw]);

    // Initialize view position (execute only once)
    useEffect(() => {
      if (!isViewInitialized && canvasSize.width > 0 && canvasSize.height > 0) {
        resetView();
        setIsViewInitialized(true);
      }
    }, [canvasSize, isViewInitialized, resetView]);

    // Redraw when canvas container size changes (don't reset view)
    useEffect(() => {
      draw();
    }, [canvasSize, draw]);

    // Reset canvas when grid size changes
    useEffect(() => {
      // Only reset when gridSize changes; initialData doesn't participate in dependency to avoid repeated resets when parent component passes []
      console.log("🔄 gridSize 变化，重置画布:", gridSize);
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
          console.log("🔄 gridSize变化后导入初始数据");
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

    // Methods exposed to external components
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
      updateInitialData: (data: PixelData[]) => {
        updateInitialData(data);
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
        <CanvasInfo 
          canvasInfo={canvasInfo}
          isRefreshing={isRefreshing}
          lastRefreshTime={lastRefreshTime}
          onRefresh={onRefresh}
        />

        {/* Toolbar */}
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

        {/* Image import dialog */}
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

        {/* Canvas container */}
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

          {/* Floating purchase button - shown when there is user drawing data */}
          {userPixels.size > 0 && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handlePurchase}
                // TODO: 后续放开注释
                // disabled={!canPurchase || isPurchaseLoading}
                className={`
                  px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 font-medium cursor-pointer
                  ${canPurchase && !isPurchaseLoading
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-70'
                  }
                `}
              >
                <ShoppingCart className="w-5 h-5" />
                {isPurchaseLoading ? "处理中..." : `Purchase (${userPixels.size})`}
              </button>
            </div>
          )}
        </div>

        {/* Purchase refresh loading overlay */}
        {isPurchaseRefreshing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Processing Purchase
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Waiting for transaction confirmation...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Purchase dialog */}
        <PurchaseDialog
          isOpen={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
          userPixelData={getUserPixelData()}
          paintedPixelInfoList={canvasInfo?.paintedPixelInfoList || []}
          emptyPixelPrice={emptyPixelPrice}
          onConfirm={handlePurchaseConfirm}
          isLoading={isPurchaseLoading}
        />
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && isDebugMode && (
          <div className="fixed top-4 left-4 bg-black/80 text-white p-2 rounded text-xs z-50">
            <div>Pools Ready: {isPoolsReady ? '✅' : '❌'}</div>
            <div>Can Purchase: {canPurchase ? '✅' : '❌'}</div>
            <div>Pixels: {userPixels.size}</div>
          </div>
        )}
      </div>
    );
  }
);

export default PixelCanvas;
export type { PixelCanvasRef, PixelData, DrawingOperation };
