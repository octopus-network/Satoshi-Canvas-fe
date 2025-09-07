import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import type { Participant } from "@/types/canvas";

interface ParticipantsListProps {
  /** Participants leaderboard data */
  participants: Participant[];
}

export default function ParticipantsList({
  participants,
}: ParticipantsListProps) {
  // Sort participants by painted pixel count (descending)
  const sortedParticipants = [...participants].sort(
    (a, b) => b.paintedPixelCount - a.paintedPixelCount
  );

  // Get rank icon based on position
  const getRankIcon = (index: number) => {
    const iconProps = { size: 14 };
    switch (index) {
      case 0:
        return <Crown {...iconProps} className="text-yellow-500" />;
      case 1:
        return <Trophy {...iconProps} className="text-slate-400" />;
      case 2:
        return <Medal {...iconProps} className="text-amber-600" />;
      default:
        return <Award {...iconProps} className="text-muted-foreground" />;
    }
  };

  // Get rank styling based on position
  const getRankStyling = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-sm";
      case 1:
        return "bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 shadow-sm";
      case 2:
        return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-sm";
      default:
        return "bg-card hover:bg-muted/50 border-border";
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 shrink-0">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          Leaderboard
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Top pixel artists</p>
      </div>
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="px-3 pb-3 space-y-2">
          {sortedParticipants.map((participant, index) => (
            <div
              key={participant.address}
              className={`
                relative p-3 rounded-lg border transition-all duration-200
                ${getRankStyling(index)}
                hover:shadow-md
              `}
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
                      <TooltipContent side="top" className="font-mono text-xs">
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
                  <span className="text-xs text-muted-foreground">Pixels</span>
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
    </div>
  );
}
