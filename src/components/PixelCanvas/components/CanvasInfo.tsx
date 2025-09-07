import { Card } from "@/components/ui/card";
import type { CanvasInfo } from "@/types/canvas";

interface CanvasInfoDisplayProps {
  /** Canvas information */
  canvasInfo?: CanvasInfo;
}

export function CanvasInfo({ canvasInfo }: CanvasInfoDisplayProps) {
  if (!canvasInfo) {
    return (
      <Card className="p-3">
        <div className="text-sm text-muted-foreground">
          Loading canvas information...
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
            <span>
              Total Value: <span className="font-medium text-foreground">{canvasInfo.totalValue.toFixed(6)}</span> BTC
            </span>
            {/* <span>
              Pixel Data: <span className="font-medium text-foreground">{canvasInfo.paintedPixelInfoList.length.toLocaleString()}</span> entries
            </span> */}
          </div>
        </div>
      </div>
    </Card>
  );
}
