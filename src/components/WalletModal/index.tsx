import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { WALLETS } from "@/constants/wallets";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { cn } from "@/lib/utils";

interface WalletRowProps {
  walletId: string;
  onConnected: (walletId: string) => void;
}

function WalletRow({ walletId, onConnected }: WalletRowProps) {
  const { connectWallet, isConnecting, hasXverse } = useWalletConnection();
  const [connectingWallet, setConnectingWallet] = useState<string>();

  const wallet = WALLETS[walletId];

  // 检查钱包是否已安装
  const installed = walletId === "xverse" ? hasXverse : false;

  const onConnectWallet = useCallback(async () => {
    if (!installed) {
      window.open(wallet?.url, "_blank");
      return;
    }

    setConnectingWallet(walletId);

    try {
      const result = await connectWallet(walletId);

      if (result.success) {
        onConnected(walletId);
      } else {
        console.error("连接失败:", result.error);
      }
    } catch (err) {
      console.error("连接钱包时出错:", err);
    } finally {
      setConnectingWallet(undefined);
    }
  }, [connectWallet, walletId, installed, onConnected, wallet?.url]);

  return (
    <div
      className={cn(
        "flex items-center justify-between bg-secondary/70 hover:bg-secondary px-3 py-2 cursor-pointer first:rounded-t-lg last:rounded-b-lg transition-colors",
        isConnecting &&
          connectingWallet !== walletId &&
          "pointer-events-none opacity-50"
      )}
      onClick={onConnectWallet}
    >
      <div className="flex items-center">
        <div className="size-10 flex items-center justify-center">
          {connectingWallet === walletId ? (
            <Loader2 className="size-6 animate-spin text-primary" />
          ) : (
            <img
              src={wallet?.icon}
              className="size-8 rounded-lg"
              alt={wallet?.name}
              width={32}
              height={32}
            />
          )}
        </div>
        <span className="font-semibold text-lg ml-2">{wallet?.name}</span>
      </div>
      {installed && (
        <span className="text-muted-foreground/80 text-xs">已检测到</span>
      )}
    </div>
  );
}

interface ConnectWalletModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function ConnectWalletModal({ open, setOpen }: ConnectWalletModalProps) {
  const onConnected = (walletId: string) => {
    console.log(`已连接到 ${WALLETS[walletId]?.name}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-4">
        <DialogHeader>
          <DialogTitle>连接钱包</DialogTitle>
        </DialogHeader>
        <div>
          <div className="flex flex-col mt-3 gap-1">
            {Object.keys(WALLETS).map((walletId) => (
              <WalletRow
                walletId={walletId}
                key={walletId}
                onConnected={onConnected}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground flex items-center mt-4">
            <Info className="size-4 mr-2 flex-shrink-0" />
            <span>要使用 Buy Pixel 功能，您需要连接一个比特币钱包</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
