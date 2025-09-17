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
  onRefresh 
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
              className="p-1.5 rounded hover:bg-background/50 transition-colors disabled:opacity-50"
              title="刷新数据"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
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
          <h3 className="font-semibold text-sm">Pixel Land Canvas</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Total Painted: <span className="font-medium text-foreground">{canvasInfo.paintedPixelCount.toLocaleString()}</span> pixels
            </span>
            <span className="flex items-center gap-2">
              Total Value: <span className="font-medium text-foreground">{canvasInfo.totalValue.toFixed(6)}</span> BTC
              {lastRefreshTime && (
                <span className="text-xs">
                  ({lastRefreshTime.toLocaleTimeString()})
                </span>
              )}
            </span>
          </div>
        </div>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded hover:bg-background/50 transition-colors disabled:opacity-50"
            title="刷新数据"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </Card>
  );
}
