import { Network } from "@omnity/ree-client-ts-sdk";
import { idlFactory } from "@/lib/exchange/did"; // TODO: 后续可能要更新
// LaserEyes 配置
export const laserEyesConfig = {
  network: "testnet4", // TODO: 后续可能要更新
};

export const reeConfig = {
  network: Network.Testnet, // TODO: 后续可能要更新
  maestroApiKey: 'zdbMPb9YHzT0KfwoPk97gMFWixa8qJrc',
  exchangeIdlFactory: idlFactory,
  exchangeCanisterId: 'h6ibp-byaaa-aaaap-qqctq-cai',
  exchangeId: 'PIXEL_LAND',
};
// 钱包配置检查
export const isWalletConfigValid = () => {
  return Boolean(
    reeConfig.maestroApiKey &&
    reeConfig.exchangeCanisterId &&
    reeConfig.exchangeId
  );
};

// 开发模式警告
if (import.meta.env.DEV && !isWalletConfigValid()) {
  console.warn("⚠️ 钱包配置不完整。请在 .env 文件中配置以下环境变量:");
  console.warn("- VITE_MAESTRO_API_KEY");
  console.warn("- VITE_EXCHANGE_CANISTER_ID");
  console.warn("- VITE_EXCHANGE_ID");
}
