import { useState } from "react";
import { Toaster, toast } from "sonner";
import { useThemeStore } from "@/store/useThemeStore";
import { useWalletStore } from "@/store/useWalletStore";
import PixelCanvas from "@/components/PixelCanvas";
import ParticipantsList from "@/components/ParticipantsList";
import ConnectWalletButton from "@/components/ui/connect-wallet-button";
import WalletInfo from "@/components/ui/wallet-info";
import type { Participant, CanvasInfo } from "@/types/canvas";
import type { PixelData } from "@/components/PixelCanvas/types";

function HomePage() {
  const { theme: themeConfig } = useThemeStore();
  const { isConnected, connect } = useWalletStore();
  const [gridSize] = useState<100 | 1000>(1000);

  // Mock wallet connection logic
  const mockWalletAddresses = [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdef1234567890abcdef1234567890abcdef12",
    "0x9876543210fedcba9876543210fedcba98765432",
    "0xfedcba0987654321fedcba0987654321fedcba09",
    "0x1111222233334444555566667777888899990000",
  ];

  const handleConnectWallet = async () => {
    try {
      // Mock connection delay
      toast.loading("Connecting wallet...", { id: "wallet-connect" });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Randomly select an address for simulation
      const randomAddress =
        mockWalletAddresses[
          Math.floor(Math.random() * mockWalletAddresses.length)
        ];
      const randomBalance = Math.random() * 10 + 0.1; // 0.1-10.1 ETH

      connect(randomAddress, randomBalance, 1); // Connect to mainnet

      toast.success("Wallet connected successfully!", { id: "wallet-connect" });
    } catch (error) {
      toast.error("Wallet connection failed, please try again", { id: "wallet-connect" });
    }
  };

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
    paintedPixelInfoList: [
      // Mock painted pixel data with price information

      // Rainbow color block area (50-60, 50-55)
      { x: 50, y: 50, color: "#ff0000", price: 0.001 },
      { x: 51, y: 50, color: "#ff4500", price: 0.0012 },
      { x: 52, y: 50, color: "#ffa500", price: 0.0008 },
      { x: 53, y: 50, color: "#ffff00", price: 0.0015 },
      { x: 54, y: 50, color: "#9aff9a", price: 0.0011 },
      { x: 55, y: 50, color: "#00ff00", price: 0.0009 },
      { x: 56, y: 50, color: "#00ffff", price: 0.0013 },
      { x: 57, y: 50, color: "#0080ff", price: 0.0007 },
      { x: 58, y: 50, color: "#0000ff", price: 0.0014 },
      { x: 59, y: 50, color: "#8000ff", price: 0.0016 },
      { x: 50, y: 51, color: "#ff0080", price: 0.001 },
      { x: 51, y: 51, color: "#ff8000", price: 0.0012 },
      { x: 52, y: 51, color: "#ffff80", price: 0.0008 },
      { x: 53, y: 51, color: "#80ff80", price: 0.0015 },
      { x: 54, y: 51, color: "#80ffff", price: 0.0011 },
      { x: 55, y: 51, color: "#8080ff", price: 0.0009 },

      // Simple smiley face pattern (150-170, 150-165)
      // Left eye
      { x: 155, y: 155, color: "#000000", price: 0.0013 },
      { x: 156, y: 155, color: "#000000", price: 0.0007 },
      { x: 155, y: 156, color: "#000000", price: 0.0014 },
      { x: 156, y: 156, color: "#000000", price: 0.0016 },
      // Right eye
      { x: 165, y: 155, color: "#000000", price: 0.001 },
      { x: 166, y: 155, color: "#000000", price: 0.0012 },
      { x: 165, y: 156, color: "#000000", price: 0.0008 },
      { x: 166, y: 156, color: "#000000", price: 0.0015 },
      // Mouth
      { x: 158, y: 162, color: "#ff0000", price: 0.0011 },
      { x: 159, y: 162, color: "#ff0000", price: 0.0009 },
      { x: 160, y: 162, color: "#ff0000", price: 0.0013 },
      { x: 161, y: 162, color: "#ff0000", price: 0.0007 },
      { x: 162, y: 162, color: "#ff0000", price: 0.0014 },
      { x: 163, y: 162, color: "#ff0000", price: 0.0016 },
      { x: 157, y: 163, color: "#ff0000", price: 0.001 },
      { x: 164, y: 163, color: "#ff0000", price: 0.0012 },

      // "PIXEL" text (300-350, 200-210)
      // P
      { x: 300, y: 200, color: "#0080ff", price: 0.0008 },
      { x: 301, y: 200, color: "#0080ff", price: 0.0015 },
      { x: 302, y: 200, color: "#0080ff", price: 0.0011 },
      { x: 300, y: 201, color: "#0080ff", price: 0.0009 },
      { x: 302, y: 201, color: "#0080ff", price: 0.0013 },
      { x: 300, y: 202, color: "#0080ff", price: 0.0007 },
      { x: 301, y: 202, color: "#0080ff", price: 0.0014 },
      { x: 300, y: 203, color: "#0080ff", price: 0.0016 },
      { x: 302, y: 203, color: "#0080ff", price: 0.001 },
      { x: 300, y: 204, color: "#0080ff", price: 0.0012 },
      { x: 300, y: 205, color: "#0080ff", price: 0.0008 },
      // I
      { x: 305, y: 200, color: "#0080ff", price: 0.0015 },
      { x: 305, y: 201, color: "#0080ff", price: 0.0011 },
      { x: 305, y: 202, color: "#0080ff", price: 0.0009 },
      { x: 305, y: 203, color: "#0080ff", price: 0.0013 },
      { x: 305, y: 204, color: "#0080ff", price: 0.0007 },
      { x: 305, y: 205, color: "#0080ff", price: 0.0014 },
      // X
      { x: 308, y: 200, color: "#0080ff", price: 0.0016 },
      { x: 310, y: 200, color: "#0080ff", price: 0.001 },
      { x: 309, y: 201, color: "#0080ff", price: 0.0012 },
      { x: 308, y: 202, color: "#0080ff", price: 0.0008 },
      { x: 310, y: 202, color: "#0080ff", price: 0.0015 },
      { x: 309, y: 203, color: "#0080ff", price: 0.0011 },
      { x: 308, y: 204, color: "#0080ff", price: 0.0009 },
      { x: 310, y: 204, color: "#0080ff", price: 0.0013 },
      { x: 308, y: 205, color: "#0080ff", price: 0.0007 },
      { x: 310, y: 205, color: "#0080ff", price: 0.0014 },
      // E
      { x: 313, y: 200, color: "#0080ff", price: 0.0016 },
      { x: 314, y: 200, color: "#0080ff", price: 0.001 },
      { x: 315, y: 200, color: "#0080ff", price: 0.0012 },
      { x: 313, y: 201, color: "#0080ff", price: 0.0008 },
      { x: 313, y: 202, color: "#0080ff", price: 0.0015 },
      { x: 314, y: 202, color: "#0080ff", price: 0.0011 },
      { x: 313, y: 203, color: "#0080ff", price: 0.0009 },
      { x: 313, y: 204, color: "#0080ff", price: 0.0013 },
      { x: 313, y: 205, color: "#0080ff", price: 0.0007 },
      { x: 314, y: 205, color: "#0080ff", price: 0.0014 },
      { x: 315, y: 205, color: "#0080ff", price: 0.0016 },
      // L
      { x: 318, y: 200, color: "#0080ff", price: 0.001 },
      { x: 318, y: 201, color: "#0080ff", price: 0.0012 },
      { x: 318, y: 202, color: "#0080ff", price: 0.0008 },
      { x: 318, y: 203, color: "#0080ff", price: 0.0015 },
      { x: 318, y: 204, color: "#0080ff", price: 0.0011 },
      { x: 318, y: 205, color: "#0080ff", price: 0.0009 },
      { x: 319, y: 205, color: "#0080ff", price: 0.0013 },
      { x: 320, y: 205, color: "#0080ff", price: 0.0007 },

      // Randomly distributed stars ⭐
      { x: 120, y: 80, color: "#ffff00", price: 0.0014 },
      { x: 121, y: 79, color: "#ffff00", price: 0.0016 },
      { x: 121, y: 81, color: "#ffff00", price: 0.001 },
      { x: 119, y: 80, color: "#ffff00", price: 0.0012 },
      { x: 122, y: 80, color: "#ffff00", price: 0.0008 },

      { x: 380, y: 120, color: "#ffff00", price: 0.0015 },
      { x: 381, y: 119, color: "#ffff00", price: 0.0011 },
      { x: 381, y: 121, color: "#ffff00", price: 0.0009 },
      { x: 379, y: 120, color: "#ffff00", price: 0.0013 },
      { x: 382, y: 120, color: "#ffff00", price: 0.0007 },

      { x: 250, y: 350, color: "#ffff00", price: 0.0014 },
      { x: 251, y: 349, color: "#ffff00", price: 0.0016 },
      { x: 251, y: 351, color: "#ffff00", price: 0.001 },
      { x: 249, y: 350, color: "#ffff00", price: 0.0012 },
      { x: 252, y: 350, color: "#ffff00", price: 0.0008 },

      // Purple flower pattern (450-470, 300-320)
      { x: 460, y: 305, color: "#9932cc", price: 0.0015 },
      { x: 459, y: 306, color: "#9932cc", price: 0.0011 },
      { x: 461, y: 306, color: "#9932cc", price: 0.0009 },
      { x: 458, y: 307, color: "#9932cc", price: 0.0013 },
      { x: 462, y: 307, color: "#9932cc", price: 0.0007 },
      { x: 459, y: 308, color: "#9932cc", price: 0.0014 },
      { x: 460, y: 308, color: "#ffff00", price: 0.0016 },
      { x: 461, y: 308, color: "#9932cc", price: 0.001 },
      { x: 460, y: 309, color: "#9932cc", price: 0.0012 },
      { x: 459, y: 310, color: "#9932cc", price: 0.0008 },
      { x: 461, y: 310, color: "#9932cc", price: 0.0015 },
      { x: 460, y: 311, color: "#9932cc", price: 0.0011 },

      // Heart pattern (200-210, 400-410)
      { x: 202, y: 402, color: "#ff0000", price: 0.0009 },
      { x: 203, y: 402, color: "#ff0000", price: 0.0013 },
      { x: 206, y: 402, color: "#ff0000", price: 0.0007 },
      { x: 207, y: 402, color: "#ff0000", price: 0.0014 },
      { x: 201, y: 403, color: "#ff0000", price: 0.0016 },
      { x: 202, y: 403, color: "#ff0000", price: 0.001 },
      { x: 203, y: 403, color: "#ff0000", price: 0.0012 },
      { x: 204, y: 403, color: "#ff0000", price: 0.0008 },
      { x: 205, y: 403, color: "#ff0000", price: 0.0015 },
      { x: 206, y: 403, color: "#ff0000", price: 0.0011 },
      { x: 207, y: 403, color: "#ff0000", price: 0.0009 },
      { x: 208, y: 403, color: "#ff0000", price: 0.0013 },
      { x: 202, y: 404, color: "#ff0000", price: 0.0007 },
      { x: 203, y: 404, color: "#ff0000", price: 0.0014 },
      { x: 204, y: 404, color: "#ff0000", price: 0.0016 },
      { x: 205, y: 404, color: "#ff0000", price: 0.001 },
      { x: 206, y: 404, color: "#ff0000", price: 0.0012 },
      { x: 207, y: 404, color: "#ff0000", price: 0.0008 },
      { x: 203, y: 405, color: "#ff0000", price: 0.0015 },
      { x: 204, y: 405, color: "#ff0000", price: 0.0011 },
      { x: 205, y: 405, color: "#ff0000", price: 0.0009 },
      { x: 206, y: 405, color: "#ff0000", price: 0.0013 },
      { x: 204, y: 406, color: "#ff0000", price: 0.0007 },
      { x: 205, y: 406, color: "#ff0000", price: 0.0014 },

      // Blue block group (600-620, 100-120)
      { x: 605, y: 105, color: "#4169e1", price: 0.0016 },
      { x: 606, y: 105, color: "#4169e1", price: 0.001 },
      { x: 607, y: 105, color: "#4169e1", price: 0.0012 },
      { x: 605, y: 106, color: "#4169e1", price: 0.0008 },
      { x: 606, y: 106, color: "#87ceeb", price: 0.0015 },
      { x: 607, y: 106, color: "#4169e1", price: 0.0011 },
      { x: 605, y: 107, color: "#4169e1", price: 0.0009 },
      { x: 606, y: 107, color: "#4169e1", price: 0.0013 },
      { x: 607, y: 107, color: "#4169e1", price: 0.0007 },

      { x: 610, y: 110, color: "#4169e1", price: 0.0014 },
      { x: 611, y: 110, color: "#4169e1", price: 0.0016 },
      { x: 612, y: 110, color: "#4169e1", price: 0.001 },
      { x: 610, y: 111, color: "#4169e1", price: 0.0012 },
      { x: 611, y: 111, color: "#87ceeb", price: 0.0008 },
      { x: 612, y: 111, color: "#4169e1", price: 0.0015 },
      { x: 610, y: 112, color: "#4169e1", price: 0.0011 },
      { x: 611, y: 112, color: "#4169e1", price: 0.0009 },
      { x: 612, y: 112, color: "#4169e1", price: 0.0013 },

      // Green plant pattern (80-100, 450-470)
      { x: 90, y: 455, color: "#228b22", price: 0.0007 },
      { x: 90, y: 456, color: "#228b22", price: 0.0014 },
      { x: 90, y: 457, color: "#228b22", price: 0.0016 },
      { x: 90, y: 458, color: "#228b22", price: 0.001 },
      { x: 90, y: 459, color: "#228b22", price: 0.0012 },
      { x: 89, y: 460, color: "#228b22", price: 0.0008 },
      { x: 90, y: 460, color: "#228b22", price: 0.0015 },
      { x: 91, y: 460, color: "#228b22", price: 0.0011 },
      { x: 88, y: 461, color: "#228b22", price: 0.0009 },
      { x: 89, y: 461, color: "#228b22", price: 0.0013 },
      { x: 90, y: 461, color: "#228b22", price: 0.0007 },
      { x: 91, y: 461, color: "#228b22", price: 0.0014 },
      { x: 92, y: 461, color: "#228b22", price: 0.0016 },

      // Orange sun pattern (700-720, 200-220)
      { x: 710, y: 205, color: "#ffa500", price: 0.001 },
      { x: 709, y: 206, color: "#ffa500", price: 0.0012 },
      { x: 710, y: 206, color: "#ffff00", price: 0.0008 },
      { x: 711, y: 206, color: "#ffa500", price: 0.0015 },
      { x: 708, y: 207, color: "#ffa500", price: 0.0011 },
      { x: 709, y: 207, color: "#ffa500", price: 0.0009 },
      { x: 710, y: 207, color: "#ffa500", price: 0.0013 },
      { x: 711, y: 207, color: "#ffa500", price: 0.0007 },
      { x: 712, y: 207, color: "#ffa500", price: 0.0014 },
      { x: 709, y: 208, color: "#ffa500", price: 0.0016 },
      { x: 710, y: 208, color: "#ffa500", price: 0.001 },
      { x: 711, y: 208, color: "#ffa500", price: 0.0012 },
      { x: 710, y: 209, color: "#ffa500", price: 0.0008 },

      // Pink cloud (500-530, 50-70)
      { x: 510, y: 58, color: "#ffb6c1", price: 0.0015 },
      { x: 511, y: 58, color: "#ffb6c1", price: 0.0011 },
      { x: 512, y: 58, color: "#ffb6c1", price: 0.0009 },
      { x: 509, y: 59, color: "#ffb6c1", price: 0.0013 },
      { x: 510, y: 59, color: "#ffb6c1", price: 0.0007 },
      { x: 511, y: 59, color: "#ffb6c1", price: 0.0014 },
      { x: 512, y: 59, color: "#ffb6c1", price: 0.0016 },
      { x: 513, y: 59, color: "#ffb6c1", price: 0.001 },
      { x: 508, y: 60, color: "#ffb6c1", price: 0.0012 },
      { x: 509, y: 60, color: "#ffb6c1", price: 0.0008 },
      { x: 510, y: 60, color: "#ffb6c1", price: 0.0015 },
      { x: 511, y: 60, color: "#ffb6c1", price: 0.0011 },
      { x: 512, y: 60, color: "#ffb6c1", price: 0.0009 },
      { x: 513, y: 60, color: "#ffb6c1", price: 0.0013 },
      { x: 514, y: 60, color: "#ffb6c1", price: 0.0007 },
    ],
  };

  // Convert paintedPixelInfoList in canvasInfo to PixelData format as initial data
  const initialPixelData: PixelData[] = canvasInfo.paintedPixelInfoList.map(
    (pixel) => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
    })
  );

  return (
    <div className="min-h-screen h-screen bg-background text-foreground flex">
      {/* Left Sidebar (Participants Leaderboard) */}
      <aside className="hidden md:flex w-64 h-full min-h-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="shrink-0 p-3 border-b">
          {isConnected ? (
            <WalletInfo className="w-full" />
          ) : (
            <ConnectWalletButton
              onClick={handleConnectWallet}
              className="text-xs w-full"
            />
          )}
        </div>
        <ParticipantsList participants={participants} />
      </aside>

      {/* Right main view: Top toolbar + Bottom canvas fill */}
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col">
          <PixelCanvas
            gridSize={gridSize}
            pixelSize={gridSize === 100 ? 6 : 2}
            initialData={initialPixelData}
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
