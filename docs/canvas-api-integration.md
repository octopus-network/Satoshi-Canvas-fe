# Canvas API 集成文档

## 概述

本文档记录了 Canvas API 接口的集成实现，包括数据获取、处理和定时轮询功能。

## API 接口信息

- **接口地址**: `GET https://h6ibp-byaaa-aaaap-qqctq-cai.raw.ic0.app/canvas`
- **返回格式**: JSON 格式的像素数组
- **轮询间隔**: 8秒

### Pixel 数据结构

```typescript
interface ApiPixel {
  owner: string | null; // null 表示无人持有
  price: number;        // 当前标价 (satoshis)
  color: string;        // 24-bit RGB888 颜色
  x: number;           // 像素 x 坐标
  y: number;           // 像素 y 坐标
}
```

## 实现方案

### 1. API 工具函数 (`src/utils/canvas-api.ts`)

#### 主要功能
- **数据获取**: `fetchCanvasData()` - 获取原始画布数据
- **数据解析**: `parseCanvasResponse()` - 解析 JSON 格式数据
- **数据转换**: `convertApiPixelsToPixelData()` - 转换为前端数据格式
- **重试机制**: `fetchCanvasDataWithRetry()` - 带重试的数据获取

#### 配置常量
```typescript
export const CANVAS_API = {
  BASE_URL: "https://h6ibp-byaaa-aaaap-qqctq-cai.raw.ic0.app",
  ENDPOINTS: { CANVAS: "/canvas" },
  POLLING_INTERVAL: 8000, // 8秒轮询间隔
  GRID_SIZE: 100, // 画布网格大小
} as const;
```

### 2. 自定义 Hook (`src/hooks/useCanvasData.ts`)

#### 功能特性
- **自动轮询**: 每8秒自动更新画布数据
- **状态管理**: 加载状态、错误状态、最后更新时间
- **手动刷新**: 支持主动触发数据更新
- **轮询控制**: 可启动/停止轮询

#### 使用方法
```typescript
const { canvasState, refreshData, isPolling } = useCanvasData({
  enablePolling: true,
  pollingInterval: 8000,
  fetchOnMount: true,
});
```

#### 返回的状态
```typescript
interface CanvasState {
  canvasInfo: CanvasInfo;           // 画布统计信息
  initialPixelData: PixelData[];    // 像素数据
  dataState: CanvasDataState;       // 加载状态
}
```

### 3. 类型定义扩展 (`src/types/canvas.ts`)

新增了以下类型定义：
- `CanvasDataState` - 数据加载状态
- `CanvasState` - 画布数据和状态的组合

### 4. Home 组件更新 (`src/pages/Home/index.tsx`)

#### 主要变更
- 移除了 Mock 数据，改用 API 数据
- 集成了 `useCanvasData` Hook
- 添加了数据状态显示和刷新按钮
- 添加了错误边界处理

#### UI 改进
- 实时显示连接状态（实时更新/已停止）
- 显示最后更新时间
- 手动刷新按钮
- 错误状态指示

### 5. 错误处理 (`src/components/ui/error-boundary.tsx`)

- React 错误边界组件
- 优雅的错误展示界面
- 重试和刷新功能
- 开发环境下的详细错误信息

## 数据流程

```
1. 组件挂载 → useCanvasData Hook 初始化
2. 立即获取一次数据 → fetchCanvasDataWithRetry()
3. 启动定时轮询 → 每8秒调用 fetchCanvasData()
4. 数据处理流程：
   a. 获取 JSON 数据
   b. 解析为 ApiPixel[]
   c. 转换为 PixelData[] (initialData)
   d. 生成 CanvasInfo (paintedPixelCount, totalValue)
5. 更新组件状态 → 重新渲染 PixelCanvas
```

## 统计数据计算

- **paintedPixelCount**: API 返回数组的长度
- **totalValue**: 所有像素 price 的加和（转换为 BTC 单位）

```typescript
const paintedPixelCount = apiPixels.length;
const totalValue = apiPixels.reduce((sum, pixel) => sum + pixel.price, 0) / 100000000; // 转换为 BTC
```

## 注意事项

### 1. JSON 解析
API 直接返回 JSON 格式数据，使用标准的 `response.json()` 方法解析。数据结构包含完整的像素信息（坐标、颜色、价格、所有者）。

### 2. 错误处理
- 网络错误会触发重试机制（最多3次）
- 解析错误会显示在 UI 上
- React 组件错误会被错误边界捕获

### 3. 性能优化
- 使用 `useCallback` 避免不必要的重新渲染
- 组件卸载时会清理定时器
- 避免在数据加载时重复请求

### 4. 开发调试
- 控制台会输出详细的数据更新日志
- 开发环境下会显示详细的错误堆栈
- 实时连接状态指示

## 使用示例

在 Home 组件中的完整使用：

```typescript
function HomePage() {
  // 使用 Canvas 数据 Hook
  const { canvasState, refreshData, isPolling } = useCanvasData({
    enablePolling: true,
    pollingInterval: 8000,
    fetchOnMount: true,
  });

  const { canvasInfo, initialPixelData, dataState } = canvasState;

  // 传递给 PixelCanvas 组件
  return (
    <PixelCanvas
      gridSize={100}
      initialData={initialPixelData}
      canvasInfo={canvasInfo}
    />
  );
}
```

这样就完成了 Canvas API 的完整集成，实现了数据的自动获取、处理和定时更新功能。
