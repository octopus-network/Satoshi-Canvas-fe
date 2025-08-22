## PixelCanvas 性能优化方案（大数据量场景）

本文档总结像素画板在大数据量（上万像素）下的卡顿点与完整优化方案，覆盖渲染架构、事件处理、状态更新策略与可选增强手段，帮助你在不牺牲像素风格的前提下显著提升缩放/拖拽/绘制体验。

### 适用范围
- 组件：`src/components/PixelCanvas/`（包含 `useCanvasDrawing.ts`, `CanvasContainer.tsx` 等）
- 症状：
  - 缩放/拖拽掉帧卡顿
  - 绘制/橡皮擦在数据量大时明显阻塞主线程
  - 切换网格显隐后未即时刷新
  - 滚轮缩放后再次更新（绘制/网格切换）会出现轻微“跳变/放大”

## 优化目标
- 将每帧重绘成本从“逐像素绘制 N 次”降到“合成分层 + 局部网格线”（静态层保留，用户层策略见下）。
- 高频交互（缩放/拖拽/绘制）保持流畅，目标 60fps。
- 避免频繁拷贝大 `Map` 和 React 状态抖动，保证主线程响应。

## 方案总览
- 离屏图层缓存（静态层）：
  - **静态层**（`initialPixels`）绘制到离屏 `canvas`，只在静态数据变化时重建。
  - 视图刷新时 `drawImage` 合成静态层，避免对静态数据逐像素重绘。
- 用户层绘制策略（不使用用户层离屏图）：
  - 用户像素保留在内存结构（如 `Map`）；采用“批量提交 + 视图合成再绘制”的策略降低 setState 频率。
  - 交互时仅变更内存结构与最小范围重绘，按节流/松手时一次性提交到 React（详见下文）。
- RAF 合批：
  - 将 `draw()` 改为“请求一次 `requestAnimationFrame` 合成”，多次触发在同一帧内合并。
- 可见区域绘制：
  - 网格线仅根据当前视图窗口（缩放/偏移）绘制可见范围内的线段，并在倍率阈值以上才显示。
- 精确裁剪防跳变：
  - 合成时使用**浮点**源矩形（以网格单元为单位）与**像素级**目标矩形，避免取整带来的下一帧轻微放大/偏移。
- 变换镜像（Refs 同步）：
  - 在滚轮缩放/按钮缩放/拖拽平移时，先同步 `scaleRef`/`offsetRef`，再更新 React 状态与绘制，消除闭包旧值导致的抖动。
- 渲染细节：
  - 关闭 `imageSmoothing`，并为 `<canvas>` 加上 `imageRendering: pixelated`，既保像素风格也减少插值成本。
- 事件节流与被动滚轮：
  - 滚轮缩放做轻量节流（~120fps），并保证监听 `passive: false` 以 `preventDefault` 阻止页面滚动。

## 关键实现点

### 1. 静态层离屏与合成
- 一张离屏 `canvas`：`staticLayer`（初始像素）。
- 尺寸：以“网格单元”为单位（宽高均为 `gridSize`），每个单元绘制为 1×1 像素。
- 合成：将视图窗口映射到离屏源矩形（单位：单元），目标矩形按世界像素（乘以 `pixelSize`）。

示意代码（核心思路）
```ts
// 合成：仅拷贝可见范围
const ps = pixelSizeRef.current; // 像素边长（世界像素）
const viewLeft = -offsetRef.current.x;
const viewTop = -offsetRef.current.y;
const viewRight = viewLeft + canvas.width / scaleRef.current;
const viewBottom = viewTop + canvas.height / scaleRef.current;

// 源区域（单位：网格单元，浮点避免取整误差）
const srcX = Math.max(0, viewLeft / ps);
const srcY = Math.max(0, viewTop / ps);
const srcRight = Math.min(gridSizeRef.current, viewRight / ps);
const srcBottom = Math.min(gridSizeRef.current, viewBottom / ps);
const srcW = Math.max(0, srcRight - srcX);
const srcH = Math.max(0, srcBottom - srcY);

// 目标区域（单位：世界像素）
const dx = srcX * ps;
const dy = srcY * ps;
const dw = srcW * ps;
const dh = srcH * ps;

ctx.drawImage(staticLayer, srcX, srcY, srcW, srcH, dx, dy, dw, dh);
```

### 2. 用户层（不使用离屏图）下的绘制/擦除优化
- 维持用户像素在 `Map`（或等价结构）中：
  - 高频绘制/擦除时仅更新内存结构，不立即 `setState`；而是：
    - 将操作记录进缓冲队列（pending ops）。
    - 按 32~60ms 批量提交一次（或在 `mouseup/mouseleave` 强制提交）。
- 批量提交内容：
  - `setUserPixels(new Map(userPixelsRef))`（浅拷贝触发订阅者，避免每次操作都复制大 `Map`）。
  - 回调 `onUserPixelCountChange(size)`。
  - 批量合并 `drawingOperations` 并触发 `onDrawingChange`。
- 局部重绘：
  - 在当前帧用新 `scale/offset` 将用户像素（或其受影响的子集）绘制到可见区域；避免整个画布重绘。
  - 注意禁用平滑与坐标映射精度，以保证像素对齐。

### 3. 网格线仅绘制可见范围
```ts
if (showGrid && scaleRef.current > GRID_THRESHOLD) {
  const ps = pixelSizeRef.current;
  const startX = Math.max(0, Math.floor(viewLeft / ps));
  const endX = Math.min(gridSizeRef.current, Math.ceil(viewRight / ps));
  const startY = Math.max(0, Math.floor(viewTop / ps));
  const endY = Math.min(gridSizeRef.current, Math.ceil(viewBottom / ps));

  for (let x = startX; x <= endX; x++) { /* 画竖线 */ }
  for (let y = startY; y <= endY; y++) { /* 画横线 */ }
}
```

### 4. RAF 合批
- `draw()` 只负责 `requestAnimationFrame` 安排一次合成；同一帧多次调用只绘制一次。

### 5. showGrid 变化即时重绘
- `useEffect(() => scheduleDraw(), [showGrid])`，避免切换网格显隐后需要“再动一下”才更新。

### 6. 防跳变：在缩放/拖拽前同步 Refs
```ts
// 滚轮缩放
afterCalculateZoom((newScale, newOffset) => {
  scaleRef.current = newScale;
  offsetRef.current = newOffset;
  setScale(newScale);
  setOffset(newOffset);
  scheduleDraw();
});

// 拖拽平移
const newOffset = {
  x: offsetRef.current.x + deltaX / scaleRef.current,
  y: offsetRef.current.y + deltaY / scaleRef.current,
};
offsetRef.current = newOffset;
setOffset(newOffset);
scheduleDraw();
```

### 7. 像素风格与渲染设置
- 关闭平滑：`ctx.imageSmoothingEnabled = false`。
- `<canvas>` 样式添加：`style={{ imageRendering: "pixelated" }}`。


## 集成步骤清单
- [ ] 在 `useCanvasDrawing.ts` 引入：
  - 离屏层 refs：`staticLayer` 与对应 ctx（仅静态层）
  - `ensureLayer`（按 `gridSize` 尺寸，1 单元 = 1px）
  - `rebuildStaticLayer`（从 `Map` 重建）
  - `scheduleDraw`（RAF 合批 + 合成 + 可见网格绘制）
  - `scaleRef`/`offsetRef`/`pixelSizeRef`/`showGridRef`
  - `userPixelsRef`/`pendingOpsRef`/`commitTimerRef` 与 `commitNow`/`scheduleCommit`
- [ ] 修改缩放/拖拽的事件处理：先同步 Refs，再 `setState` + `scheduleDraw()`。
- [ ] 修改绘制/擦除逻辑：高频只改内存结构并局部重绘，按节流/松手时批量提交 React 状态。
- [ ] `useEffect([showGrid])` 里触发 `scheduleDraw()`，保证网格显隐即时刷新。
- [ ] `CanvasContainer.tsx` 的 `<canvas>` 增加 `imageRendering: "pixelated"`。
- [ ] 滚轮监听使用原生事件，`{ passive: false }`，并在回调内 `preventDefault()`。


## 可选增强
- **分块离屏/虚拟化**：将大网格分块为 tile（如 256×256 单元），仅重建/合成可见块，进一步降低内存和重建成本。
- **OffscreenCanvas + Worker**：将静态层重建等 CPU 密集任务移到 Web Worker，主线程只负责合成与交互。
- **WebGL/WebGPU**：极端大数据量时使用 GPU 加速栅格合成与网格绘制。
- **DPR 自适配**：按设备像素比放大画布 backend，再用 CSS 缩放，进一步提升清晰度与一致性。


## 验收建议
- 基准用例：10k~100k 像素数据，连续缩放/拖拽/绘制 10 秒。
- 观察：
  - 合成阶段 CPU 占用应显著低于逐像素重绘。
  - 拖拽/缩放基本无掉帧，绘制延迟低（< 16ms 可视反馈）。
  - 切换网格即时刷新，无需额外交互。
  - 滚轮缩放后再更新视图，不出现“轻微变大/跳变”。


## 常见问题（FAQ）
- Q：静态层的尺寸为什么用 `gridSize × gridSize`，而不是乘 `pixelSize`？
  - A：静态层存放“单元色值”，1 单元=1 像素，后续按 `pixelSize` 放大合成，能减少内存与拷贝量，并避免缩放插值。
- Q：大网格会占用多少内存？
  - A：静态离屏层为 1 张 `gridSize²` 像素的位图，内存约 `gridSize² × 4 bytes`。极大网格建议采用“分块离屏/虚拟化”。
- Q：为什么绘制要批量提交？
  - A：高频 setState + Map 拷贝会阻塞主线程且触发多次 diff/渲染；合并到 32~60ms 提交通常不影响可视反馈，但大幅降低开销。


## 变更一览（参考）
- `useCanvasDrawing.ts`
  - 新增：静态离屏层、`scheduleDraw`、`ensureLayer`、`rebuildStaticLayer`、`*Ref` 镜像
  - 修改：`handleWheelZoom/zoomIn/zoomOut` 同步 Refs；`handleMouseMove` 拖拽同步 Refs；绘制/擦除改批量提交
  - 新增：`useEffect([showGrid])` 触发重绘
- `CanvasContainer.tsx`
  - `<canvas>` 样式增加 `imageRendering: "pixelated"`


## 附录：关键片段

- 网格显隐即时重绘
```ts
useEffect(() => {
  scheduleDraw();
}, [showGrid, scheduleDraw]);
```

- 禁用平滑（在所有 2D ctx 获取后）
```ts
ctx.imageSmoothingEnabled = false;
```

- `<canvas>` 样式（像素风格）
```tsx
<canvas style={{ imageRendering: "pixelated" }} />
```

- 批量提交的强制收敛（在 `mouseup`/`mouseleave`）
```ts
commitNow();
``` 