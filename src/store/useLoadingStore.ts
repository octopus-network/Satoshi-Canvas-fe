import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LoadingConfig {
  text?: string;
  className?: string;
  delay?: number;
  duration?: number; // Auto-hide duration, 0 means no auto-hide
}

interface LoadingState {
  isLoading: boolean;
  config: LoadingConfig;
  timeoutId: NodeJS.Timeout | null;
}

interface LoadingActions {
  showLoading: (config?: LoadingConfig) => void;
  hideLoading: () => void;
  setConfig: (config: LoadingConfig) => void;
}

export type LoadingStore = LoadingState & LoadingActions;

export const useLoadingStore = create<LoadingStore>()(
  persist(
    (set, get) => ({
      // State
      isLoading: false,
      config: {},
      timeoutId: null,

      // Show Loading
      showLoading: (config: LoadingConfig = {}) => {
        const { timeoutId } = get();

        // Clear previous timer
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Apply delayed display
        const delay = config.delay || 0;

        const showHandler = () => {
          set({
            isLoading: true,
            config,
            timeoutId: null,
          });

          // If duration is set, auto-hide
          if (config.duration && config.duration > 0) {
            const hideTimeoutId = setTimeout(() => {
              set({ isLoading: false, timeoutId: null });
            }, config.duration);

            set({ timeoutId: hideTimeoutId });
          }
        };

        if (delay > 0) {
          const delayTimeoutId = setTimeout(showHandler, delay);
          set({ timeoutId: delayTimeoutId });
        } else {
          showHandler();
        }
      },

      // Hide Loading
      hideLoading: () => {
        const { timeoutId } = get();

        // Clear timer
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        set({
          isLoading: false,
          timeoutId: null,
        });
      },

      // Set configuration
      setConfig: (config: LoadingConfig) => {
        set({ config });
      },
    }),
    {
      name: "loading-store",
      // Only persist configuration, not loading state
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

// Convenient Loading controller
export class LoadingController {
  /**
   * Show global Loading
   * @param config Loading configuration
   */
  static show(config?: LoadingConfig) {
    useLoadingStore.getState().showLoading(config);
  }

  /**
   * Hide global Loading
   */
  static hide() {
    useLoadingStore.getState().hideLoading();
  }

  /**
   * Show Loading for specified time then auto-hide
   * @param duration Duration (milliseconds)
   * @param config Other configuration
   */
  static showFor(duration: number, config?: Omit<LoadingConfig, "duration">) {
    LoadingController.show({ ...config, duration });
  }

  /**
   * Delayed show Loading
   * @param delay Delay time (milliseconds)
   * @param config Other configuration
   */
  static showWithDelay(delay: number, config?: Omit<LoadingConfig, "delay">) {
    LoadingController.show({ ...config, delay });
  }

  /**
   * Async operation wrapper
   * @param asyncFn Async function
   * @param config Loading configuration
   */
  static async withLoading<T>(
    asyncFn: () => Promise<T>,
    config?: LoadingConfig
  ): Promise<T> {
    try {
      LoadingController.show(config);
      const result = await asyncFn();
      return result;
    } finally {
      LoadingController.hide();
    }
  }

  /**
   * Get current Loading state
   */
  static get isLoading() {
    return useLoadingStore.getState().isLoading;
  }
}

// Export convenience functions
export const showGlobalLoading = LoadingController.show;
export const hideGlobalLoading = LoadingController.hide;
export const withGlobalLoading = LoadingController.withLoading;
