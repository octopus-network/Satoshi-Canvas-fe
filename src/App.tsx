import { useState } from "react";
import { Toaster } from "sonner";
import { useThemeStore } from "./store/useThemeStore";
import { ThemeProvider } from "./components/ThemeProvider";
import PixelCanvas from "@/components/PixelCanvas";

function App() {
  const { theme: themeConfig } = useThemeStore();
  const [gridSize, setGridSize] = useState<100 | 1000>(100);

  return (
    <ThemeProvider>
      <div className="min-h-screen h-screen bg-background text-foreground flex">
        {/* 左侧 Sidebar（预留目录树） */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
          <div className="h-14 px-4 flex items-center text-sm font-semibold border-b">
            像素画板
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="text-xs text-muted-foreground px-2 py-1">目录</div>
            <nav className="space-y-1">
              <button className="w-full text-left px-2 py-1.5 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm">
                示例画板 #1
              </button>
              <button className="w-full text-left px-2 py-1.5 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sm">
                示例画板 #2
              </button>
            </nav>
          </div>
        </aside>

        {/* 右侧主视图：顶部工具栏 + 底部填充画布 */}
        <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col">
            <PixelCanvas
              gridSize={gridSize}
              pixelSize={gridSize === 100 ? 6 : 2}
              onGridSizeChange={setGridSize}
            />
          </div>
        </main>

        <Toaster
          position="top-right"
          theme={themeConfig.mode === "dark" ? "dark" : "light"}
          toastOptions={{
            className: "custom-toast",
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
