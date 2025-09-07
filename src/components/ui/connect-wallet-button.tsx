import React from "react";
import "./connect-wallet-button.css";

interface ConnectWalletButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const ConnectWalletButton: React.FC<ConnectWalletButtonProps> = ({
  onClick,
  disabled = false,
  className = "",
}) => {
  return (
    <button
      className={`button x ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        viewBox="0 0 48 48"
        height="48"
      >
        <path fill="none" d="M0 0h48v48H0z"></path>
        <path
          d="M42 36v2c0 2.21-1.79 4-4 4H10c-2.21 0-4-1.79-4-4V10c0-2.21 1.79-4 4-4h28c2.21 0 4 1.79 4 4v2H24c-2.21 0-4 1.79-4 4v16c0 2.21 1.79 4 4 4h18zm-18-4h20V16H24v16zm8-5c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"
        ></path>
      </svg>
      Connect Wallet
    </button>
  );
};

export default ConnectWalletButton;
