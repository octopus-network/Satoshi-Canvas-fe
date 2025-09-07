import { useState } from "react";
import { Toaster } from "sonner";
import { useThemeStore } from "@/store/useThemeStore";
import PixelCanvas from "@/components/PixelCanvas";
import ParticipantsList from "@/components/ParticipantsList";
import type { Participant, CanvasInfo } from "@/types/canvas";

function HomePage() {
  const { theme: themeConfig } = useThemeStore();
  const [gridSize] = useState<100 | 1000>(1000);

  // Mock Participants leaderboard data
  const participants: Participant[] = [
    {
      address: "0x1234567890abcdef1234567890abcdef12345678",
      paintedPixelCount: 8542,
      paintedPrice: 0.0345,
    },
    {
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      paintedPixelCount: 6789,
      paintedPrice: 0.0278,
    },
    {
      address: "0x9876543210fedcba9876543210fedcba98765432",
      paintedPixelCount: 4321,
      paintedPrice: 0.0189,
    },
    {
      address: "0xfedcba0987654321fedcba0987654321fedcba09",
      paintedPixelCount: 3456,
      paintedPrice: 0.0142,
    },
    {
      address: "0x1111222233334444555566667777888899990000",
      paintedPixelCount: 2134,
      paintedPrice: 0.0098,
    },
    {
      address: "0x2222333344445555666677778888999900001111",
      paintedPixelCount: 1987,
      paintedPrice: 0.0087,
    },
    {
      address: "0x3333444455556666777788889999000011112222",
      paintedPixelCount: 1654,
      paintedPrice: 0.0076,
    },
    {
      address: "0x4444555566667777888899990000111122223333",
      paintedPixelCount: 1432,
      paintedPrice: 0.0065,
    },
    {
      address: "0x5555666677778888999900001111222233334444",
      paintedPixelCount: 1298,
      paintedPrice: 0.0058,
    },
    {
      address: "0x6666777788889999000011112222333344445555",
      paintedPixelCount: 1156,
      paintedPrice: 0.0052,
    },
  ];

  // Mock Canvas information
  const canvasInfo: CanvasInfo = {
    paintedPixelCount: 32769, // Sum of all participants
    totalValue: 0.139, // Sum of all participant values
    paintedPixelInfoList: [], // TODO: This would be populated by actual pixel data
  };

  return (
    <div className="min-h-screen h-screen bg-background text-foreground flex">
      {/* Left Sidebar (Participants Leaderboard) */}
      <aside className="hidden md:flex w-64 h-full min-h-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="h-14 shrink-0 px-4 flex items-center text-sm font-semibold border-b">
          Pixel Land
        </div>
        <ParticipantsList participants={participants} />
      </aside>

      {/* Right main view: Top toolbar + Bottom canvas fill */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          <PixelCanvas
            gridSize={gridSize}
            pixelSize={gridSize === 100 ? 6 : 2}
            canvasInfo={canvasInfo}
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
  );
}

export default HomePage;
