import React, { useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectWalletModal } from "@/components/WalletModal";
import { useWalletStore } from "@/store/useWalletStore";
import { cn } from "@/lib/utils";

interface ConnectWalletButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
  children?: React.ReactNode;
}

const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  className,
  variant = "default",
  size = "default",
  onClick,
  children,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isConnected } = useWalletStore();

  // 如果已连接，不显示连接按钮
  if (isConnected) {
    return null;
  }

  const handleClick = () => {
    setModalOpen(true);
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={cn("gap-2", className)}
      >
        <Wallet className="w-4 h-4" />
        {children || "连接钱包"}
      </Button>

      <ConnectWalletModal open={modalOpen} setOpen={setModalOpen} />
    </>
  );
};

export default ConnectWalletButton;
