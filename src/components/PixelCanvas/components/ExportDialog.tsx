import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";

export type ExportMode = "full" | "partial";

interface ExportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onModeSelect: (mode: ExportMode) => void;
  exportMode: ExportMode;
  firstPoint: { x: number; y: number } | null;
  secondPoint: { x: number; y: number } | null;
  onExport: () => void;
  onResetSelection: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onOpenChange,
  onModeSelect,
  exportMode,
  firstPoint,
  secondPoint,
  onExport,
  onResetSelection,
}) => {
  const { t } = useTranslation();

  const handleCancel = () => {
    onOpenChange(false);
  };

  const canExport = exportMode === "full" || (firstPoint && secondPoint);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("pages.canvas.toolbar.export")}</DialogTitle>
          <DialogDescription>
            {t("pages.canvas.toolbar.exportDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Export mode selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("pages.canvas.toolbar.exportMode")}
            </label>
            <div className="flex gap-2">
              <Button
                variant={exportMode === "full" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeSelect("full")}
                className="flex-1"
              >
                {t("pages.canvas.toolbar.exportFull")}
              </Button>
              <Button
                variant={exportMode === "partial" ? "default" : "outline"}
                size="sm"
                onClick={() => onModeSelect("partial")}
                className="flex-1"
              >
                {t("pages.canvas.toolbar.exportPartial")}
              </Button>
            </div>
          </div>

          {/* Partial export instructions */}
          {exportMode === "partial" && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {firstPoint ? (
                  secondPoint ? (
                    <span>
                      {t("pages.canvas.toolbar.regionSelected")}: ({firstPoint.x}, {firstPoint.y}) - ({secondPoint.x}, {secondPoint.y})
                    </span>
                  ) : (
                    <span>
                      {t("pages.canvas.toolbar.selectSecondPoint")} ({firstPoint.x}, {firstPoint.y})
                    </span>
                  )
                ) : (
                  <span>{t("pages.canvas.toolbar.selectFirstPoint")}</span>
                )}
              </div>
              {firstPoint && secondPoint && (
                <div className="text-xs text-muted-foreground">
                  {t("pages.canvas.toolbar.regionSize")}: {Math.abs(secondPoint.x - firstPoint.x) + 1} × {Math.abs(secondPoint.y - firstPoint.y) + 1}
                </div>
              )}
              {firstPoint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onResetSelection}
                  className="w-full"
                >
                  {t("pages.canvas.toolbar.resetSelection")}
                </Button>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onExport} disabled={!canExport}>
            <Download className="w-4 h-4 mr-2" />
            {t("pages.canvas.toolbar.exportButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

