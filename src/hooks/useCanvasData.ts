/**
 * Canvas 数据管理 Hook
 * 负责获取画布数据并提供定时轮询功能
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { CanvasInfo, CanvasDataState, CanvasState } from "@/types/canvas";
import type { PixelData } from "@/components/PixelCanvas/types";
import {
  fetchCanvasDataWithRetry,
  convertApiPixelsToPixelData,
  generateCanvasInfo,
  CANVAS_API,
} from "@/services/canvas.service";
import { useDrawingStore } from "@/store/useDrawingStore";

export interface UseCanvasDataOptions {
  /** 是否启用自动轮询 */
  enablePolling?: boolean;
  /** 轮询间隔（毫秒），默认8秒 */
  pollingInterval?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否在组件挂载时立即获取数据 */
  fetchOnMount?: boolean;
}

export interface UseCanvasDataReturn {
  /** 画布状态 */
  canvasState: CanvasState;
  /** 手动刷新数据 */
  refreshData: () => Promise<void>;
  /** 开始轮询 */
  startPolling: () => void;
  /** 停止轮询 */
  stopPolling: () => void;
  /** 是否正在轮询 */
  isPolling: boolean;
  /** 购买后轮询刷新 */
  startPurchasePolling: (originalData: PixelData[]) => Promise<void>;
}

// 默认空画布信息
const DEFAULT_CANVAS_INFO: CanvasInfo = {
  paintedPixelCount: 0,
  totalValue: 0,
  paintedPixelInfoList: [],
};

// 默认数据状态
const DEFAULT_DATA_STATE: CanvasDataState = {
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export function useCanvasData(
  options: UseCanvasDataOptions = {}
): UseCanvasDataReturn {
  const {
    enablePolling = true,
    pollingInterval = CANVAS_API.POLLING_INTERVAL,
    maxRetries = 3,
    fetchOnMount = true,
  } = options;

  // 画布数据状态
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo>(DEFAULT_CANVAS_INFO);
  const [initialPixelData, setInitialPixelData] = useState<PixelData[]>([]);
  const [dataState, setDataState] =
    useState<CanvasDataState>(DEFAULT_DATA_STATE);

  // 轮询控制
  const [isPolling, setIsPolling] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 轮询暂停控制
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeRef = useRef<number>(0); // 暂停开始时间
  const remainingTimeRef = useRef<number>(0); // 剩余等待时间

  // 使用 ref 避免闭包陈旧值
  const isPollingRef = useRef(isPolling);
  const isPausedRef = useRef(isPaused);

  // 全局绘制状态
  const { isDrawing } = useDrawingStore();

  // 同步状态到 ref
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 获取数据函数
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setDataState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetchCanvasDataWithRetry(maxRetries);

      if (!isMountedRef.current) return;

      // 转换数据格式
      const pixelData = convertApiPixelsToPixelData(response.pixels);
      const canvasInfo = generateCanvasInfo(response.pixels);

      // 详细的调试信息
      console.log("🔍 API 返回的原始数据:", response.pixels);
      console.log("🔍 转换后的像素数据:", pixelData);
      console.log("🔍 画布信息:", canvasInfo);

      setInitialPixelData(pixelData);
      setCanvasInfo(canvasInfo);
      setDataState({
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      console.log(
        `✅ 画布数据更新成功: ${pixelData.length} 个像素, 总价值: ${canvasInfo.totalValue.toFixed(6)} BTC`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("❌ 获取画布数据失败:", errorMessage);

      if (!isMountedRef.current) return;

      setDataState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [maxRetries]);

  // 开始轮询
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    setIsPaused(false);
    remainingTimeRef.current = pollingInterval;
    console.log(
      `🔄 开始轮询画布数据，间隔: ${pollingInterval}ms`,
      isMountedRef.current,
      isPollingRef.current,
      isPausedRef.current
    );

    const poll = async () => {
      if (!isMountedRef.current || isPausedRef.current) return;

      await fetchData();

      if (isMountedRef.current && !isPausedRef.current) {
        remainingTimeRef.current = pollingInterval;
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
      }
    };

    poll();
  }, [fetchData, pollingInterval, enablePolling]);

  // 暂停轮询
  const pausePolling = useCallback(() => {
    console.info(
      ">>> [useCanvasData] pausePolling - isPolling:",
      isPollingRef.current,
      "isPaused:",
      isPausedRef.current,
      "enablePolling:",
      enablePolling
    );

    // 只有在轮询启用且正在运行且未暂停时才需要暂停
    if (!enablePolling || !isPollingRef.current || isPausedRef.current) {
      console.log("⏸️ 跳过暂停画布轮询：轮询未启用或已暂停");
      return;
    }

    console.log("⏸️ 暂停画布轮询（用户正在绘制）");
    setIsPaused(true);
    pauseTimeRef.current = Date.now();

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, [enablePolling]);

  // 恢复轮询
  const resumePolling = useCallback(() => {
    console.info(
      ">>> [useCanvasData] resumePolling - isPolling:",
      isPollingRef.current,
      "isPaused:",
      isPausedRef.current,
      "enablePolling:",
      enablePolling
    );

    if (!enablePolling) {
      console.log("▶️ 跳过恢复画布轮询：轮询未启用");
      return;
    }

    // 如果轮询没有运行，先启动轮询
    if (!isPollingRef.current) {
      console.log("▶️ 启动画布轮询（用户结束绘制，轮询未运行）");
      startPolling();
      return;
    }

    // 如果轮询运行中但未暂停，无需操作
    if (!isPausedRef.current) {
      console.log("▶️ 跳过恢复画布轮询：轮询未暂停");
      return;
    }

    console.log("▶️ 恢复画布轮询（用户结束绘制）");
    setIsPaused(false);

    const poll = async () => {
      if (!isMountedRef.current || !isPollingRef.current || isPausedRef.current)
        return;

      await fetchData();

      if (
        isMountedRef.current &&
        isPollingRef.current &&
        !isPausedRef.current
      ) {
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
      }
    };

    // 计算剩余时间并恢复轮询
    const pauseDuration = Date.now() - pauseTimeRef.current;
    const adjustedInterval = Math.max(
      0,
      remainingTimeRef.current - pauseDuration
    );

    console.log(`🔄 恢复轮询，延迟: ${adjustedInterval}ms`);
    pollingTimeoutRef.current = setTimeout(poll, adjustedInterval);
    remainingTimeRef.current = pollingInterval; // 重置为完整间隔
  }, [fetchData, pollingInterval, enablePolling, startPolling]);

  // 停止轮询
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    console.log("⏹️ 停止轮询画布数据");
  }, []);

  // 手动刷新数据
  const refreshData = useCallback(async () => {
    console.log("🔄 手动刷新画布数据");
    await fetchData();
  }, [fetchData]);

  // 比较两个像素数据数组是否有差异
  const hasDataChanged = useCallback(
    (oldData: PixelData[], newData: PixelData[]): boolean => {
      if (oldData.length !== newData.length) {
        return true;
      }

      // 创建映射进行比较
      const oldMap = new Map<string, string>();
      const newMap = new Map<string, string>();

      oldData.forEach((pixel) => {
        oldMap.set(`${pixel.x},${pixel.y}`, pixel.color);
      });

      newData.forEach((pixel) => {
        newMap.set(`${pixel.x},${pixel.y}`, pixel.color);
      });

      // 比较数量和内容
      if (oldMap.size !== newMap.size) {
        return true;
      }

      for (const [key, color] of oldMap) {
        if (newMap.get(key) !== color) {
          return true;
        }
      }

      return false;
    },
    []
  );

  // 购买后轮询刷新，直到数据发生变化
  const startPurchasePolling = useCallback(
    async (originalData: PixelData[]): Promise<void> => {
      console.log("🔄 开始购买后轮询，原始数据长度:", originalData.length);

      return new Promise((resolve) => {
        let pollCount = 0;
        const maxPolls = 30; // 最多轮询30次（30秒）

        const poll = async () => {
          try {
            pollCount++;
            console.log(`🔄 购买后轮询第 ${pollCount} 次`);

            const response = await fetchCanvasDataWithRetry(maxRetries);
            const newPixelData = convertApiPixelsToPixelData(response.pixels);

            // 检查数据是否发生变化
            const changed = hasDataChanged(originalData, newPixelData);
            console.log(`📊 数据变化检测: ${changed ? "有变化" : "无变化"}`);

            if (changed) {
              console.log("✅ 检测到数据变化，更新画布数据");

              // 更新状态
              const canvasInfo = generateCanvasInfo(response.pixels);
              setInitialPixelData(newPixelData);
              setCanvasInfo(canvasInfo);
              setDataState({
                isLoading: false,
                error: null,
                lastUpdated: new Date(),
              });

              resolve();
              return;
            }

            // 如果达到最大轮询次数，停止轮询
            if (pollCount >= maxPolls) {
              console.log("⏰ 达到最大轮询次数，停止轮询");
              resolve();
              return;
            }

            // 1秒后继续轮询
            setTimeout(poll, 1000);
          } catch (error) {
            console.error("❌ 购买后轮询失败:", error);
            // 出错时也继续轮询，直到达到最大次数
            if (pollCount < maxPolls) {
              setTimeout(poll, 1000);
            } else {
              resolve();
            }
          }
        };

        // 开始轮询
        poll();
      });
    },
    [maxRetries, hasDataChanged]
  );

  // 保存函数引用到 ref，避免依赖数组问题
  const startPollingRef = useRef(startPolling);
  const stopPollingRef = useRef(stopPolling);
  const pausePollingRef = useRef(pausePolling);
  const resumePollingRef = useRef(resumePolling);
  const fetchDataRef = useRef(fetchData);

  // 同步函数引用
  useEffect(() => {
    startPollingRef.current = startPolling;
    stopPollingRef.current = stopPolling;
    pausePollingRef.current = pausePolling;
    resumePollingRef.current = resumePolling;
    fetchDataRef.current = fetchData;
  });

  // 组件挂载时的初始化 - 只执行一次
  useEffect(() => {
    isMountedRef.current = true;

    // 确保初始状态是干净的
    setIsPolling(false);
    setIsPaused(false);
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // 立即获取一次数据
    if (fetchOnMount) {
      fetchDataRef.current();
    }

    // 启动轮询
    if (enablePolling) {
      // 使用 setTimeout 避免立即开始轮询与初始获取冲突
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startPollingRef.current();
        }
      }, pollingInterval);

      return () => {
        clearTimeout(timer);
      };
    }

    return undefined;
  }, [fetchOnMount, enablePolling, pollingInterval]); // 移除函数依赖

  // 组件卸载时清理 - 只执行一次
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPollingRef.current();
    };
  }, []); // 移除函数依赖

  // 监听绘制状态变化，自动暂停/恢复轮询
  useEffect(() => {
    // 避免初始化时立即执行，等轮询真正启动后再监听
    if (!enablePolling) return;

    if (isDrawing) {
      pausePollingRef.current();
    } else {
      // 只有在轮询已启动的情况下才恢复
      if (isPollingRef.current) {
        resumePollingRef.current();
      }
    }
  }, [isDrawing, enablePolling]); // 移除函数依赖

  // 轮询间隔变化时重新启动轮询
  useEffect(() => {
    if (isPollingRef.current) {
      stopPollingRef.current();
      setTimeout(() => startPollingRef.current(), 100); // 短暂延迟后重新启动
    }
  }, [pollingInterval]); // 移除状态和函数依赖

  return {
    canvasState: {
      canvasInfo,
      initialPixelData,
      dataState,
    },
    refreshData,
    startPolling,
    stopPolling,
    isPolling,
    startPurchasePolling,
  };
}

export default useCanvasData;
