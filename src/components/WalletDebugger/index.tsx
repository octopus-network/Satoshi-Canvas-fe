import { useEffect, useState } from "react";
import { useWalletStore } from "@/store/useWalletStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WalletDebuggerProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  minimizable?: boolean;
}

export default function WalletDebugger({ 
  position = "bottom-right", 
  minimizable = true 
}: WalletDebuggerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // 订阅整个钱包状态
  const walletState = useWalletStore();

  // 监听状态变化
  useEffect(() => {
    setUpdateCount(prev => prev + 1);
    setLastUpdate(new Date());
  }, [walletState]);

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <div 
      className={`fixed z-50 ${positionClasses[position]} max-w-sm pointer-events-none`}
      style={{ zIndex: 9999 }}
    >
      <Card className="bg-black/90 text-green-400 font-mono text-xs border-green-500/50 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>💼 Wallet Store Debug</span>
            {minimizable && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-green-400 hover:text-green-300"
              >
                {isMinimized ? "📈" : "📉"}
              </button>
            )}
          </CardTitle>
        </CardHeader>
        
        {!isMinimized && (
          <CardContent className="pt-0 space-y-2">
            <div className="text-yellow-400">
              更新次数: {updateCount} | 最后更新: {lastUpdate.toLocaleTimeString()}
            </div>
            
            <div className="border-t border-green-500/30 pt-2">
              <div className="grid grid-cols-2 gap-1">
                <span className="text-blue-400">连接状态:</span>
                <span className={walletState.isConnected ? "text-green-400" : "text-red-400"}>
                  {walletState.isConnected ? "✅ 已连接" : "❌ 未连接"}
                </span>
                
                <span className="text-blue-400">钱包提供商:</span>
                <span>{walletState.provider || "null"}</span>
                
                <span className="text-blue-400">余额:</span>
                <span>{walletState.balance ?? "null"}</span>
                
                <span className="text-blue-400">链ID:</span>
                <span>{walletState.chainId ?? "null"}</span>
              </div>
            </div>
            
            <div className="border-t border-green-500/30 pt-2">
              <div className="text-blue-400 mb-1">地址信息:</div>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-purple-400">BTC地址:</span>
                  <div className="break-all pl-2 text-gray-300">
                    {walletState.address || "null"}
                  </div>
                </div>
                <div>
                  <span className="text-purple-400">支付地址:</span>
                  <div className="break-all pl-2 text-gray-300">
                    {walletState.paymentAddress || "null"}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t border-green-500/30 pt-2">
              <details className="text-xs">
                <summary className="text-blue-400 cursor-pointer hover:text-blue-300">
                  JSON 原始数据 ▼
                </summary>
                <pre className="mt-1 p-2 bg-black/50 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(walletState, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
