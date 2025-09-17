/**
 * Ranking 数据管理 Hook
 * 负责获取排行榜数据并提供定时轮询功能
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Participant, CanvasDataState } from "@/types/canvas";
import {
  fetchRankingDataWithRetry,
  convertApiRankingToParticipants,
  CANVAS_API,
} from "@/services/canvas.service";

export interface UseRankingDataOptions {
  /** 是否启用自动轮询 */
  enablePolling?: boolean;
  /** 轮询间隔（毫秒），默认8秒 */
  pollingInterval?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否在组件挂载时立即获取数据 */
  fetchOnMount?: boolean;
}

export interface UseRankingDataReturn {
  /** 排行榜参与者数据 */
  participants: Participant[];
  /** 数据状态 */
  dataState: CanvasDataState;
  /** 手动刷新数据 */
  refreshData: () => Promise<void>;
  /** 开始轮询 */
  startPolling: () => void;
  /** 停止轮询 */
  stopPolling: () => void;
  /** 是否正在轮询 */
  isPolling: boolean;
}

// 默认数据状态
const DEFAULT_DATA_STATE: CanvasDataState = {
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export function useRankingData(options: UseRankingDataOptions = {}): UseRankingDataReturn {
  const {
    enablePolling = true,
    pollingInterval = CANVAS_API.POLLING_INTERVAL,
    maxRetries = 3,
    fetchOnMount = true,
  } = options;

  // 排行榜数据状态
  const [participants, setParticipants] = useState<Participant[]>([]);
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

      const apiRanking = await fetchRankingDataWithRetry(maxRetries);
      
      if (!isMountedRef.current) return;

      // 转换数据格式
      const participantsData = convertApiRankingToParticipants(apiRanking);

      setParticipants(participantsData);
      setDataState({
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      console.log(`✅ 排行榜数据更新成功: ${participantsData.length} 个参与者`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error("❌ 获取排行榜数据失败:", errorMessage);
      
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
    console.log(`🔄 开始轮询排行榜数据，间隔: ${pollingInterval}ms`);

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
    console.log("⏹️ 停止轮询排行榜数据");
  }, []);

  // 手动刷新数据
  const refreshData = useCallback(async () => {
    console.log("🔄 手动刷新排行榜数据");
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
    participants,
    dataState,
    refreshData,
    startPolling,
    stopPolling,
    isPolling,
  };
}

export default useRankingData;
