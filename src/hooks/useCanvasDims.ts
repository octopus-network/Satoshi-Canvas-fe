/**
 * Canvas dimensions management Hook
 * Fetches canvas dimensions from backend /head API
 */

import { useState, useEffect, useCallback } from "react";
import { fetchCanvasDims, getCurrentDims } from "@/services/canvas.service";

export interface UseCanvasDimsReturn {
  /** Canvas width */
  width: number;
  /** Canvas height */
  height: number;
  /** Whether dimensions are being fetched */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually refresh dimensions */
  refreshDims: () => Promise<void>;
}

/**
 * Hook to fetch and manage canvas dimensions
 * @param fetchOnMount Whether to fetch dimensions on mount
 */
export function useCanvasDims(
  fetchOnMount: boolean = true
): UseCanvasDimsReturn {
  const [width, setWidth] = useState<number>(1024); // Default fallback
  const [height, setHeight] = useState<number>(576); // Default fallback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDims = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to get from current store first (if already initialized)
      const dims = getCurrentDims();
      if (dims.width > 0 && dims.height > 0) {
        setWidth(dims.width);
        setHeight(dims.height);
      } else {
        // If store not initialized, fetch from backend
        const fetchedDims = await fetchCanvasDims();
        setWidth(fetchedDims.width);
        setHeight(fetchedDims.height);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("❌ Failed to fetch canvas dimensions:", errorMessage);
      setError(errorMessage);
      // Keep default values on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchOnMount) {
      refreshDims();
    }
  }, [fetchOnMount, refreshDims]);

  return {
    width,
    height,
    isLoading,
    error,
    refreshDims,
  };
}

export default useCanvasDims;

