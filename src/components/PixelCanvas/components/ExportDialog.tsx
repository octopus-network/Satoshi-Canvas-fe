import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Download, XIcon } from "lucide-react";

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
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="sm:max-w-2xl overflow-hidden p-0 gap-0 !flex !flex-col"
      >
        <div className="bg-background border-b px-6 py-4 flex items-center justify-between shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle>{t("pages.canvas.toolbar.export")}</DialogTitle>
            <DialogDescription className="mt-2">
              {t("pages.canvas.toolbar.exportDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogClose className="ring-offset-background focus:ring-ring rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none inline-flex items-center justify-center size-9 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 cursor-pointer">
            <XIcon className="w-5 h-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1">
          <div className="space-y-4">
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
                  className="flex-1 cursor-pointer"
                >
                  {t("pages.canvas.toolbar.exportFull")}
                </Button>
                <Button
                  variant={exportMode === "partial" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onModeSelect("partial")}
                  className="flex-1 cursor-pointer"
                >
                  {t("pages.canvas.toolbar.exportPartial")}
                </Button>
              </div>
            </div>

            {/* Partial export instructions */}
            {exportMode === "partial" && (
              <div className="space-y-2 border border-border rounded-lg p-4 bg-card">
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
                    className="w-full cursor-pointer"
                  >
                    {t("pages.canvas.toolbar.resetSelection")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-background border-t px-6 py-4 flex gap-2 justify-end shrink-0">
          <Button variant="outline" onClick={handleCancel} className="cursor-pointer">
            {t("common.cancel")}
          </Button>
          <Button onClick={onExport} disabled={!canExport} className="cursor-pointer">
            <Download className="w-4 h-4 mr-2" />
            {t("pages.canvas.toolbar.exportButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

