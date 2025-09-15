# 钱包集成文档

## 概述

本项目集成了 Xverse 钱包，支持比特币网络和符文 (Runes) 协议。使用 LaserEyes 和 Ree Client SDK 进行钱包连接和交易管理。

## 环境配置

在项目根目录创建 `.env` 文件，配置以下环境变量：

```env
# Ree 协议配置
VITE_MAESTRO_API_KEY=your-maestro-api-key
VITE_EXCHANGE_CANISTER_ID=your-exchange-canister-id
VITE_EXCHANGE_ID=your-exchange-id
VITE_NETWORK=testnet
```

## 支持的钱包

目前支持以下钱包：

- **Xverse**: Bitcoin 和 Lightning 钱包，支持符文协议

## 核心组件

### 1. WalletStore (`src/store/useWalletStore.ts`)
钱包状态管理，使用 Zustand 进行状态管理和持久化存储。

**状态字段:**
- `isConnected`: 钱包连接状态
- `address`: Bitcoin 地址 (用于符文)
- `paymentAddress`: 支付地址 (用于 BTC)
- `provider`: 钱包提供商名称
- `balance`: BTC 余额
- `chainId`: 链 ID

### 2. useWalletConnection Hook (`src/hooks/useWalletConnection.ts`)
钱包连接逻辑，集成 LaserEyes 和 Ree SDK。

**主要功能:**
- `connectWallet(walletType)`: 连接指定类型的钱包
- `disconnectWallet()`: 断开钱包连接
- 自动同步地址到 Ree SDK
- 钱包安装检测

### 3. ConnectWalletModal (`src/components/WalletModal/index.tsx`)
钱包连接弹窗组件。

**功能:**
- 显示支持的钱包列表
- 检测钱包安装状态
- 连接状态反馈
- 未安装钱包时跳转下载页面

### 4. WalletInfo (`src/components/ui/wallet-info.tsx`)
已连接钱包的信息显示组件。

**功能:**
- 显示两个地址：Bitcoin 地址和支付地址
- 地址复制功能
- 余额显示
- 断开连接功能

### 5. ConnectWalletButton (`src/components/ui/connect-wallet-button.tsx`)
连接钱包按钮组件，未连接时显示。

## 使用方法

### 基本使用

```tsx
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { ConnectWalletModal } from "@/components/WalletModal";
import ConnectWalletButton from "@/components/ui/connect-wallet-button";
import WalletInfo from "@/components/ui/wallet-info";

function MyComponent() {
  const { isConnected } = useWalletConnection();

  return (
    <div>
      {isConnected ? (
        <WalletInfo />
      ) : (
        <ConnectWalletButton />
      )}
    </div>
  );
}
```

### 手动控制连接

```tsx
import { useWalletConnection } from "@/hooks/useWalletConnection";

function CustomWalletButton() {
  const { connectWallet, isConnecting } = useWalletConnection();

  const handleConnect = async () => {
    const result = await connectWallet("xverse");
    if (result.success) {
      console.log("连接成功");
    } else {
      console.error("连接失败:", result.error);
    }
  };

  return (
    <button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? "连接中..." : "连接 Xverse"}
    </button>
  );
}
```

## 注意事项

1. **环境配置**: 确保正确配置环境变量，特别是 Maestro API 密钥
2. **网络设置**: 开发环境建议使用 testnet，生产环境使用 mainnet
3. **钱包检测**: 用户需要安装对应的钱包扩展程序
4. **地址管理**: Bitcoin 地址用于符文交易，支付地址用于 BTC 交易

## 故障排除

### 常见问题

1. **钱包连接失败**
   - 检查钱包是否已安装
   - 检查网络配置是否正确
   - 查看浏览器控制台错误信息

2. **环境变量未配置**
   - 确保 `.env` 文件存在且配置正确
   - 重启开发服务器以加载新的环境变量

3. **Ree SDK 初始化失败**
   - 检查 Maestro API 密钥是否有效
   - 确认交易所配置参数正确
