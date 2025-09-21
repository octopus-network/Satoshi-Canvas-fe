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
import { useDrawingStore } from "@/store/useDrawingStore";

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

      // console.log(`✅ 排行榜数据更新成功: ${participantsData.length} 个参与者`);
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
    console.info('>>> [useRankingData] startPolling - isPolling:', isPollingRef.current, 'hasTimer:', !!pollingTimeoutRef.current, 'enablePolling:', enablePolling);
    
    // 检查是否真正在运行：状态为true且有实际定时器
    if (isPollingRef.current && pollingTimeoutRef.current) {
      // console.log("🔄 跳过启动排行榜轮询：轮询已在运行");
      return;
    }

    // 如果状态不一致，先清理
    if (isPollingRef.current && !pollingTimeoutRef.current) {
      // console.log("🔧 修复状态不一致：状态为true但无定时器，重置状态");
      setIsPolling(false);
    }

    setIsPolling(true);
    setIsPaused(false);
    remainingTimeRef.current = pollingInterval;
    // console.log(`🔄 开始轮询排行榜数据，间隔: ${pollingInterval}ms`);

    const poll = async () => {
      if (!isMountedRef.current || !isPollingRef.current || isPausedRef.current) return;

      await fetchData();

      if (isMountedRef.current && isPollingRef.current && !isPausedRef.current) {
        remainingTimeRef.current = pollingInterval;
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
      }
    };

    poll();
  }, [fetchData, pollingInterval, enablePolling]);

  // 暂停轮询
  const pausePolling = useCallback(() => {
    console.info('>>> [useRankingData] pausePolling - isPolling:', isPollingRef.current, 'isPaused:', isPausedRef.current, 'enablePolling:', enablePolling);
    
    // 只有在轮询启用且正在运行且未暂停时才需要暂停
    if (!enablePolling || !isPollingRef.current || isPausedRef.current) {
      // console.log("⏸️ 跳过暂停排行榜轮询：轮询未启用或已暂停");
      return;
    }

    // console.log("⏸️ 暂停排行榜轮询（用户正在绘制）");
    setIsPaused(true);
    pauseTimeRef.current = Date.now();

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, [enablePolling]);

  // 恢复轮询
  const resumePolling = useCallback(() => {
    console.info('>>> [useRankingData] resumePolling - isPolling:', isPollingRef.current, 'isPaused:', isPausedRef.current, 'enablePolling:', enablePolling);
    
    if (!enablePolling) {
      // console.log("▶️ 跳过恢复排行榜轮询：轮询未启用");
      return;
    }

    // 如果轮询没有运行，先启动轮询
    if (!isPollingRef.current) {
      // console.log("▶️ 启动排行榜轮询（用户结束绘制，轮询未运行）");
      startPolling();
      return;
    }

    // 如果轮询运行中但未暂停，无需操作
    if (!isPausedRef.current) {
      // console.log("▶️ 跳过恢复排行榜轮询：轮询未暂停");
      return;
    }

    // console.log("▶️ 恢复排行榜轮询（用户结束绘制）");
    setIsPaused(false);

    const poll = async () => {
      if (!isMountedRef.current || !isPollingRef.current || isPausedRef.current) return;

      await fetchData();

      if (isMountedRef.current && isPollingRef.current && !isPausedRef.current) {
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
      }
    };

    // 计算剩余时间并恢复轮询
    const pauseDuration = Date.now() - pauseTimeRef.current;
    const adjustedInterval = Math.max(0, remainingTimeRef.current - pauseDuration);
    
    // console.log(`🔄 恢复排行榜轮询，延迟: ${adjustedInterval}ms`);
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
    // console.log("⏹️ 停止轮询排行榜数据");
  }, []);

  // 手动刷新数据
  const refreshData = useCallback(async () => {
    // console.log("🔄 手动刷新排行榜数据");
    await fetchData();
  }, [fetchData]);

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
    participants,
    dataState,
    refreshData,
    startPolling,
    stopPolling,
    isPolling,
  };
}

export default useRankingData;
