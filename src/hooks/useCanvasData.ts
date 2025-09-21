/**
 * Canvas data management Hook
 * Responsible for fetching canvas data and providing scheduled polling functionality
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
  /** Whether to enable automatic polling */
  enablePolling?: boolean;
  /** Polling interval (milliseconds), default 8 seconds */
  pollingInterval?: number;
  /** Maximum retry count */
  maxRetries?: number;
  /** Whether to fetch data immediately when component mounts */
  fetchOnMount?: boolean;
}

export interface UseCanvasDataReturn {
  /** Canvas state */
  canvasState: CanvasState;
  /** Manually refresh data */
  refreshData: () => Promise<void>;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Whether polling is active */
  isPolling: boolean;
  /** Post-purchase polling refresh */
  startPurchasePolling: (originalData: PixelData[]) => Promise<void>;
}

// Default empty canvas info
const DEFAULT_CANVAS_INFO: CanvasInfo = {
  paintedPixelCount: 0,
  totalValue: 0,
  paintedPixelInfoList: [],
};

// Default data state
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

  // Canvas data state
  const [canvasInfo, setCanvasInfo] = useState<CanvasInfo>(DEFAULT_CANVAS_INFO);
  const [initialPixelData, setInitialPixelData] = useState<PixelData[]>([]);
  const [dataState, setDataState] =
    useState<CanvasDataState>(DEFAULT_DATA_STATE);

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
      setDataState((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetchCanvasDataWithRetry(maxRetries);

      if (!isMountedRef.current) return;

      // Convert data format
      const pixelData = convertApiPixelsToPixelData(response.pixels);
      const canvasInfo = generateCanvasInfo(response.pixels);

      // Detailed debug information
      // console.log("🔍 Raw data returned by API:", response.pixels);
      // console.log("🔍 Converted pixel data:", pixelData);
      // console.log("🔍 Canvas info:", canvasInfo);

      setInitialPixelData(pixelData);
      setCanvasInfo(canvasInfo);
      setDataState({
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      // console.log(
      //   `✅ Canvas data update successful: ${pixelData.length} pixels, total value: ${canvasInfo.totalValue.toFixed(6)} BTC`
      // );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Failed to fetch canvas data:", errorMessage);

      if (!isMountedRef.current) return;

      setDataState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [maxRetries]);

  // Start polling
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    setIsPaused(false);
    remainingTimeRef.current = pollingInterval;
    // console.log(
    //   `🔄 Start polling canvas data, interval: ${pollingInterval}ms`,
    //   isMountedRef.current,
    //   isPollingRef.current,
    //   isPausedRef.current
    // );

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

  // Pause polling
  const pausePolling = useCallback(() => {
    console.info(
      ">>> [useCanvasData] pausePolling - isPolling:",
      isPollingRef.current,
      "isPaused:",
      isPausedRef.current,
      "enablePolling:",
      enablePolling
    );

    // Only pause if polling is enabled, running, and not already paused
    if (!enablePolling || !isPollingRef.current || isPausedRef.current) {
      // console.log("⏸️ Skip pausing canvas polling: polling not enabled or already paused");
      return;
    }

    // console.log("⏸️ Pause canvas polling (user is drawing)");
    setIsPaused(true);
    pauseTimeRef.current = Date.now();

    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }, [enablePolling]);

  // Resume polling
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
      // console.log("▶️ Skip resuming canvas polling: polling not enabled");
      return;
    }

    // If polling is not running, start polling first
    if (!isPollingRef.current) {
      // console.log("▶️ Start canvas polling (user finished drawing, polling not running)");
      startPolling();
      return;
    }

    // If polling is running but not paused, no action needed
    if (!isPausedRef.current) {
      // console.log("▶️ Skip resuming canvas polling: polling not paused");
      return;
    }

    // console.log("▶️ Resume canvas polling (user finished drawing)");
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

    // Calculate remaining time and resume polling
    const pauseDuration = Date.now() - pauseTimeRef.current;
    const adjustedInterval = Math.max(
      0,
      remainingTimeRef.current - pauseDuration
    );

    // console.log(`🔄 Resume polling, delay: ${adjustedInterval}ms`);
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
    // console.log("⏹️ Stop polling canvas data");
  }, []);

  // Manually refresh data
  const refreshData = useCallback(async () => {
    // console.log("🔄 Manually refresh canvas data");
    await fetchData();
  }, [fetchData]);

  // Compare if two pixel data arrays have differences
  const hasDataChanged = useCallback(
    (oldData: PixelData[], newData: PixelData[]): boolean => {
      if (oldData.length !== newData.length) {
        return true;
      }

      // Create mapping for comparison
      const oldMap = new Map<string, string>();
      const newMap = new Map<string, string>();

      oldData.forEach((pixel) => {
        oldMap.set(`${pixel.x},${pixel.y}`, pixel.color);
      });

      newData.forEach((pixel) => {
        newMap.set(`${pixel.x},${pixel.y}`, pixel.color);
      });

      // Compare count and content
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

  // Post-purchase polling refresh until data changes
  const startPurchasePolling = useCallback(
    async (originalData: PixelData[]): Promise<void> => {
      // console.log("🔄 Start post-purchase polling, original data length:", originalData.length);

      return new Promise((resolve) => {
        let pollCount = 0;
        const maxPolls = 30; // Maximum 30 polls (30 seconds)

        const poll = async () => {
          try {
            pollCount++;
            // console.log(`🔄 Post-purchase polling attempt ${pollCount}`);

            const response = await fetchCanvasDataWithRetry(maxRetries);
            const newPixelData = convertApiPixelsToPixelData(response.pixels);

            // Check if data has changed
            const changed = hasDataChanged(originalData, newPixelData);
            // console.log(`📊 Data change detection: ${changed ? "Changed" : "No change"}`);

            if (changed) {
              // console.log("✅ Data change detected, updating canvas data");

              // Update state
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

            // If maximum poll count reached, stop polling
            if (pollCount >= maxPolls) {
              // console.log("⏰ Reached maximum polling attempts, stopping polling");
              resolve();
              return;
            }

            // Continue polling after 1 second
            setTimeout(poll, 1000);
          } catch (error) {
            console.error("❌ Post-purchase polling failed:", error);
            // Continue polling even on error until max attempts reached
            if (pollCount < maxPolls) {
              setTimeout(poll, 1000);
            } else {
              resolve();
            }
          }
        };

        // Start polling
        poll();
      });
    },
    [maxRetries, hasDataChanged]
  );

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
