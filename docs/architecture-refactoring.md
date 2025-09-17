# 架构重构文档

## 概述

本文档记录了项目架构的重构过程，主要是将 Canvas API 相关的业务逻辑从 `utils` 层移动到 `services` 层，并优化了数据处理流程。

## 重构前后对比

### 重构前
```
src/
├── utils/
│   └── canvas-api.ts  // 混合了 API 调用和工具函数
└── hooks/
    └── useCanvasData.ts
```

### 重构后
```
src/
├── services/
│   ├── index.ts
│   └── canvas.service.ts  // 专门处理 API 业务逻辑
├── utils/
│   └── canvas.utils.ts   // 纯工具函数
└── hooks/
    └── useCanvasData.ts  // 更新导入路径
```

## 主要变更

### 1. 创建 Services 层 (`src/services/`)

#### `canvas.service.ts` - Canvas API 服务
- **职责**: 处理画布数据相关的业务逻辑和 API 调用
- **主要功能**:
  - `fetchCanvasData()` - 获取画布数据
  - `parseBincodeData()` - 解析 bincode 格式数据
  - `convertApiPixelsToPixelData()` - 数据格式转换
  - `generateCanvasInfo()` - 生成画布统计信息
  - `fetchCanvasDataWithRetry()` - 带重试机制的数据获取
  - `CanvasService` 类 - 单例服务类封装

#### `index.ts` - Services 模块导出
- 统一导出所有服务模块

### 2. 优化 Utils 层 (`src/utils/canvas.utils.ts`)

#### 保留纯工具函数
- `indexToCoordinates()` / `coordinatesToIndex()` - 坐标转换
- `isValidCoordinates()` - 坐标验证
- `isValidColor()` - 颜色格式验证
- `pixelsToCoordinateMap()` - 像素数据转换为坐标映射
- `coordinateMapToPixels()` - 坐标映射转换为像素数据
- `pixelDistance()` - 计算像素距离
- `getNeighborCoordinates()` - 获取邻居像素
- `hasDuplicateCoordinates()` - 检查重复坐标
- `removeDuplicatePixels()` - 移除重复像素
- `groupPixelsByColor()` - 按颜色分组
- `getPixelsBoundingBox()` - 计算边界框

### 3. API 数据结构优化

#### 更新 `ApiPixel` 接口
```typescript
// 之前（假设需要计算坐标）
interface ApiPixel {
  owner: string | null;
  price: number;
  color: string;
  x?: number; // 可选，需要从索引计算
  y?: number; // 可选，需要从索引计算
}

// 现在（API 直接返回坐标）
interface ApiPixel {
  owner: string | null;
  price: number; // satoshis
  color: string; // 24-bit RGB888
  x: number;     // 必需，API 直接提供
  y: number;     // 必需，API 直接提供
}
```

### 4. 移除冗余逻辑

- 移除了不必要的坐标计算逻辑
- API 数据直接包含 x、y 坐标，无需从索引计算
- 简化了数据处理流程

### 5. 服务类设计

#### `CanvasService` 单例类
```typescript
export class CanvasService {
  private static instance: CanvasService;

  static getInstance(): CanvasService {
    if (!CanvasService.instance) {
      CanvasService.instance = new CanvasService();
    }
    return CanvasService.instance;
  }

  async getCanvasData(): Promise<{
    pixelData: PixelData[];
    canvasInfo: CanvasInfo;
  }>;

  async getCanvasStats(): Promise<{
    paintedPixelCount: number;
    totalValue: number;
    averagePrice: number;
  }>;
}
```

## 架构优势

### 1. 职责分离
- **Services**: 处理业务逻辑和 API 调用
- **Utils**: 纯工具函数，可复用
- **Hooks**: 状态管理和组件逻辑

### 2. 可维护性提升
- 业务逻辑集中在 services 层
- 工具函数独立，便于测试
- 单例模式避免重复实例化

### 3. 扩展性增强
- 易于添加新的 API 端点
- 工具函数可以在多个地方复用
- 服务类可以轻松扩展新功能

### 4. 类型安全
- 明确的接口定义
- 严格的类型检查
- 更好的开发体验

## 使用方式

### 直接使用服务
```typescript
import { canvasService } from '@/services';

const { pixelData, canvasInfo } = await canvasService.getCanvasData();
```

### 使用工具函数
```typescript
import { isValidCoordinates, pixelDistance } from '@/utils/canvas.utils';

if (isValidCoordinates(x, y)) {
  const distance = pixelDistance(point1, point2);
}
```

### 在 Hook 中使用
```typescript
import { useCanvasData } from '@/hooks/useCanvasData';

const { canvasState, refreshData } = useCanvasData();
```

## 文件清理

### 删除的文件
- `src/utils/canvas-api.ts` - 已移动到 services 层

### 更新的导入路径
- `useCanvasData` Hook 更新导入路径从 `@/utils/canvas-api` 到 `@/services/canvas.service`

## 注意事项

1. **Bincode 解析**: 当前使用 JSON 作为回退，需要根据实际情况实现真正的 bincode 解析
2. **错误处理**: 保持了完整的错误处理和重试机制
3. **性能**: 单例模式确保服务实例的唯一性
4. **兼容性**: 所有原有功能保持不变，只是架构优化

这次重构使代码结构更加清晰，职责分离更明确，便于后续的维护和扩展。
