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
  emptyPixelPrice: number; // Fixed price per empty pixel
  onConfirm: () => void;
  isLoading?: boolean;
}

export function PurchaseDialog({
  isOpen,
  onOpenChange,
  userPixelData,
  paintedPixelInfoList,
  emptyPixelPrice,
  onConfirm,
  isLoading = false,
}: PurchaseDialogProps) {
  // Calculate pricing information
  const calculatePricing = () => {
    const paintedPixelMap = new Map<string, number>();
    paintedPixelInfoList.forEach((pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      paintedPixelMap.set(key, pixel.price);
    });

    let emptyPixelCount = 0;
    let repaintPixelCount = 0;
    let repaintTotalPrice = 0;

    userPixelData.forEach((pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      if (paintedPixelMap.has(key)) {
        // Previously painted pixels
        repaintPixelCount++;
        repaintTotalPrice += paintedPixelMap.get(key)!;
      } else {
        // Empty pixels
        emptyPixelCount++;
      }
    });

    const emptyPixelTotalPrice = emptyPixelCount * emptyPixelPrice;
    const totalPrice = emptyPixelTotalPrice + repaintTotalPrice;

    return {
      emptyPixelCount,
      emptyPixelPrice,
      emptyPixelTotalPrice,
      repaintPixelCount,
      repaintTotalPrice,
      totalPrice,
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
              Confirm Purchase
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              You are about to purchase drawing rights for{" "}
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
                  Pricing Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {pricing.emptyPixelCount > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">
                        Empty Pixels × {pricing.emptyPixelCount}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {pricing.emptyPixelPrice.toFixed(6)} BTC/pixel
                      </span>
                    </div>
                    <span className="font-mono text-sm">
                      {pricing.emptyPixelTotalPrice.toFixed(6)} BTC
                    </span>
                  </div>
                )}

                {pricing.repaintPixelCount > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">
                      Repaint Cost
                    </span>
                    <span className="font-mono text-sm">
                      {pricing.repaintTotalPrice.toFixed(6)} BTC
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t px-4 py-4">
          {/* Total Price Summary */}
          <div className="flex items-center justify-between py-3 mb-4 bg-muted/30 rounded-lg px-4">
            <span className="text-base font-medium">Total Amount</span>
            <span className="text-lg font-bold font-mono">
              {pricing.totalPrice.toFixed(6)} BTC
            </span>
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
              {isLoading ? "Processing..." : "Confirm Purchase"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
