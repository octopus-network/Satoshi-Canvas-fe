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

export function useCanvasData(options: UseCanvasDataOptions = {}): UseCanvasDataReturn {
  const {
    enablePolling = true,
    pollingInterval = CANVAS_API.POLLING_INTERVAL,
    maxRetries = 3,
    fetchOnMount = true,
  } = options;

  // 画布数据状态
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo>(DEFAULT_CANVAS_INFO);
  const [initialPixelData, setInitialPixelData] = useState<PixelData[]>([]);
  const [dataState, setDataState] = useState<CanvasDataState>(DEFAULT_DATA_STATE);

  // 轮询控制
  const [isPolling, setIsPolling] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // 获取数据函数
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setDataState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetchCanvasDataWithRetry(maxRetries);
      
      if (!isMountedRef.current) return;

      // 转换数据格式
      const pixelData = convertApiPixelsToPixelData(response.pixels);
      const canvasInfo = generateCanvasInfo(response.pixels);

      setInitialPixelData(pixelData);
      setCanvasInfo(canvasInfo);
      setDataState({
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      console.log(`✅ 画布数据更新成功: ${pixelData.length} 个像素, 总价值: ${canvasInfo.totalValue.toFixed(6)} BTC`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("❌ 获取画布数据失败:", errorMessage);
      
      if (!isMountedRef.current) return;

      setDataState(prev => ({
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
    console.log(`🔄 开始轮询画布数据，间隔: ${pollingInterval}ms`);

    const poll = async () => {
      if (!isMountedRef.current || !isPolling) return;

      await fetchData();

      if (isMountedRef.current && isPolling) {
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
      }
    };

    poll();
  }, [fetchData, pollingInterval, isPolling]);

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

  // 组件挂载时的初始化
  useEffect(() => {
    isMountedRef.current = true;

    // 立即获取一次数据
    if (fetchOnMount) {
      fetchData();
    }

    // 启动轮询
    if (enablePolling) {
      // 使用 setTimeout 避免立即开始轮询与初始获取冲突
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          startPolling();
        }
      }, pollingInterval);

      return () => {
        clearTimeout(timer);
      };
    }

    return undefined;
  }, [fetchOnMount, enablePolling, startPolling, pollingInterval, fetchData]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  // 轮询间隔变化时重新启动轮询
  useEffect(() => {
    if (isPolling) {
      stopPolling();
      setTimeout(startPolling, 100); // 短暂延迟后重新启动
    }
  }, [pollingInterval, isPolling, stopPolling, startPolling]);

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
  };
}

export default useCanvasData;
