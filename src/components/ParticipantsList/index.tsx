import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import type { Participant } from "@/types/canvas";
import { useRef, useEffect, useState, useCallback } from "react";

interface ParticipantsListProps {
  /** Participants leaderboard data */
  participants: Participant[];
}

export default function ParticipantsList({
  participants,
}: ParticipantsListProps) {
  // Scroll state and refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({
    canScrollUp: false,
    canScrollDown: false,
  });

  // Sort participants by painted pixel count (descending)
  const sortedParticipants = [...participants].sort(
    (a, b) => b.paintedPixelCount - a.paintedPixelCount
  );

  // Get rank icon based on position
  const getRankIcon = (index: number) => {
    const iconProps = { size: 14 };
    switch (index) {
      case 0:
        return <Crown {...iconProps} className="text-amber-600" />;
      case 1:
        return <Trophy {...iconProps} className="text-zinc-500" />;
      case 2:
        return <Medal {...iconProps} className="text-orange-700" />;
      default:
        return <Award {...iconProps} className="text-muted-foreground" />;
    }
  };

  // Get rank styling based on position
  const getRankStyling = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-sm";
      case 1:
        return "bg-gradient-to-r from-zinc-50 to-slate-50 border-zinc-300 shadow-sm";
      case 2:
      // return "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300 shadow-sm";
      default:
        return "bg-card hover:bg-muted/50 border-border";
    }
  };

  // Handle scroll to update gradient visibility
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    // Try multiple selectors for the scroll viewport
    let element = scrollContainerRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;

    if (!element) {
      element = scrollContainerRef.current.querySelector(
        "[data-slot='scroll-area-viewport']"
      ) as HTMLElement;
    }

    if (!element) {
      // Fallback: find the first scrollable element
      const scrollableElements = scrollContainerRef.current.querySelectorAll(
        '[data-radix-scroll-area-viewport], [style*="overflow"]'
      );
      element = scrollableElements[0] as HTMLElement;
    }

    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const canScrollUp = scrollTop > 10; // Small threshold to avoid flicker
    const canScrollDown = scrollTop < scrollHeight - clientHeight - 10;

    setScrollState({ canScrollUp, canScrollDown });
  }, []);

  // Set up scroll listener
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    // Try multiple selectors for the scroll viewport
    let element = scrollContainerRef.current.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;

    if (!element) {
      element = scrollContainerRef.current.querySelector(
        "[data-slot='scroll-area-viewport']"
      ) as HTMLElement;
    }

    if (!element) {
      // Fallback: find the first scrollable element
      const scrollableElements = scrollContainerRef.current.querySelectorAll(
        '[data-radix-scroll-area-viewport], [style*="overflow"]'
      );
      element = scrollableElements[0] as HTMLElement;
    }

    if (!element) return;

    // Initial check
    handleScroll();

    element.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [participants.length, handleScroll]); // Re-run when participants change

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 shrink-0">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 pixel-font-sm">
          <Trophy size={14} className="sm:w-4 sm:h-4 text-primary pixel-icon" />
          <span className="hidden sm:inline">Leaderboard</span>
          <span className="sm:hidden">Top</span>
        </h3>
        {/* <p className="text-xs text-muted-foreground mt-1">Top pixel artists</p> */}
      </div>

      {/* Scroll container with gradient masks */}
      <div ref={scrollContainerRef} className="relative flex-1 min-h-0">
        <ScrollArea className="flex-1 min-h-0 overflow-hidden h-full">
          <div className="px-3 pb-3 space-y-2">
            {sortedParticipants.map((participant, index) => (
              <div
                key={participant.address}
                onClick={() => {
                  window.open(`https://mempool.space/testnet4/address/${participant.address}`, '_blank');
                }}
                className={`
                relative p-3 border-2 transition-all duration-200 pixel-shadow-sm
                ${getRankStyling(index)}
                hover:shadow-md hover:translate-x-[1px] hover:translate-y-[1px]
                cursor-pointer
              `}
                style={{ borderRadius: "var(--radius)" }}
              >
                {/* Rank indicator */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background/80 border">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex flex-col">
                      <Tooltip delayDuration={500}>
                        <TooltipTrigger asChild>
                          <span className="font-mono text-sm font-medium hover:text-primary transition-colors">
                            {participant.address.slice(0, 8)}...
                            {participant.address.slice(-6)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="font-mono text-xs"
                        >
                          {participant.address}
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-xs text-muted-foreground">
                        Rank #{index + 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      Pixels
                    </span>
                    <Badge variant="outline" className="text-xs font-medium">
                      {participant.paintedPixelCount.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Value</span>
                    <span className="text-xs font-semibold text-foreground font-mono">
                      {participant.paintedPrice.toFixed(6)} BTC
                    </span>
                  </div>
                </div>

                {/* Progress bar for top 3 */}
                {/* {index < 3 && sortedParticipants[0] && (
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                            ? "bg-slate-400"
                            : "bg-amber-600"
                      }`}
                      style={{
                        width: `${(participant.paintedPixelCount / sortedParticipants[0].paintedPixelCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )} */}
              </div>
            ))}
            {participants.length === 0 && (
              <div className="p-8 text-center">
                <Trophy
                  size={32}
                  className="mx-auto text-muted-foreground mb-3"
                />
                <p className="text-sm text-muted-foreground">
                  No participants yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Be the first to paint!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Top gradient mask */}
        <div
          className={`
            absolute top-0 left-0 right-0 h-8 pointer-events-none z-10
            bg-gradient-to-b from-sidebar via-sidebar/80 to-transparent
            transition-opacity duration-300 ease-in-out
            ${scrollState.canScrollUp ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* Bottom gradient mask */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-10
            bg-gradient-to-t from-sidebar via-sidebar/80 to-transparent
            transition-opacity duration-300 ease-in-out
            ${scrollState.canScrollDown ? "opacity-100" : "opacity-0"}
          `}
        />
      </div>
    </div>
  );
}
