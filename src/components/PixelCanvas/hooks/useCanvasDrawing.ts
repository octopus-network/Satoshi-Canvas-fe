import { useCallback, useRef, useEffect } from "react";
import type {
  DrawingMode,
  CanvasSize,
  Offset,
  DrawingOperation,
  HistoryEntry,
} from "../types";
import { ZOOM_LIMITS, CANVAS, ZOOM_PRESETS } from "../constants";
import {
  getCanvasCoordinates,
  getPixelCoordinates,
  copyCoordinateToClipboard,
  calculateMouseCenteredZoom,
  calculateCenterZoomToTargetScale,
} from "../utils";

interface UseCanvasDrawingParams {
  // 画布状态
  gridSize: number;
  pixelSize: number;
  scale: number;
  offset: Offset;
  canvasSize: CanvasSize;
  showGrid: boolean;

  // 像素数据
  initialPixels: Map<string, string>;
  userPixels: Map<string, string>;

  // 绘制状态
  drawingMode: DrawingMode;
  currentColor: string;
  isInitialized: boolean;

  // 状态更新函数
  setScale: (scale: number) => void;
  setOffset: (offset: Offset | ((prev: Offset) => Offset)) => void;
  setUserPixels: (
    updater: (prev: Map<string, string>) => Map<string, string>
  ) => void;
  setDrawingOperations: (
    updater: (prev: DrawingOperation[]) => DrawingOperation[]
  ) => void;
  setCurrentHoverPixel: (pixel: { x: number; y: number } | null) => void;

  // 回调函数
  onDrawingChange?: (operations: DrawingOperation[]) => void;
  onUserPixelCountChange?: (count: number) => void;
  onHistoryEntry?: (entry: HistoryEntry) => void; // 新增：笔触提交后上报历史条目
  onColorPicked?: (color: string) => void; // 新增：取色器颜色选择回调
}

export const useCanvasDrawing = ({
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
  onHistoryEntry,
  onColorPicked,
}: UseCanvasDrawingParams) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  // 添加滚轮事件节流
  const lastWheelTimeRef = useRef(0);

  // 离屏图层缓存
  const staticLayerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticLayerCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const userLayerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const userLayerCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const suppressUserRebuildRef = useRef(false);

  // 笔触级增量缓存，避免每像素克隆 Map 与状态抖动
  const userPixelsRef = useRef(userPixels);
  const isStrokingRef = useRef(false);
  const pendingUserChangesRef = useRef<Map<string, string | null> | null>(null);
  const strokeVisitedRef = useRef<Set<string> | null>(null);
  const pendingOperationsRef = useRef<DrawingOperation[]>([]);

  // 状态镜像，避免闭包陈旧值
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const gridSizeRef = useRef(gridSize);
  const pixelSizeRef = useRef(pixelSize);
  const showGridRef = useRef(showGrid);

  // 工具：确保图层画布存在并尺寸正确（以网格单位尺寸 gridSize × gridSize）
  const ensureLayer = useCallback(() => {
    const size = gridSizeRef.current; // 离屏层采用网格尺寸，1像素=1格
    // 初始化或尺寸变化时重建
    const ensure = (
      canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
      ctxRef: React.MutableRefObject<CanvasRenderingContext2D | null>
    ) => {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }
      if (canvas.width !== size || canvas.height !== size) {
        canvas.width = size;
        canvas.height = size;
      }
      let ctx = ctxRef.current;
      if (!ctx) {
        ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctxRef.current = ctx;
      }
      ctx.imageSmoothingEnabled = false;
    };

    ensure(staticLayerCanvasRef, staticLayerCtxRef);
    ensure(userLayerCanvasRef, userLayerCtxRef);
  }, []);

  // 从 Map 重建静态层
  const rebuildStaticLayer = useCallback(() => {
    ensureLayer();
    const ctx = staticLayerCtxRef.current;
    const canvas = staticLayerCanvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initialPixels.forEach((color, key) => {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  }, [initialPixels, ensureLayer]);

  // 从 Map 重建用户层（用于批量导入/清空）
  const rebuildUserLayer = useCallback(() => {
    ensureLayer();
    const ctx = userLayerCtxRef.current;
    const canvas = userLayerCanvasRef.current;
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    userPixels.forEach((color, key) => {
      const [x, y] = key.split(",").map(Number);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  }, [userPixels, ensureLayer]);

  // 使用useMemo缓存画布实际尺寸，避免每次重新计算

  // 将状态同步到 refs，避免闭包导致的陈旧值
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);
  useEffect(() => {
    pixelSizeRef.current = pixelSize;
  }, [pixelSize]);
  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);

  // 同步 userPixels 到 ref，避免闭包旧值
  useEffect(() => {
    userPixelsRef.current = userPixels;
  }, [userPixels]);

  // RAF 合批重绘（只做合成与可见区域网格线）
  const scheduleDraw = useCallback(() => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 读取快照
      const currentScale = scaleRef.current;
      const currentOffset = offsetRef.current;
      const currentPixelSize = pixelSizeRef.current;
      const currentShowGrid = showGridRef.current;

      // 清屏
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 将画布坐标系切换到世界坐标（像素网格为单位）
      ctx.save();
      ctx.scale(currentScale, currentScale);
      ctx.translate(currentOffset.x, currentOffset.y);
      ctx.imageSmoothingEnabled = false;

      // 仅绘制可见区域的离屏图层
      const viewLeft = -currentOffset.x;
      const viewTop = -currentOffset.y;
      const viewRight = viewLeft + canvas.width / currentScale;
      const viewBottom = viewTop + canvas.height / currentScale;

      const staticCanvas = staticLayerCanvasRef.current;
      const userCanvas = userLayerCanvasRef.current;
      const ps = currentPixelSize;
      // 采用精确的浮点裁剪，避免因取整导致视图在后续重绘时产生轻微缩放差异
      const srcX = Math.max(0, viewLeft / ps);
      const srcY = Math.max(0, viewTop / ps);
      const srcRight = Math.min(gridSizeRef.current, viewRight / ps);
      const srcBottom = Math.min(gridSizeRef.current, viewBottom / ps);
      const srcW = Math.max(0, srcRight - srcX);
      const srcH = Math.max(0, srcBottom - srcY);
      const dxWorld = srcX * ps;
      const dyWorld = srcY * ps;
      const dwWorld = srcW * ps;
      const dhWorld = srcH * ps;
      if (staticCanvas && srcW > 0 && srcH > 0) {
        ctx.drawImage(
          staticCanvas,
          srcX,
          srcY,
          srcW,
          srcH,
          dxWorld,
          dyWorld,
          dwWorld,
          dhWorld
        );
      }
      if (userCanvas && srcW > 0 && srcH > 0) {
        ctx.drawImage(
          userCanvas,
          srcX,
          srcY,
          srcW,
          srcH,
          dxWorld,
          dyWorld,
          dwWorld,
          dhWorld
        );
      }

      // 网格线：仅绘制可见范围，且阈值限制
      if (currentShowGrid && currentScale > CANVAS.GRID_THRESHOLD_SCALE) {
        const isDark = document.documentElement.classList.contains("dark");
        ctx.strokeStyle = isDark ? "#404040" : "#e0e0e0";
        ctx.lineWidth = 0.5 / currentScale;

        const startX = Math.max(0, Math.floor(viewLeft / currentPixelSize));
        const endX = Math.min(
          gridSizeRef.current,
          Math.ceil(viewRight / currentPixelSize)
        );
        const startY = Math.max(0, Math.floor(viewTop / currentPixelSize));
        const endY = Math.min(
          gridSizeRef.current,
          Math.ceil(viewBottom / currentPixelSize)
        );

        for (let x = startX; x <= endX; x++) {
          const gx = x * currentPixelSize;
          ctx.beginPath();
          ctx.moveTo(gx, startY * currentPixelSize);
          ctx.lineTo(gx, endY * currentPixelSize);
          ctx.stroke();
        }
        for (let y = startY; y <= endY; y++) {
          const gy = y * currentPixelSize;
          ctx.beginPath();
          ctx.moveTo(startX * currentPixelSize, gy);
          ctx.lineTo(endX * currentPixelSize, gy);
          ctx.stroke();
        }
      }

      ctx.restore();
    });
  }, []);

  // 网格显隐变化时，立即触发一次重绘
  useEffect(() => {
    scheduleDraw();
  }, [showGrid, scheduleDraw]);

  // 对外提供的 draw API：触发一次 RAF 合批
  const draw = useCallback(() => {
    scheduleDraw();
  }, [scheduleDraw]);

  // 初始与尺寸相关变更时，重建离屏层
  useEffect(() => {
    ensureLayer();
    rebuildStaticLayer();
    rebuildUserLayer();
    scheduleDraw();
  }, [
    gridSize,
    pixelSize,
    ensureLayer,
    rebuildStaticLayer,
    rebuildUserLayer,
    scheduleDraw,
  ]);

  // initialPixels 变化时重建静态层
  useEffect(() => {
    rebuildStaticLayer();
    scheduleDraw();
  }, [rebuildStaticLayer, scheduleDraw]);

  // userPixels 大变更时（例如导入/清空），重建用户层
  useEffect(() => {
    if (suppressUserRebuildRef.current) return;
    rebuildUserLayer();
    scheduleDraw();
  }, [rebuildUserLayer, scheduleDraw]);

  // 获取指定坐标的像素颜色
  const getPixelColor = useCallback(
    (pixelX: number, pixelY: number): string | null => {
      const key = `${pixelX},${pixelY}`;

      // 先检查用户绘制层，再检查初始数据层
      if (userPixels.has(key)) {
        return userPixels.get(key) || null;
      }

      if (initialPixels.has(key)) {
        return initialPixels.get(key) || null;
      }

      return null; // 没有颜色，返回null表示透明或底色
    },
    [userPixels, initialPixels]
  );

  // 绘制像素方法
  const drawPixel = useCallback(
    (pixelX: number, pixelY: number) => {
      const key = `${pixelX},${pixelY}`;

      // 若当前不在笔触中（防御），则开启笔触缓存
      if (!isStrokingRef.current) {
        isStrokingRef.current = true;
        suppressUserRebuildRef.current = true;
        pendingUserChangesRef.current = new Map();
        strokeVisitedRef.current = new Set();
        pendingOperationsRef.current = [];
      }

      // 单笔触内去重（避免同一像素重复写入）
      if (strokeVisitedRef.current && strokeVisitedRef.current.has(key)) return;
      strokeVisitedRef.current?.add(key);

      if (drawingMode === "draw") {
        // 若最终颜色与现有覆盖色相同，跳过
        const currentOverlayColor = pendingUserChangesRef.current?.has(key)
          ? (pendingUserChangesRef.current?.get(key) ?? undefined)
          : userPixelsRef.current.get(key);
        if (currentOverlayColor === currentColor) return;

        // 记录增量改动
        pendingUserChangesRef.current?.set(key, currentColor);

        // 增量更新离屏用户层
        ensureLayer();
        const ctx = userLayerCtxRef.current;
        if (ctx) {
          ctx.fillStyle = currentColor;
          ctx.fillRect(pixelX, pixelY, 1, 1);
        }

        if (isInitialized) {
          pendingOperationsRef.current.push({
            x: pixelX,
            y: pixelY,
            color: currentColor,
            timestamp: Date.now(),
            type: "draw",
          });
        }

        // 合成
        scheduleDraw();
      } else if (drawingMode === "erase") {
        // 仅当确有覆盖像素或本笔触已写入时才执行擦除
        const hadOverlay = pendingUserChangesRef.current?.has(key)
          ? pendingUserChangesRef.current?.get(key) !== null
          : userPixelsRef.current.has(key);
        if (!hadOverlay) return;

        pendingUserChangesRef.current?.set(key, null);

        // 增量擦除离屏用户层
        ensureLayer();
        const ctx = userLayerCtxRef.current;
        if (ctx) {
          ctx.clearRect(pixelX, pixelY, 1, 1);
        }

        if (isInitialized) {
          pendingOperationsRef.current.push({
            x: pixelX,
            y: pixelY,
            color: "",
            timestamp: Date.now(),
            type: "erase",
          });
        }

        // 合成
        scheduleDraw();
      }
    },
    [drawingMode, currentColor, isInitialized, ensureLayer, scheduleDraw]
  );

  // 提交当前笔触到全局 state，并批量触发外部回调
  const commitStroke = useCallback(() => {
    const changes = pendingUserChangesRef.current;
    if (!isStrokingRef.current || !changes) return;

    const operations = pendingOperationsRef.current;

    // 记录提交前的 user 像素，用于构造历史条目
    const beforeUserPixels = userPixelsRef.current;

    setUserPixels((prev) => {
      const next = new Map(prev);
      changes.forEach((val, k) => {
        if (val == null) next.delete(k);
        else next.set(k, val);
      });
      onUserPixelCountChange?.(next.size);
      return next;
    });

    if (isInitialized && operations.length > 0) {
      setDrawingOperations((prev) => {
        const updated = [...prev, ...operations];
        onDrawingChange?.(updated);
        return updated;
      });

      // 构造历史条目并上报
      const historyEntry: HistoryEntry = {
        kind: "stroke",
        changes: Array.from(changes.entries()).map(([key, val]) => ({
          key,
          before: beforeUserPixels.get(key),
          after: val == null ? undefined : val,
        })),
        operations: operations.slice(),
      };
      onHistoryEntry?.(historyEntry);
    }

    // 清理笔触缓存
    pendingUserChangesRef.current = null;
    strokeVisitedRef.current = null;
    pendingOperationsRef.current = [];
    isStrokingRef.current = false;

    // 释放 userPixels 重建抑制
    setTimeout(() => {
      suppressUserRebuildRef.current = false;
    }, 0);
  }, [
    isInitialized,
    setUserPixels,
    setDrawingOperations,
    onDrawingChange,
    onUserPixelCountChange,
    onHistoryEntry,
  ]);

  // 鼠标事件处理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasCoordinates(
        e.clientX,
        e.clientY,
        canvas,
        scale,
        offset
      );

      if (e.button === 0) {
        // 左键
        const pixelCoords = getPixelCoordinates(x, y, pixelSize, gridSize);
        if (pixelCoords) {
          if (drawingMode === "locate") {
            // 坐标定位模式：复制坐标
            copyCoordinateToClipboard(pixelCoords.pixelX, pixelCoords.pixelY);
          } else if (drawingMode === "picker") {
            // 取色器模式：获取该坐标的颜色
            const pickedColor = getPixelColor(
              pixelCoords.pixelX,
              pixelCoords.pixelY
            );
            if (pickedColor && onColorPicked) {
              onColorPicked(pickedColor);
            }
          } else {
            // 绘制模式：开启笔触并绘制
            isDrawingRef.current = true;
            isStrokingRef.current = true;
            suppressUserRebuildRef.current = true;
            pendingUserChangesRef.current = new Map();
            strokeVisitedRef.current = new Set();
            pendingOperationsRef.current = [];

            drawPixel(pixelCoords.pixelX, pixelCoords.pixelY);
          }
        }
      } else if (e.button === 2) {
        // 右键拖拽
        e.preventDefault();
        isDraggingRef.current = true;
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [
      scale,
      offset,
      pixelSize,
      gridSize,
      drawingMode,
      drawPixel,
      getPixelColor,
      onColorPicked,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x, y } = getCanvasCoordinates(
        e.clientX,
        e.clientY,
        canvas,
        scale,
        offset
      );
      const pixelCoords = getPixelCoordinates(x, y, pixelSize, gridSize);

      // 更新悬停像素坐标（在坐标定位模式下使用）
      if (drawingMode === "locate" && pixelCoords) {
        setCurrentHoverPixel({ x: pixelCoords.pixelX, y: pixelCoords.pixelY });
      } else {
        setCurrentHoverPixel(null);
      }

      if (isDrawingRef.current && drawingMode !== "locate") {
        if (pixelCoords) {
          drawPixel(pixelCoords.pixelX, pixelCoords.pixelY);
        }
      } else if (isDraggingRef.current) {
        const deltaX = e.clientX - lastMousePosRef.current.x;
        const deltaY = e.clientY - lastMousePosRef.current.y;

        const newOffset = {
          x: offsetRef.current.x + deltaX / scale,
          y: offsetRef.current.y + deltaY / scale,
        };
        // 同步到 ref，保证本帧使用最新偏移
        offsetRef.current = newOffset;
        setOffset(newOffset);

        // 拖拽时也即时触发一次合成，保证跟手
        scheduleDraw();

        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [
      scale,
      offset,
      pixelSize,
      gridSize,
      drawingMode,
      drawPixel,
      setCurrentHoverPixel,
      setOffset,
      scheduleDraw,
    ]
  );

  const handleMouseUp = useCallback(() => {
    // 提交笔触（若存在）
    commitStroke();
    isDrawingRef.current = false;
    isDraggingRef.current = false;
  }, [commitStroke]);

  const handleMouseLeave = useCallback(() => {
    // 提交笔触并清理悬停
    commitStroke();
    isDrawingRef.current = false;
    isDraggingRef.current = false;
    setCurrentHoverPixel(null); // 清除悬停坐标
  }, [commitStroke, setCurrentHoverPixel]);

  // 滚轮缩放处理函数 - 以鼠标位置为中心缩放
  // 使用自适应缩放算法：根据当前缩放级别调整缩放速度
  const handleWheelZoom = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastWheelTimeRef.current < 8) {
        return;
      }
      lastWheelTimeRef.current = now;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let zoomIntensity = 0.05;
      if (scale > 3) {
        zoomIntensity = 0.03;
      } else if (scale < 0.5) {
        zoomIntensity = 0.07;
      }

      const direction = e.deltaY > 0 ? -1 : 1;
      const scaleFactor = 1 + direction * zoomIntensity;

      const { scale: newScale, offset: newOffset } = calculateMouseCenteredZoom(
        mouseX,
        mouseY,
        scale,
        offset,
        scaleFactor,
        ZOOM_LIMITS.MIN,
        ZOOM_LIMITS.MAX
      );

      // 先同步到 refs，确保本帧使用最新变换
      scaleRef.current = newScale;
      offsetRef.current = newOffset;

      setScale(newScale);
      setOffset(newOffset);
      // 缩放后触发一次合成
      scheduleDraw();
    },
    [scale, offset, setScale, setOffset, scheduleDraw]
  );

  // 缩放控制 - 以画布中心为基准
  const zoomIn = useCallback(() => {
    // 使用预设倍率逐级放大
    const current = scale;
    // 找到第一个大于当前 scale 的预设
    let target = (ZOOM_PRESETS as readonly number[]).find((v) => v > current);
    if (target == null) {
      target = ZOOM_LIMITS.MAX;
    }

    const { scale: newScale, offset: newOffset } =
      calculateCenterZoomToTargetScale(
        canvasSize,
        scale,
        offset,
        target,
        ZOOM_LIMITS.MIN,
        ZOOM_LIMITS.MAX
      );

    scaleRef.current = newScale;
    offsetRef.current = newOffset;
    setScale(newScale);
    setOffset(newOffset);
    scheduleDraw();
  }, [canvasSize, scale, offset, setScale, setOffset, scheduleDraw]);

  const zoomOut = useCallback(() => {
    const current = scale;
    // 找到小于当前 scale 的最后一个预设
    let target = [...(ZOOM_PRESETS as readonly number[])]
      .reverse()
      .find((v) => v < current);
    if (target == null) {
      target = ZOOM_LIMITS.MIN;
    }

    const { scale: newScale, offset: newOffset } =
      calculateCenterZoomToTargetScale(
        canvasSize,
        scale,
        offset,
        target,
        ZOOM_LIMITS.MIN,
        ZOOM_LIMITS.MAX
      );

    scaleRef.current = newScale;
    offsetRef.current = newOffset;
    setScale(newScale);
    setOffset(newOffset);
    scheduleDraw();
  }, [canvasSize, scale, offset, setScale, setOffset, scheduleDraw]);

  // 重置视图 - 居中显示画布
  const resetView = useCallback(() => {
    const newScale = 1;
    // 计算让画布中心对应视口中心的偏移量
    const worldCanvasWidth = gridSize * pixelSize;
    const worldCanvasHeight = gridSize * pixelSize;
    const centerX = canvasSize.width / 2 / newScale - worldCanvasWidth / 2;
    const centerY = canvasSize.height / 2 / newScale - worldCanvasHeight / 2;

    const newOffset = { x: centerX, y: centerY };

    // 同步到 refs，确保立即生效
    scaleRef.current = newScale;
    offsetRef.current = newOffset;

    setScale(newScale);
    setOffset(newOffset);
    scheduleDraw();
  }, [gridSize, pixelSize, canvasSize, setScale, setOffset, scheduleDraw]);

  // 导出为 PNG（合并离屏静态层与用户层，不包含网格线）
  const exportPNG = useCallback(
    async (options?: { scale?: number; backgroundColor?: string | null }) => {
      const scale = options?.scale ?? 1;
      const backgroundColor = options?.backgroundColor ?? null; // 默认透明

      ensureLayer();
      const staticCanvas = staticLayerCanvasRef.current;
      const userCanvas = userLayerCanvasRef.current;
      const size = gridSizeRef.current;
      if (!staticCanvas || !userCanvas || size <= 0) return null;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = Math.max(1, Math.floor(size * scale));
      exportCanvas.height = Math.max(1, Math.floor(size * scale));
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = false;

      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      }

      // 绘制静态与用户图层
      if (scale === 1) {
        ctx.drawImage(staticCanvas, 0, 0);
        ctx.drawImage(userCanvas, 0, 0);
      } else {
        ctx.drawImage(
          staticCanvas,
          0,
          0,
          size,
          size,
          0,
          0,
          exportCanvas.width,
          exportCanvas.height
        );
        ctx.drawImage(
          userCanvas,
          0,
          0,
          size,
          size,
          0,
          0,
          exportCanvas.width,
          exportCanvas.height
        );
      }

      return await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob((blob) => resolve(blob), "image/png");
      });
    },
    [ensureLayer]
  );

  return {
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
  };
};
