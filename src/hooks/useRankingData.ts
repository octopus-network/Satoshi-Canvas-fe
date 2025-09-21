/**
 * Ranking data management Hook
 * Responsible for fetching ranking data and providing scheduled polling functionality
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
  /** Whether to enable automatic polling */
  enablePolling?: boolean;
  /** Polling interval (milliseconds), default 8 seconds */
  pollingInterval?: number;
  /** Maximum retry count */
  maxRetries?: number;
  /** Whether to fetch data immediately when component mounts */
  fetchOnMount?: boolean;
}

export interface UseRankingDataReturn {
  /** Ranking participants data */
  participants: Participant[];
  /** Data state */
  dataState: CanvasDataState;
  /** Manually refresh data */
  refreshData: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Whether polling is active */
  isPolling: boolean;
}

// Default data state
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

  // Ranking data state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [dataState, setDataState] = useState<CanvasDataState>(DEFAULT_DATA_STATE);

  // Polling control
  const [isPolling, setIsPolling] = useState(false);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Polling pause control
  const [isPaused, setIsPaused] = useState(false);
  const pauseTimeRef = useRef<number>(0); // Pause start time
  const remainingTimeRef = useRef<number>(0); // Remaining wait time
  
  // Use ref to avoid stale closure values
  const isPollingRef = useRef(isPolling);
  const isPausedRef = useRef(isPaused);
  
  // Global drawing state
  const { isDrawing } = useDrawingStore();
  
  // Sync state to ref
  useEffect(() => {
    isPollingRef.current = isPolling;
  }, [isPolling]);
  
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setDataState(prev => ({ ...prev, isLoading: true, error: null }));

      const apiRanking = await fetchRankingDataWithRetry(maxRetries);
      
      if (!isMountedRef.current) return;

      // Convert data format
      const participantsData = convertApiRankingToParticipants(apiRanking);

      setParticipants(participantsData);
      setDataState({
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      // console.log(`✅ Ranking data update successful: ${participantsData.length} participants`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Failed to fetch ranking data:", errorMessage);
      
      if (!isMountedRef.current) return;

      setDataState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [maxRetries]);

  // Start polling
  const startPolling = useCallback(() => {
    console.info('>>> [useRankingData] startPolling - isPolling:', isPollingRef.current, 'hasTimer:', !!pollingTimeoutRef.current, 'enablePolling:', enablePolling);
    
    // Check if it's actually running: state is true and has actual timer
    if (isPollingRef.current && pollingTimeoutRef.current) {
      // console.log("🔄 Skip starting ranking polling: polling already running");
      return;
    }

    // If state is inconsistent, clean up first
    if (isPollingRef.current && !pollingTimeoutRef.current) {
      // console.log("🔧 Fix inconsistent state: state is true but no timer, reset state");
      setIsPolling(false);
    }

    setIsPolling(true);
    setIsPaused(false);
    remainingTimeRef.current = pollingInterval;
    // console.log(`🔄 Start polling ranking data, interval: ${pollingInterval}ms`);

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

  // Pause polling
  const pausePolling = useCallback(() => {
    console.info('>>> [useRankingData] pausePolling - isPolling:', isPollingRef.current, 'isPaused:', isPausedRef.current, 'enablePolling:', enablePolling);
    
    // Only pause if polling is enabled, running, and not already paused
    if (!enablePolling || !isPollingRef.current || isPausedRef.current) {
      // console.log("⏸️ Skip pausing ranking polling: polling not enabled or already paused");
      return;
    }

    // console.log("⏸️ Pause ranking polling (user is drawing)");
    setIsPaused(true);
    pauseTimeRef.current = Date.now();

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, [enablePolling]);

  // Resume polling
  const resumePolling = useCallback(() => {
    console.info('>>> [useRankingData] resumePolling - isPolling:', isPollingRef.current, 'isPaused:', isPausedRef.current, 'enablePolling:', enablePolling);
    
    if (!enablePolling) {
      // console.log("▶️ Skip resuming ranking polling: polling not enabled");
      return;
    }

    // If polling is not running, start polling first
    if (!isPollingRef.current) {
      // console.log("▶️ Start ranking polling (user finished drawing, polling not running)");
      startPolling();
      return;
    }

    // If polling is running but not paused, no action needed
    if (!isPausedRef.current) {
      // console.log("▶️ Skip resuming ranking polling: polling not paused");
      return;
    }

    // console.log("▶️ Resume ranking polling (user finished drawing)");
    setIsPaused(false);

    const poll = async () => {
      if (!isMountedRef.current || !isPollingRef.current || isPausedRef.current) return;

      await fetchData();

      if (isMountedRef.current && isPollingRef.current && !isPausedRef.current) {
        pollingTimeoutRef.current = setTimeout(poll, pollingInterval);
      }
    };

    // Calculate remaining time and resume polling
    const pauseDuration = Date.now() - pauseTimeRef.current;
    const adjustedInterval = Math.max(0, remainingTimeRef.current - pauseDuration);
    
    // console.log(`🔄 Resume ranking polling, delay: ${adjustedInterval}ms`);
    pollingTimeoutRef.current = setTimeout(poll, adjustedInterval);
    remainingTimeRef.current = pollingInterval; // Reset to full interval
  }, [fetchData, pollingInterval, enablePolling, startPolling]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    // console.log("⏹️ Stop polling ranking data");
  }, []);

  // Manually refresh data
  const refreshData = useCallback(async () => {
    // console.log("🔄 Manually refresh ranking data");
    await fetchData();
  }, [fetchData]);

  // Save function reference to ref to avoid dependency array issues
  const startPollingRef = useRef(startPolling);
  const stopPollingRef = useRef(stopPolling);
  const pausePollingRef = useRef(pausePolling);
  const resumePollingRef = useRef(resumePolling);
  const fetchDataRef = useRef(fetchData);

  // Sync function references
  useEffect(() => {
    startPollingRef.current = startPolling;
    stopPollingRef.current = stopPolling;
    pausePollingRef.current = pausePolling;
    resumePollingRef.current = resumePolling;
    fetchDataRef.current = fetchData;
  });

  // Component mount initialization - execute only once
  useEffect(() => {
    isMountedRef.current = true;

    // Ensure initial state is clean
    setIsPolling(false);
    setIsPaused(false);
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    // Fetch data once immediately
    if (fetchOnMount) {
      fetchDataRef.current();
    }

    // Start polling
    if (enablePolling) {
      // Use setTimeout to avoid immediate polling conflict with initial fetch
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
  }, [fetchOnMount, enablePolling, pollingInterval]); // Remove function dependencies

  // Component unmount cleanup - execute only once
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPollingRef.current();
    };
  }, []); // Remove function dependencies

  // Listen to drawing state changes, auto pause/resume polling
  useEffect(() => {
    // Avoid immediate execution during initialization, wait for polling to really start
    if (!enablePolling) return;
    
    if (isDrawing) {
      pausePollingRef.current();
    } else {
      // Only resume if polling has already started
      if (isPollingRef.current) {
        resumePollingRef.current();
      }
    }
  }, [isDrawing, enablePolling]); // Remove function dependencies

  // Restart polling when polling interval changes
  useEffect(() => {
    if (isPollingRef.current) {
      stopPollingRef.current();
      setTimeout(() => startPollingRef.current(), 100); // Brief delay before restarting
    }
  }, [pollingInterval]); // Remove state and function dependencies

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
