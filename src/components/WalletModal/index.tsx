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
import { useTranslation } from "react-i18next";

interface WalletRowProps {
  walletId: string;
  onConnected: (walletId: string) => void;
}

function WalletRow({ walletId, onConnected }: WalletRowProps) {
  const { t } = useTranslation();
  const { connectWallet, isConnecting, hasXverse } = useWalletConnection();
  const [connectingWallet, setConnectingWallet] = useState<string>();

  const wallet = WALLETS[walletId];

  // Check if wallet is installed
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
        console.error("Connection failed:", result.error);
      }
    } catch (err) {
      console.error("Error connecting wallet:", err);
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
        <span className="text-muted-foreground/80 text-xs">{t("wallet.detected")}</span>
      )}
    </div>
  );
}

interface ConnectWalletModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function ConnectWalletModal({ open, setOpen }: ConnectWalletModalProps) {
  const { t } = useTranslation();
  const onConnected = () => {
    // console.log(`Connected to ${WALLETS[walletId]?.name}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-md p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("wallet.connectWallet")}</DialogTitle>
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
            <span>{t("wallet.buyPixelInfo")}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
