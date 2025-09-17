# API 格式更新文档

## 概述

根据实际情况，Canvas API 接口返回的是 JSON 格式数据，而非之前假设的 bincode 序列化格式。本文档记录了相应的代码更新。

## 主要变更

### 1. 简化数据解析函数

#### 更新前
```typescript
/**
 * 解析 bincode 序列化的数据
 * 注意：这里需要根据实际的 bincode 格式进行调整
 * 目前采用 JSON 格式作为临时实现
 */
export async function parseBincodeData(response: Response): Promise<ApiPixel[]> {
  try {
    // 获取原始字节数据
    const arrayBuffer = await response.arrayBuffer();
    
    // TODO: 实现真正的 bincode 反序列化
    // 目前先尝试 JSON 解析作为回退
    try {
      const text = new TextDecoder().decode(arrayBuffer);
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [];
    } catch (jsonError) {
      console.warn("无法解析为 JSON，需要实现 bincode 反序列化:", jsonError);
      return [];
    }
  } catch (error) {
    console.error("解析 bincode 数据失败:", error);
    return [];
  }
}
```

#### 更新后
```typescript
/**
 * 解析 JSON 响应数据
 */
export async function parseCanvasResponse(response: Response): Promise<ApiPixel[]> {
  try {
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("解析 JSON 数据失败:", error);
    return [];
  }
}
```

### 2. 更新 HTTP 请求头

#### 更新前
```typescript
const response = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.CANVAS}`, {
  method: "GET",
  headers: {
    "Accept": "application/octet-stream",  // 期望二进制数据
    "Cache-Control": "no-cache",
  },
});
```

#### 更新后
```typescript
const response = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.CANVAS}`, {
  method: "GET",
  headers: {
    "Accept": "application/json",  // 期望 JSON 数据
    "Cache-Control": "no-cache",
  },
});
```

### 3. 更新 API 数据结构说明

#### 更新前（假设的 Rust 结构）
```rust
pub struct Pixel {
    pub owner: Option<PixelAccount>, // None 表示无人持有
    pub price: u64,                  // 当前标价 (satoshis)
    pub color: String,               // 24-bit RGB888 颜色
}
```

#### 更新后（实际的 TypeScript 接口）
```typescript
interface ApiPixel {
  owner: string | null; // null 表示无人持有
  price: number;        // 当前标价 (satoshis)
  color: string;        // 24-bit RGB888 颜色
  x: number;           // 像素 x 坐标
  y: number;           // 像素 y 坐标
}
```

## 优势

### 1. 简化代码
- 移除了复杂的 bincode 解析逻辑
- 使用标准的 `response.json()` 方法
- 减少了代码复杂度和潜在的错误点

### 2. 更好的兼容性
- JSON 是 Web 标准格式
- 浏览器原生支持
- 更容易调试和测试

### 3. 开发体验
- 无需额外的序列化库
- 标准的错误处理
- 更直观的数据结构

## 影响范围

### 修改的文件
- `src/services/canvas.service.ts` - 主要的 API 服务文件
- `docs/canvas-api-integration.md` - API 集成文档

### 函数变更
- `parseBincodeData()` → `parseCanvasResponse()`
- 简化了解析逻辑，移除了二进制处理

### 常量更新
- HTTP Accept 头从 `application/octet-stream` 改为 `application/json`

## 测试建议

1. **API 响应验证**
   - 验证 API 确实返回有效的 JSON 格式
   - 检查数据结构是否包含所需的字段（x, y, color, price, owner）

2. **错误处理测试**
   - 测试网络错误的重试机制
   - 测试无效 JSON 响应的处理

3. **数据格式验证**
   - 确保坐标值在有效范围内（0-99）
   - 验证颜色格式是否正确（#rrggbb）
   - 检查价格是否为正数

## 向后兼容性

此更新是向后兼容的，因为：
- 对外的接口没有变化
- Hook 和组件的使用方式保持不变
- 只是内部实现的简化

如果将来 API 格式发生变化，只需要更新 `parseCanvasResponse` 函数即可，无需改动其他代码。
