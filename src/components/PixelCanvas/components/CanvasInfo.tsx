import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import type { CanvasInfo } from "@/types/canvas";

interface CanvasInfoDisplayProps {
  /** Canvas information */
  canvasInfo?: CanvasInfo;
  /** Whether refreshing */
  isRefreshing?: boolean;
  /** Last refresh time */
  lastRefreshTime?: Date;
  /** Refresh handler */
  onRefresh?: () => void;
}

export function CanvasInfo({
  canvasInfo,
  isRefreshing = false,
  lastRefreshTime,
  onRefresh,
}: CanvasInfoDisplayProps) {
  if (!canvasInfo) {
    return (
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Loading canvas information...
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 border-2 border-border hover:bg-accent hover:border-accent transition-all disabled:opacity-50 cursor-pointer pixel-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              style={{ borderRadius: "var(--radius-sm)" }}
              title="Refresh data"
            >
              <RefreshCw
                className={`w-3 h-3 pixel-icon ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-xs sm:text-sm pixel-font-sm">Satoshi Canvas</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              Total Painted:{" "}
              <span className="font-medium text-foreground">
                {canvasInfo.paintedPixelCount.toLocaleString()}
              </span>{" "}
              pixels
            </span>
            <span className="flex items-center gap-2 flex-wrap">
              Total Value:{" "}
              <span className="font-medium text-foreground">
                {canvasInfo.totalValue.toFixed(6)}
              </span>{" "}
              BTC
              {lastRefreshTime && (
                <span className="text-xs hidden lg:inline">
                  (Last Updated: {lastRefreshTime.toLocaleTimeString()})
                </span>
              )}
            </span>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 border-2 border-border hover:bg-accent hover:border-accent transition-all disabled:opacity-50 cursor-pointer pixel-shadow-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            style={{ borderRadius: "var(--radius-sm)" }}
            title="Refresh data"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        )}
      </div>
    </Card>
  );
}
