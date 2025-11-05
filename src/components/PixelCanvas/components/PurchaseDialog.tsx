import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PixelData } from "../types";
import type { PixelInfo } from "@/types/canvas";

interface PurchaseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userPixelData: PixelData[];
  paintedPixelInfoList: PixelInfo[];
  emptyPixelPrice?: number; // Deprecated - price is now hardcoded as 1 satoshi
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PurchaseDialog({
  isOpen,
  onOpenChange,
  userPixelData,
  paintedPixelInfoList,
  emptyPixelPrice: _emptyPixelPrice, // Deprecated parameter
  onConfirm,
  isLoading = false,
}: PurchaseDialogProps) {
  // Calculate pricing information
  const calculatePricing = () => {
    const paintedPixelMap = new Map<string, number>();
    paintedPixelInfoList.forEach((pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      // Convert pixel.price from BTC to satoshis for calculation
      paintedPixelMap.set(key, pixel.price * 100000000);
    });

    let emptyPixelCount = 0;
    let repaintPixelCount = 0;
    let repaintTotalPriceSatoshis = 0;

    userPixelData.forEach((pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      if (paintedPixelMap.has(key)) {
        // Previously painted pixels - use price from backend (in satoshis)
        repaintPixelCount++;
        repaintTotalPriceSatoshis += paintedPixelMap.get(key)!;
      } else {
        // Empty pixels
        emptyPixelCount++;
      }
    });

    // Empty pixel price is in satoshis, so calculate directly
    const emptyPixelPriceSatoshis = 1; // 1 satoshi per empty pixel
    const emptyPixelTotalPriceSatoshis = emptyPixelCount * emptyPixelPriceSatoshis;
    const totalPriceSatoshis = emptyPixelTotalPriceSatoshis + repaintTotalPriceSatoshis;

    return {
      emptyPixelCount,
      emptyPixelPrice: emptyPixelPriceSatoshis / 100000000, // Convert to BTC for display
      emptyPixelTotalPrice: emptyPixelTotalPriceSatoshis / 100000000, // Convert to BTC for display
      repaintPixelCount,
      repaintTotalPrice: repaintTotalPriceSatoshis / 100000000, // Convert to BTC for display
      totalPrice: totalPriceSatoshis / 100000000, // Convert to BTC for display
    };
  };

  const pricing = calculatePricing();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-h-[85vh] max-w-md flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 border-b px-4 py-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Confirm Draw
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              You are about to draw on {" "}
              {userPixelData.length} pixels.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-4 py-4 max-h-[440px] overflow-y-auto">
          <div className="space-y-4">
            {/* Drawing statistics */}
            <Card className="border-0 bg-muted/30 gap-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">
                  Drawing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {pricing.emptyPixelCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Empty Pixels
                    </span>
                    <Badge variant="outline" className="px-2 py-1">
                      {pricing.emptyPixelCount}
                    </Badge>
                  </div>
                )}

                {pricing.repaintPixelCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Repaint Pixels
                    </span>
                    <Badge variant="outline" className="px-2 py-1">
                      {pricing.repaintPixelCount}
                    </Badge>
                  </div>
                )}

                {/* Separator and total */}
                {(pricing.emptyPixelCount > 0 ||
                  pricing.repaintPixelCount > 0) && (
                  <div className="border-t pt-2 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Total Pixels
                      </span>
                      <Badge
                        variant="secondary"
                        className="px-2 py-1 font-medium"
                      >
                        {userPixelData.length}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* If no subitems, show total directly */}
                {pricing.emptyPixelCount === 0 &&
                  pricing.repaintPixelCount === 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Total Pixels
                      </span>
                      <Badge
                        variant="secondary"
                        className="px-3 py-1 font-medium"
                      >
                        {userPixelData.length}
                      </Badge>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Pricing details */}
            <Card className="border-0 bg-muted/30 gap-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">
                  Pricing Details (BTC)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {pricing.emptyPixelCount > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">
                        Empty Pixels × {pricing.emptyPixelCount}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground/70">
                        {pricing.emptyPixelPrice.toFixed(8)} BTC/pixel
                      </span>
                    </div>
                    <span className="font-mono text-sm">
                      {pricing.emptyPixelTotalPrice.toFixed(8)} BTC
                    </span>
                  </div>
                )}

                {pricing.repaintPixelCount > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">
                      Repaint Cost
                    </span>
                    <span className="font-mono text-sm">
                      {pricing.repaintTotalPrice.toFixed(8)} BTC
                    </span>
                  </div>
                )}

                {/* Network fee notice */}
                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-xs text-muted-foreground">
                      Network Fee
                    </span>
                    <span className="text-xs text-muted-foreground italic">
                      Calculated automatically
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Additional network fee will be calculated by the wallet when signing the transaction.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t px-4 py-4">
          {/* Total Price Summary */}
          <div className="flex flex-col gap-2 mb-4 bg-muted/30 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-medium">Pixel Cost (BTC)</span>
              <span className="text-lg font-bold font-mono">
                {pricing.totalPrice.toFixed(8)} BTC
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-muted">
              <span className="text-xs text-muted-foreground">
                + Network Fee (calculated by wallet)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              className="w-full sm:w-auto cursor-pointer"
            >
              {isLoading ? "Processing..." : "Confirm Draw"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
