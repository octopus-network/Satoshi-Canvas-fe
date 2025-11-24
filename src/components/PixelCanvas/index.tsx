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
import { extractImagePixels, getCanvasCoordinates, getPixelCoordinates } from "./utils";

// Import child components
import { Toolbar } from "./components/Toolbar";
import { ImageImportDialog } from "./components/ImageImportDialog";
import { CanvasContainer } from "./components/CanvasContainer";
import { CanvasInfo } from "./components/CanvasInfo";
import { PurchaseDialog } from "./components/PurchaseDialog";
import { ExportDialog, type ExportMode } from "./components/ExportDialog";

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
      canvasHeight, // 画布高度（可选，如果不提供则假设为正方形）
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
    // 使用 canvasHeight 或 gridSize（正方形画布）
    const effectiveHeight = canvasHeight ?? gridSize;
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

    // Export related state
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportMode, setExportMode] = useState<ExportMode>("full");
    const [exportFirstPoint, setExportFirstPoint] = useState<{ x: number; y: number } | null>(null);
    const [exportSecondPoint, setExportSecondPoint] = useState<{ x: number; y: number } | null>(null);
    const [isSelectingExportRegion, setIsSelectingExportRegion] = useState(false);
    const [exportHoverPixel, setExportHoverPixel] = useState<{ x: number; y: number } | null>(null);

    // View state
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [isViewInitialized, setIsViewInitialized] = useState(false);

    // History stack (only for user layer changes)
    const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

    // Draw related state
    const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
    const [emptyPixelPrice] = useState(PIXEL_CONSTANTS.DEFAULT_EMPTY_PIXEL_PRICE / 100000000); // Convert satoshis to BTC
    const [isPurchaseRefreshing, setIsPurchaseRefreshing] = useState(false); // Post-purchase refresh loading state

    // Handle draw refresh completion
    const handlePurchaseRefreshComplete = useCallback(() => {
      // console.log("🎉 Post-purchase data refresh complete, close loading");
      setIsPurchaseRefreshing(false);
      onPurchaseRefreshComplete?.();
    }, [onPurchaseRefreshComplete]);

    // Handle post-draw success function
    const handlePurchaseSuccess = useCallback(async () => {
      // console.log("🎉 Purchase successful, clear user drawing state and start polling refresh");
      
      // Clear user drawing data
      const emptyUserPixels = new Map<string, string>();
      setUserPixels(() => emptyUserPixels);
      
      // Clear drawing operation records
      setDrawingOperations([]);
      
      // Clear history records
      setUndoStack([]);
      setRedoStack([]);
      
      // Trigger callback update
      setTimeout(() => {
        onDrawingChange?.([]);
        onUserPixelCountChange?.(emptyUserPixels.size);
      }, 0);
      
      // Start post-purchase refresh loading
      setIsPurchaseRefreshing(true);
      
      try {
        // Trigger special post-purchase refresh logic (through parent component)
        await onPurchaseSuccess?.();
        
        // Purchase refresh completed
        handlePurchaseRefreshComplete();
      } catch (error) {
        console.error("Post-purchase refresh failed:", error);
        // Close loading even if failed
        handlePurchaseRefreshComplete();
      }
    }, [onDrawingChange, onUserPixelCountChange, onPurchaseSuccess, handlePurchaseRefreshComplete]);

    // Listen for draw refresh completion events
    useEffect(() => {
      if (onPurchaseRefreshComplete) {
        // Additional purchase refresh completion handling logic can be added here
      }
    }, [onPurchaseRefreshComplete]);

    // Draw hook
    const { 
      isPurchaseLoading, 
      executePurchase, 
      canPurchase,
      isPoolsReady 
    } = usePixelPurchase({
      userPixels,
      paintedPixelInfoList: canvasInfo?.paintedPixelInfoList || [],
      onSuccess: () => {
        // console.log("Draw successful, transaction ID:", txid);
        setIsPurchaseDialogOpen(false);
        
        // Handle post-draw success
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
      handleMouseDown: originalHandleMouseDown,
      handleMouseMove: originalHandleMouseMove,
      handleMouseUp,
      handleMouseLeave,
      handleWheelZoom,
      zoomIn,
      zoomOut,
      resetView,
      exportPNG,
      exportJPEG,
    } = useCanvasDrawing({
      gridSize,
      canvasHeight: effectiveHeight,
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
      exportFirstPoint,
      exportSecondPoint,
      exportHoverPixel,
      isSelectingExportRegion,
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
      a.download = `pixel-canvas_${gridSize}x${effectiveHeight}_${timestamp}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, [exportPNG, gridSize, effectiveHeight]);

    // Handle export button click
    const handleExportClick = useCallback(() => {
      setIsExportDialogOpen(true);
      setExportMode("full");
      setExportFirstPoint(null);
      setExportSecondPoint(null);
      setIsSelectingExportRegion(false);
    }, []);

    // Handle export dialog close
    const handleExportDialogClose = useCallback((open: boolean) => {
      setIsExportDialogOpen(open);
      if (!open) {
        // 关闭对话框时，如果不在选择模式，则重置所有状态
        // 如果在选择模式，保持选择状态（因为可能是用户主动关闭对话框，但想继续选择）
        if (!isSelectingExportRegion) {
          setExportMode("full");
          setExportFirstPoint(null);
          setExportSecondPoint(null);
          setExportHoverPixel(null);
        }
      }
    }, [isSelectingExportRegion]);

    // Handle export mode selection
    const handleExportModeSelect = useCallback((mode: ExportMode) => {
      setExportMode(mode);
      if (mode === "partial") {
        // 关闭对话框，进入选择模式
        setIsExportDialogOpen(false);
        setIsSelectingExportRegion(true);
        setExportFirstPoint(null);
        setExportSecondPoint(null);
      } else {
        setIsSelectingExportRegion(false);
        setExportFirstPoint(null);
        setExportSecondPoint(null);
      }
    }, []);

    // Handle export region selection reset
    const handleResetExportSelection = useCallback(() => {
      setExportFirstPoint(null);
      setExportSecondPoint(null);
      setExportHoverPixel(null);
      // 重新进入选择模式
      setIsSelectingExportRegion(true);
      setIsExportDialogOpen(false);
    }, []);

    // Handle export execution
    const handleExport = useCallback(async () => {
      if (exportMode === "full") {
        const blob = await exportJPEG({ scale: 1, backgroundColor: "#FFFFFF" });
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const today = new Date();
        const timestamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}_${String(today.getHours()).padStart(2, "0")}${String(today.getMinutes()).padStart(2, "0")}${String(today.getSeconds()).padStart(2, "0")}`;
        a.download = `pixel-canvas_${gridSize}x${effectiveHeight}_${timestamp}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportDialogOpen(false);
      } else if (exportMode === "partial" && exportFirstPoint && exportSecondPoint) {
        const x1 = Math.min(exportFirstPoint.x, exportSecondPoint.x);
        const y1 = Math.min(exportFirstPoint.y, exportSecondPoint.y);
        const x2 = Math.max(exportFirstPoint.x, exportSecondPoint.x);
        const y2 = Math.max(exportFirstPoint.y, exportSecondPoint.y);
        const blob = await exportJPEG({ 
          scale: 1, 
          backgroundColor: "#FFFFFF",
          region: { x1, y1, x2, y2 }
        });
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const today = new Date();
        const timestamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}_${String(today.getHours()).padStart(2, "0")}${String(today.getMinutes()).padStart(2, "0")}${String(today.getSeconds()).padStart(2, "0")}`;
        a.download = `pixel-canvas_${x1}-${y1}_${x2}-${y2}_${timestamp}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsExportDialogOpen(false);
        setIsSelectingExportRegion(false);
        setExportFirstPoint(null);
        setExportSecondPoint(null);
      }
    }, [exportMode, exportFirstPoint, exportSecondPoint, exportJPEG, gridSize, effectiveHeight]);

    // Handle mouse down for export region selection
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      if (isSelectingExportRegion && e.button === 0) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const { x, y } = getCanvasCoordinates(
          e.clientX,
          e.clientY,
          canvas,
          scale,
          offset
        );
        const pixelCoords = getPixelCoordinates(x, y, pixelSize, gridSize, effectiveHeight);
        
        if (pixelCoords) {
          if (!exportFirstPoint) {
            // 选择第一个点，同时设置悬停像素为第一个点，确保立即显示区域
            const firstPoint = { x: pixelCoords.pixelX, y: pixelCoords.pixelY };
            setExportFirstPoint(firstPoint);
            setExportHoverPixel(firstPoint);
            // 立即触发一次重绘，确保显示选中区域
            setTimeout(() => {
              draw();
            }, 0);
          } else if (!exportSecondPoint) {
            // 选择第二个点，固定选中区域（不自动打开对话框，等待 Enter 键确认）
            setExportSecondPoint({ x: pixelCoords.pixelX, y: pixelCoords.pixelY });
            setExportHoverPixel(null); // 清除悬停像素，固定显示
            // 立即触发一次重绘
            setTimeout(() => {
              draw();
            }, 0);
          }
        }
        return;
      }
      originalHandleMouseDown(e);
    }, [isSelectingExportRegion, exportFirstPoint, exportSecondPoint, canvasRef, scale, offset, pixelSize, gridSize, effectiveHeight, originalHandleMouseDown, draw]);

    // Handle mouse move for export region selection
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      // 如果在选择导出区域模式下，且只选择了第一个点，更新悬停像素（用于显示临时选择区域）
      if (isSelectingExportRegion && exportFirstPoint && !exportSecondPoint) {
        const canvas = canvasRef.current;
        if (canvas) {
          const { x, y } = getCanvasCoordinates(
            e.clientX,
            e.clientY,
            canvas,
            scale,
            offset
          );
          const pixelCoords = getPixelCoordinates(x, y, pixelSize, gridSize, effectiveHeight);
          // 如果获取到像素坐标，更新悬停像素；否则保持当前值（不设为 null，以便显示区域）
          if (pixelCoords) {
            setExportHoverPixel({ x: pixelCoords.pixelX, y: pixelCoords.pixelY });
          }
        }
      } else if (!isSelectingExportRegion || exportSecondPoint) {
        // 如果不在选择模式或已选择第二个点，清除悬停像素
        setExportHoverPixel(null);
      }
      originalHandleMouseMove(e);
    }, [isSelectingExportRegion, exportFirstPoint, exportSecondPoint, canvasRef, scale, offset, pixelSize, gridSize, effectiveHeight, originalHandleMouseMove]);

    // Handle mouse leave for export region selection
    const handleMouseLeaveWrapper = useCallback(() => {
      // 清除导出悬停像素（仅在未选择第二个点时清除）
      if (!exportSecondPoint) {
        setExportHoverPixel(null);
      }
      handleMouseLeave();
    }, [handleMouseLeave, exportSecondPoint]);

    // Handle keyboard events for export region confirmation
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // 如果在选择导出区域模式下，且已选择两个点，按 Enter 键确认
        if (isSelectingExportRegion && exportFirstPoint && exportSecondPoint && e.key === "Enter") {
          e.preventDefault();
          setIsSelectingExportRegion(false);
          // 延迟打开对话框，确保状态已更新
          setTimeout(() => {
            setIsExportDialogOpen(true);
          }, 100);
        }
        // 按 Escape 键取消选择
        if (isSelectingExportRegion && e.key === "Escape") {
          e.preventDefault();
          setIsSelectingExportRegion(false);
          setExportFirstPoint(null);
          setExportSecondPoint(null);
          setExportHoverPixel(null);
        }
      };

      if (isSelectingExportRegion) {
        window.addEventListener("keydown", handleKeyDown);
        return () => {
          window.removeEventListener("keydown", handleKeyDown);
        };
      }
    }, [isSelectingExportRegion, exportFirstPoint, exportSecondPoint]);

    // Color change handling
    const handleColorChange = useCallback((color: string) => {
      setCurrentColor(color);
    }, []);

    // Data import method - clear all data on first import
    const importData = useCallback(
      (data: PixelData[]) => {
        // console.log("📥 importData called (first import), data:", data);
        const newInitialPixels = new Map<string, string>();
        const newUserPixels = new Map<string, string>();
        
        data.forEach(({ x, y, color }) => {
          if (x >= 0 && x < gridSize && y >= 0 && y < effectiveHeight) {
            const key = `${x},${y}`;
            newInitialPixels.set(key, color);
            // console.log(`🎨 Set pixel: (${x}, ${y}) -> ${color}`);
          } else {
            console.warn(`⚠️  Invalid pixel coordinates: (${x}, ${y}), gridSize: ${gridSize}, height: ${effectiveHeight}`);
          }
        });
        
        // console.log("🗼️  Initial pixels Map:", newInitialPixels);
        
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
      [gridSize, effectiveHeight] // Depend on gridSize and effectiveHeight
    );

    // Update initial data method - only update underlying data, preserve user drawings
    const updateInitialData = useCallback(
      (data: PixelData[]) => {
        // console.log("🔄 updateInitialData called (update bottom layer data), data:", data);
        const newInitialPixels = new Map<string, string>();
        
        data.forEach(({ x, y, color }) => {
          if (x >= 0 && x < gridSize && y >= 0 && y < effectiveHeight) {
            const key = `${x},${y}`;
            newInitialPixels.set(key, color);
            // console.log(`🎨 Update bottom layer pixel: (${x}, ${y}) -> ${color}`);
          } else {
            console.warn(`⚠️  Invalid pixel coordinates: (${x}, ${y}), gridSize: ${gridSize}, height: ${effectiveHeight}`);
          }
        });
        
        // console.log("🗼️  Updated initial pixels Map:", newInitialPixels);
        // console.log("👤 Retain user pixels Map:", userPixels);
        
        setInitialPixels(newInitialPixels);
        // Don't modify userPixels, preserve user drawing content
      },
      [gridSize, effectiveHeight, userPixels] // Depend on gridSize, effectiveHeight, and userPixels
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
            const maxSize = Math.min(Math.min(gridSize, effectiveHeight) * 0.5, 200);
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const newConfig = {
              scale: Math.max(0.01, Math.min(10, scale)),
              offsetX: Math.floor((gridSize - img.width * scale) / 2),
              offsetY: Math.floor((effectiveHeight - img.height * scale) / 2),
              opacity: 1,
            };
            setImageImportConfig(newConfig);

            // Process preview data immediately to avoid initial blank
            const processed = extractImagePixels(img, newConfig, gridSize, effectiveHeight);
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
          gridSize,
          effectiveHeight
        );
        setProcessedImageData(processed);
      }
    }, [imageImportConfig, gridSize, effectiveHeight, selectedImage, isImportDialogOpen]); // Only update when configuration changes

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
      // console.log("🔍 PixelCanvas useEffect triggered:", { 
      //   isInitialized, 
      //   initialDataLength: initialData?.length || 0,
      //   initialData: initialData?.slice(0, 5) // Only show first 5 pixels for debugging
      // });
      
      if (!isInitialized) {
        // First initialization
        if (initialData && initialData.length > 0) {
          // console.log("📥 First import of initial data:", initialData);
          importData(initialData);
        } else {
          // console.log("🔧 Initialize empty canvas");
          setIsInitialized(true);
          setDrawingOperations([]);
          setUndoStack([]);
          setRedoStack([]);
        }
      } else {
        // Already initialized, only update underlying data
        if (initialData && initialData.length > 0) {
          // console.log("🔄 Update bottom layer data, retain user drawing");
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
      // console.log("🔄 gridSize changed, reset canvas:", gridSize);
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
          // console.log("🔄 Import initial data after gridSize change");
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
          onExport={handleExportClick}
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
          canvasHeight={effectiveHeight}
          onConfirm={confirmImageImport}
          onCancel={cancelImageImport}
        />

        {/* Export dialog */}
        <ExportDialog
          isOpen={isExportDialogOpen}
          onOpenChange={handleExportDialogClose}
          onModeSelect={handleExportModeSelect}
          exportMode={exportMode}
          firstPoint={exportFirstPoint}
          secondPoint={exportSecondPoint}
          onExport={handleExport}
          onResetSelection={handleResetExportSelection}
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
            onMouseLeave={handleMouseLeaveWrapper}
            onWheel={handleWheelZoom}
            scale={scale}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onResetView={resetView}
            drawingMode={drawingMode}
            currentHoverPixel={currentHoverPixel}
            isSelectingExportRegion={isSelectingExportRegion}
            exportFirstPoint={exportFirstPoint}
            exportSecondPoint={exportSecondPoint}
          />

        {/* Floating draw button - shown when there is user drawing data */}
          {userPixels.size > 0 && (
            <div className="absolute bottom-4 right-4">
              <button
                onClick={handlePurchase}
                disabled={!canPurchase || isPurchaseLoading}
                className={`
                  px-6 py-3 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 font-medium cursor-pointer
                  ${canPurchase && !isPurchaseLoading
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:shadow-xl transform hover:scale-105'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-70'
                  }
                `}
              >
                <ShoppingCart className="w-5 h-5" />
                {isPurchaseLoading ? "Processing..." : `Draw (${userPixels.size})`}
              </button>
            </div>
          )}
        </div>

        {/* Draw refresh loading overlay */}
        {isPurchaseRefreshing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Processing Draw
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
