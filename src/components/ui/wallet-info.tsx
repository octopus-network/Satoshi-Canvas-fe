import React from "react";
import { Copy, LogOut, Wallet } from "lucide-react";
import { useWalletStore } from "@/store/useWalletStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WalletInfoProps {
  className?: string;
}

const WalletInfo: React.FC<WalletInfoProps> = ({ className = "" }) => {
  const { address, balance, disconnect } = useWalletStore();

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("地址已复制到剪贴板");
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("钱包已断开连接");
  };

  if (!address) return null;

  return (
    <div
      className={`bg-background border rounded-lg p-4 space-y-3 ${className}`}
    >
      {/* 项目标题 */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <h2 className="font-bold text-lg text-foreground">Pixel Land</h2>
      </div>

      {/* 钱包信息 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wallet className="w-4 h-4" />
          <span>已连接钱包</span>
        </div>

        <div className="flex items-center justify-between bg-muted/50 rounded-md p-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono text-sm font-medium">
              {shortenAddress(address)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAddress}
            className="h-6 w-6 p-0 hover:bg-background cursor-pointer"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>

        {balance !== null && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">余额:</span>
            <span className="font-medium">{balance.toFixed(4)} BTC</span>
          </div>
        )}
      </div>

      {/* 断开连接按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDisconnect}
        className="w-full text-xs gap-1 hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
      >
        <LogOut className="w-3 h-3" />
        断开连接
      </Button>
    </div>
  );
};

export default WalletInfo;
