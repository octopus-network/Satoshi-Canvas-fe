import React from "react";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { ApiPixel } from "@/services/canvas-client";

interface PixelInfoCardProps {
  pixel: ApiPixel | null;
  position: { x: number; y: number };
  panelSide: "left" | "right";
}

export const PixelInfoCard: React.FC<PixelInfoCardProps> = ({
  pixel,
  position,
  panelSide,
}) => {
  const { t } = useTranslation();
  
  // 即使没有 pixel 数据，也显示信息卡片（显示空像素信息）

  const formatPrice = (priceSatoshis: number) => {
    const btc = priceSatoshis / 100000000;
    if (btc >= 0.0001) {
      return `${btc.toFixed(6)} BTC`;
    }
    return `${priceSatoshis} sats`;
  };

  const formatTxid = (txid: string) => {
    if (txid.length <= 16) return txid;
    return `${txid.slice(0, 8)}...${txid.slice(-8)}`;
  };

  const handleViewTx = () => {
    if (!pixel?.txid) return;
    const url = `https://mempool.space/testnet4/tx/${pixel.txid}`;
    window.open(url, "_blank");
  };

  return (
    <div
      className={`absolute top-2 ${panelSide === "left" ? "left-2" : "right-2"} bg-background/95 border border-border rounded-lg px-4 py-3 text-sm shadow-lg pointer-events-auto min-w-[240px] max-w-[320px]`}
      style={{ zIndex: 20 }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              {t("pages.canvas.canvas.pixelInfo")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            ({position.x}, {position.y})
          </div>
        </div>

        <div className="space-y-1.5">
          {/* Owner */}
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">
              {t("pages.canvas.canvas.owner")}
            </div>
            <div className="text-sm font-mono text-foreground break-all">
              {pixel?.owner || "N/A"}
            </div>
          </div>

          {/* Price - Show for painted pixels, or show "Not painted" for empty pixels */}
          {pixel ? (
            pixel.price !== undefined ? (
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">
                  {t("pages.canvas.canvas.currentPrice")}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatPrice(pixel.price)}
                </div>
              </div>
            ) : null
          ) : (
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">
                {t("pages.canvas.canvas.status")}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("pages.canvas.canvas.notPainted")}
              </div>
            </div>
          )}

          {/* Transaction ID - Only show for painted pixels */}
          {pixel?.txid ? (
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {t("pages.canvas.canvas.transactionId")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground flex-1 truncate">
                  {formatTxid(pixel.txid)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleViewTx}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {t("pages.canvas.canvas.view")}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

