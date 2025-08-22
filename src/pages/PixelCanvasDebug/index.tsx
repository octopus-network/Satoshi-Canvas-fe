import React, { useState, useRef } from "react";
import PixelCanvas, {
  PixelCanvasRef,
  DrawingOperation,
} from "@/components/PixelCanvas";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface PixelData {
  x: number;
  y: number;
  color: string;
}

const PixelCanvasDebug: React.FC = () => {
  const [gridSize, setGridSize] = useState<100 | 1000>(100);
  const [drawingOperations, setDrawingOperations] = useState<
    DrawingOperation[]
  >([]);
  const [initialData, setInitialData] = useState<PixelData[]>([]);
  const [userPixelCount, setUserPixelCount] = useState(0); // 用户绘制像素数量
  const canvasRef = useRef<PixelCanvasRef>(null);
  const { t } = useTranslation();

  // 生成测试数据
  const generateTestData = () => {
    const testData: PixelData[] = [
      // 创建一个简单的笑脸图案
      { x: 30, y: 25, color: "#FFD700" },
      { x: 31, y: 25, color: "#FFD700" },
      { x: 32, y: 25, color: "#FFD700" },
      { x: 33, y: 25, color: "#FFD700" },
      { x: 34, y: 25, color: "#FFD700" },
      { x: 35, y: 25, color: "#FFD700" },
      { x: 36, y: 25, color: "#FFD700" },
      { x: 37, y: 25, color: "#FFD700" },
      { x: 38, y: 25, color: "#FFD700" },
      { x: 39, y: 25, color: "#FFD700" },
      // 眼睛
      { x: 33, y: 28, color: "#000000" },
      { x: 37, y: 28, color: "#000000" },
      // 嘴巴
      { x: 32, y: 32, color: "#000000" },
      { x: 33, y: 33, color: "#000000" },
      { x: 34, y: 34, color: "#000000" },
      { x: 35, y: 34, color: "#000000" },
      { x: 36, y: 34, color: "#000000" },
      { x: 37, y: 33, color: "#000000" },
      { x: 38, y: 32, color: "#000000" },
    ];
    return testData;
  };

  // 导入测试数据
  const handleImportTestData = () => {
    const testData = generateTestData();
    setInitialData(testData);
  };

  // 获取当前画布数据
  const handleGetCurrentData = () => {
    if (canvasRef.current) {
      const currentData = canvasRef.current.getCurrentPixelData();
      console.log(t("pages.canvas.page.console.currentData"), currentData);
      alert(
        t("pages.canvas.page.alert.currentData", { count: currentData.length })
      );
    }
  };

  // 获取用户最终绘制数据
  const handleGetUserData = () => {
    if (canvasRef.current) {
      const userData = canvasRef.current.getUserDrawingData();
      console.log(t("pages.canvas.page.console.userData"), userData);
      alert(t("pages.canvas.page.alert.userData", { count: userData.length }));
    }
  };

  // 获取绘制操作记录
  const handleGetOperations = () => {
    if (canvasRef.current) {
      const operations = canvasRef.current.getDrawingOperations();
      console.log(t("pages.canvas.page.console.operations"), operations);
      alert(
        t("pages.canvas.page.alert.operations", { count: operations.length })
      );
    }
  };

  // 清空画布
  const handleClearCanvas = () => {
    if (canvasRef.current) {
      canvasRef.current.clearCanvas();
      setInitialData([]);
    }
  };

  // 初始化测试颜色到最近使用列表
  const handleInitTestColors = () => {
    alert(t("pages.canvas.page.alert.initTestColors"));
  };

  // 处理绘制操作变更
  const handleDrawingChange = (operations: DrawingOperation[]) => {
    setDrawingOperations(operations);
  };

  // 处理用户像素数量变更
  const handleUserPixelCountChange = (count: number) => {
    setUserPixelCount(count);
  };

  const importLargeTest = (size: number) => {
    if (!canvasRef.current) return;
    const currentSize = gridSize;
    const maxN = currentSize * currentSize;
    const N = Math.min(size, maxN);
    const data: PixelData[] = [];
    const step = Math.max(
      1,
      Math.floor(Math.sqrt((currentSize * currentSize) / N))
    );
    let count = 0;
    for (let y = 0; y < currentSize && count < N; y += step) {
      for (let x = 0; x < currentSize && count < N; x += step) {
        data.push({ x, y, color: "#000000" });
        count++;
      }
    }
    canvasRef.current.importData(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t("pages.canvas.page.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("pages.canvas.page.subtitle")}
          </p>
        </div>

        <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden w-full">
          <PixelCanvas
            ref={canvasRef}
            gridSize={gridSize}
            pixelSize={gridSize === 100 ? 6 : 2}
            onGridSizeChange={setGridSize}
            initialData={initialData}
            onDrawingChange={handleDrawingChange}
            onUserPixelCountChange={handleUserPixelCountChange}
          />
        </div>

        {/* 功能测试面板 */}
        <div className="bg-card rounded-lg shadow-md border border-border p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            {t("pages.canvas.page.testPanel.title")}
          </h2>
          <div className="flex flex-wrap gap-3 items-center">
            {/* 网格大小切换迁移到此 */}
            <span className="text-sm text-foreground">
              {t("pages.canvas.toolbar.gridSize")}
            </span>
            <Button
              className="cursor-pointer"
              variant={gridSize === 100 ? "default" : "outline"}
              onClick={() => setGridSize(100)}
            >
              100×100
            </Button>
            <Button
              className="cursor-pointer"
              variant={gridSize === 1000 ? "default" : "outline"}
              onClick={() => setGridSize(1000)}
            >
              1000×1000
            </Button>

            {/* 大数据量测试迁移到此 */}
            <span className="text-sm text-foreground">
              {t("pages.canvas.toolbar.largeDataTest")}
            </span>
            {[1e4, 5e4, 1e5, 2.5e5, 5e5, 1e6].map((s) => (
              <Button
                key={s}
                className="cursor-pointer"
                variant="outline"
                onClick={() => importLargeTest(s)}
              >
                {s >= 1000 ? `${s / 1000}k` : s}
              </Button>
            ))}

            <Button
              className="cursor-pointer"
              onClick={handleImportTestData}
              variant="outline"
            >
              {t("pages.canvas.page.testPanel.importSmile")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleGetCurrentData}
              variant="outline"
            >
              {t("pages.canvas.page.testPanel.getCurrent")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleGetUserData}
              variant="outline"
            >
              {t("pages.canvas.page.testPanel.getUser")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleGetOperations}
              variant="outline"
            >
              {t("pages.canvas.page.testPanel.getHistory")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => canvasRef.current?.undo()}
              variant="outline"
            >
              {t("pages.canvas.toolbar.undo")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => canvasRef.current?.redo()}
              variant="outline"
            >
              {t("pages.canvas.toolbar.redo")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleClearCanvas}
              variant="destructive"
            >
              {t("pages.canvas.page.testPanel.clearCanvas")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={() => canvasRef.current?.clearUserDrawing()}
              variant="outline"
            >
              {t("pages.canvas.page.testPanel.clearUser")}
            </Button>
            <Button
              className="cursor-pointer"
              onClick={handleInitTestColors}
              variant="outline"
            >
              {t("pages.canvas.page.testPanel.initColors")}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t("pages.canvas.page.testPanel.opCount", {
                count: drawingOperations.length,
              })}
            </span>
            <span className="text-sm text-muted-foreground">
              {t("pages.canvas.page.testPanel.userPixelCount", {
                count: userPixelCount,
              })}
            </span>
          </div>
        </div>

        {/* 操作记录显示 */}
        {drawingOperations.length > 0 && (
          <div className="mt-8 bg-card rounded-lg shadow-md border border-border p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">
              {t("pages.canvas.page.history.title", {
                count: drawingOperations.length,
              })}
            </h2>
            <div className="bg-muted rounded p-4 max-h-40 overflow-y-auto">
              <div className="text-xs text-muted-foreground space-y-1">
                {drawingOperations.slice(-10).map((op, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span>
                      #{Math.max(0, drawingOperations.length - 10) + index + 1}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        op.type === "draw"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {op.type === "draw"
                        ? t("pages.canvas.page.history.op.draw")
                        : t("pages.canvas.page.history.op.erase")}
                    </span>
                    <span>
                      {t("pages.canvas.page.history.position")}: ({op.x}, {op.y}
                      )
                    </span>
                    {op.type === "draw" && (
                      <>
                        <div
                          className="w-4 h-4 rounded border border-border"
                          style={{ backgroundColor: op.color }}
                        ></div>
                        <span>
                          {t("pages.canvas.page.history.color")}: {op.color}
                        </span>
                      </>
                    )}
                    <span>
                      {t("pages.canvas.page.history.time")}:{" "}
                      {new Date(op.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {drawingOperations.length > 10 && (
                  <div className="text-center text-muted-foreground">
                    {t("pages.canvas.page.history.showRecent")}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PixelCanvasDebug;
