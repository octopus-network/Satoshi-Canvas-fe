# PixelCanvas 组件架构

这个文档说明了 PixelCanvas 组件重构后的目录结构和各个模块的职责。

## 目录结构

```
src/components/PixelCanvas/
├── index.tsx                  # 主组件入口
├── types.ts                   # TypeScript 类型定义
├── constants.ts               # 常量定义
├── utils.ts                   # 工具函数
├── components/                # 子组件目录
│   ├── index.ts              # 子组件统一导出
│   ├── ColorPicker.tsx       # 颜色选择器组件
│   ├── Toolbar.tsx           # 工具栏组件
│   ├── ImageImportDialog.tsx # 图片导入对话框组件
│   └── CanvasContainer.tsx   # 画布容器组件
└── hooks/                     # 自定义 Hooks
    └── useCanvasDrawing.ts   # 画布绘制逻辑 Hook
```

## 模块说明

### 1. `index.tsx` - 主组件
- **职责**: 组件的主要逻辑和状态管理
- **内容**: 
  - 状态定义和管理
  - 事件处理器
  - 组件生命周期逻辑
  - 子组件的组合和渲染

### 2. `types.ts` - 类型定义
- **职责**: 统一管理所有 TypeScript 接口和类型
- **内容**:
  - 组件 Props 接口
  - 数据模型接口
  - 回调函数类型
  - 状态相关接口

### 3. `constants.ts` - 常量定义
- **职责**: 集中管理所有常量值
- **内容**:
  - 默认颜色数组
  - 缩放限制常量
  - 图片导入相关常量
  - 画布配置常量

### 4. `utils.ts` - 工具函数
- **职责**: 提供可复用的纯函数工具
- **内容**:
  - 坐标计算函数
  - 颜色验证函数
  - 图片处理函数
  - 缩放计算函数
  - 剪贴板操作函数

### 5. 子组件目录 `components/`

#### 5.1 `ColorPicker.tsx` - 颜色选择器
- **职责**: 处理颜色选择相关的UI和逻辑
- **功能**:
  - 默认色卡显示
  - 16进制颜色输入
  - 最近使用颜色管理
  - 颜色验证和应用

#### 5.2 `Toolbar.tsx` - 工具栏
- **职责**: 渲染和管理所有工具栏控件
- **功能**:
  - 网格大小选择
  - 绘制模式切换
  - 图片导入触发
  - 缩放控制
  - 网格显示控制
  - 操作按钮

#### 5.3 `ImageImportDialog.tsx` - 图片导入对话框
- **职责**: 处理图片导入的完整流程
- **功能**:
  - 图片预览显示
  - 导入参数调整（缩放、位置、透明度）
  - 快速位置设置
  - 实时预览更新

#### 5.4 `CanvasContainer.tsx` - 画布容器
- **职责**: 管理画布的渲染和交互
- **功能**:
  - 画布尺寸自适应
  - 坐标显示
  - 使用说明显示
  - 鼠标样式控制

### 6. 自定义 Hooks `hooks/`

#### 6.1 `useCanvasDrawing.ts` - 画布绘制逻辑
- **职责**: 封装所有画布相关的绘制逻辑
- **功能**:
  - 画布绘制函数
  - 鼠标事件处理
  - 缩放和平移逻辑
  - 像素绘制逻辑
  - 视图控制函数

## 重构收益

### 1. **代码可维护性**
- 单一职责：每个模块都有明确的职责
- 低耦合：模块间依赖关系清晰
- 高内聚：相关功能聚合在一起

### 2. **代码可复用性**
- 工具函数可以独立使用
- 子组件可以在其他地方复用
- 类型定义可以共享

### 3. **开发体验**
- 更好的代码导航
- 更容易定位问题
- 更容易添加新功能
- 更好的 TypeScript 支持

### 4. **性能优化潜力**
- 子组件可以单独优化
- 更容易实现代码分割
- 更好的 React.memo 优化机会

## 使用方式

重构后的组件使用方式保持不变：

```tsx
import PixelCanvas from '@/components/PixelCanvas';
import type { PixelCanvasRef } from '@/components/PixelCanvas';

// 使用方式与之前完全相同
<PixelCanvas
  gridSize={100}
  onGridSizeChange={handleGridSizeChange}
  initialData={initialData}
  onDrawingChange={handleDrawingChange}
/>
```

所有的 API 和功能都保持向后兼容。 

## 开发者文档（API 与特性）

### 对外导出
- 默认导出：`PixelCanvas`
- 导出类型：`PixelCanvasRef`、`PixelData`、`DrawingOperation`

```tsx
import PixelCanvas from '@/components/PixelCanvas';
import type { PixelCanvasRef, PixelData, DrawingOperation } from '@/components/PixelCanvas';
```

### Props
- **gridSize**: 100 | 1000（必填）
  - 网格维度（正方形），决定画布的像素坐标范围为 [0, gridSize-1]。
- **pixelSize?**: number（默认 4）
  - 单个像素在“世界坐标”中的边长，用于控制绘制与缩放的基础尺寸。
- **onGridSizeChange?**: (size: 100 | 1000) => void
  - 供工具栏切换网格大小时回调。
- **initialData?**: PixelData[]
  - 初始像素数据（静态层）。当传入或变更时，组件会导入为“初始层”，清空用户层，并进入已初始化状态。
- **onDrawingChange?**: (operations: DrawingOperation[]) => void
  - 绘制操作变更回调。仅在“笔触提交”或“图片导入确认”后批量触发，而非每个像素点实时触发。
- **onUserPixelCountChange?**: (count: number) => void
  - 用户层像素数量变更回调。在提交笔触、清空用户层或确认图片导入后触发。

说明：组件内部为了避免频繁回调，使用了合批与 setTimeout 0 的策略，确保状态稳定后再调用上述回调。

### Ref 方法（`PixelCanvasRef`）
- **getCurrentPixelData() => PixelData[]**
  - 返回“初始层 + 用户层”合并后的最终像素数据。
- **getDrawingOperations() => DrawingOperation[]**
  - 返回自初始化后累计的绘制操作（含 draw/erase，带时间戳）。
- **getUserDrawingData() => PixelData[]**
  - 仅返回用户层最终像素数据，便于统计与落库。
- **importData(data: PixelData[]) => void**
  - 将传入数据导入为“初始层”。会清空用户层与操作记录并进入初始化完成状态。
- **clearCanvas() => void**
  - 同时清空初始层与用户层，清空操作记录，重置为初始化完成状态。
- **clearUserDrawing() => void**
  - 仅清空用户层与操作记录，初始层不变。
- **undo() => void**
  - 撤销最近一次“笔触提交”或“图片导入确认”。仅影响用户层。
- **redo() => void**
  - 重做最近一次被撤销的操作。仅影响用户层。

### 类型（节选）
```ts
export interface PixelData {
  x: number;
  y: number;
  color: string; // e.g. "#RRGGBB"
}

export interface DrawingOperation {
  x: number;
  y: number;
  color: string;      // 擦除时为空字符串 ""
  timestamp: number;  // ms
  type: 'draw' | 'erase';
}

export type DrawingMode = 'draw' | 'erase' | 'locate';

// 仅内部使用：撤销/重做历史分组
export interface PixelChange {
  key: string;      // "x,y"
  before?: string;  // 撤销时恢复到 before
  after?: string;   // 重做时恢复到 after
}

export interface HistoryEntry {
  kind: 'stroke' | 'import';        // 笔触 或 图片导入
  changes: PixelChange[];           // 本次变更涉及的像素及前后值（仅用户层）
  operations: DrawingOperation[];   // 展示用途的操作快照
}
```

### 交互与手势
- **左键**：
  - draw 模式：绘制当前颜色。
  - erase 模式：擦除用户层对应像素（初始层不受影响）。
  - locate 模式：点击复制当前像素坐标到剪贴板（需要安全上下文）。
- **右键拖拽**：平移视图（pan）。
- **鼠标滚轮**：围绕鼠标位置缩放，内置自适应缩放速度与节流；支持在画布与容器上滚轮（passive: false）。
- **网格显示**：缩放比例大于阈值时显示网格（阈值见常量）。
- **坐标提示**：locate 模式下在画布边缘展示悬停坐标，指示面板会自动左右切换避免遮挡。

### 工具栏能力
- **网格大小**：在 100×100 与 1000×1000 之间切换（触发 `onGridSizeChange`）。
- **颜色选择**：
  - 默认色卡（见 `DEFAULT_COLORS`）。
  - 16 进制颜色输入（会校验并自动纠正为合法值）。
  - 最近使用颜色（最多记录 18 个）。
- **绘制模式**：draw / erase / locate 三种模式。
- **缩放控制**：放大 / 缩小 / 重置视图，实时显示百分比。
- **网格显示**：开关网格线。
- **撤销/重做**：撤销上一次“笔触提交/图片导入”，或重做最近一次被撤销的操作；提供禁用态。
  - i18n keys：`pages.canvas.toolbar.history`、`pages.canvas.toolbar.undo`、`pages.canvas.toolbar.redo`、`pages.canvas.toolbar.undoTip`、`pages.canvas.toolbar.redoTip`
- **清空**：清空整画布（含初始层与用户层）或仅清空用户层。
- **导出 PNG**：下载当前合成图（不包含网格线）。
- （可选）大数据量测试：快速导入 N 个点到初始层用于性能压测。

### 图片导入（Image Import）
- **入口**：点击“导入图片”，选择任意 `image/*` 文件。
- **默认配置**：
  - scale 根据图片尺寸与网格大小自动估算（限制在 [0.01, 10]）。
  - offsetX/offsetY 默认居中。
  - opacity 默认 1（100%）。
- **参数调节**：
  - scale：0.01–10（步进 0.01，支持预设倍率）。
  - offsetX：[-scaledWidth/2, gridSize]，支持输入与滑块，另提供九宫格快速定位。
  - offsetY：[-scaledHeight/2, gridSize]。
  - opacity：1–100%（内部按 0.01–1 映射）。
  - 支持从剪贴板粘贴坐标，格式如 `614,457`。
- **预览**：右侧实时预览（含网格与红框轮廓）。
- **确认导入**：
  - 将预览像素写入“用户层”，并在已初始化状态下追加对应的 `draw` 操作到操作记录。
  - 随后触发 `onUserPixelCountChange` 及（若有操作）`onDrawingChange`。
- **取消导入**：关闭对话框，不改动画布。

### 操作历史与撤销/重做
- **粒度**：以“笔触提交”与“图片导入确认”为最小历史分组。
- **范围**：仅影响用户层（`userPixels`），初始层不受撤销/重做影响。
- **行为**：
  - 每次提交笔触或确认导入会压入撤销栈（`undoStack`），并清空重做栈（`redoStack`）。
  - 执行 `undo()` 会弹出撤销栈顶并应用其 `changes`；`redo()` 会弹出重做栈顶并再次应用。
  - 新的笔触/导入发生后，重做栈会被清空（符合一般编辑器语义）。
- **清空策略**：以下操作会清空两侧历史栈：`clearCanvas()`、`clearUserDrawing()`、`importData()`、切换 `gridSize`。
- **操作记录（展示）**：`drawingOperations` 用于展示历史轨迹；撤销/重做会追加反向或原向的操作快照便于观察，但其核心以 `changes` 为准。

### 导出 PNG
- 工具栏“保存图片”将合并“初始层 + 用户层”，按网格尺寸输出为等尺寸 PNG（透明背景），并包含时间戳与网格大小的文件名。
- 组件内部导出 API 支持指定 `scale` 与 `backgroundColor`，当前通过工具栏以 `scale=1`、透明背景调用。如需开放自定义导出参数，可将该能力透出到 Ref（扩展点）。

### 常量与默认值
- `DEFAULT_PIXEL_SIZE = 4`
- `ZOOM_LIMITS = { MIN: 0.1, MAX: 10, SCALE_FACTOR: 1.2 }`
- `CANVAS = { MIN_HEIGHT: 400, DEFAULT_HEIGHT_VH: 60, MAX_HEIGHT_VH: 80, GRID_THRESHOLD_SCALE: 0.5 }`
- `IMAGE_IMPORT = { MAX_RECENT_COLORS: 18, PREVIEW_SIZE: 300, SCALE_PRESETS: [0.1, 0.25, 0.5, 1, 2, 5] }`
- `DEFAULT_COLORS`: 预置色卡数组

### 行为细节与性能说明
- 双层离屏缓存：初始层与用户层分别渲染到离屏 Canvas，主屏合成时仅绘制可见区域，极大降低重绘成本。
- 绘制合批：单次笔触期间对用户层做增量改动，笔触结束（MouseUp/Leave）一次性合并到状态并触发回调。
- RAF 合成：通过 requestAnimationFrame 合批合成，避免同步阻塞。
- 网格线：仅在可见区域绘制，且随缩放自适应线宽。
- 事件：滚轮缩放添加了节流与自适应缩放强度，拖拽过程实时渲染，防抖闪烁被抑制。

### 边界与限制
- 仅支持 `gridSize` 为 100 或 1000。
- 坐标范围为 [0, gridSize-1]，超界像素会被忽略（导入时亦会自动过滤/裁剪）。
- 颜色值需为合法 16 进制（`#RRGGBB`），不合法输入会被校正为最近的合法值或回退。
- 剪贴板能力受浏览器与安全上下文限制（HTTPS/本地文件策略），失败时静默忽略。

### 使用示例（含 Ref 与回调）
```tsx
import React, { useRef, useCallback, useState } from 'react';
import PixelCanvas, { PixelCanvasRef, PixelData, DrawingOperation } from '@/components/PixelCanvas';

export default function Demo() {
  const ref = useRef<PixelCanvasRef>(null);
  const [ops, setOps] = useState<DrawingOperation[]>([]);
  const [userCount, setUserCount] = useState(0);

  const handleExport = () => {
    // 若需拿到最终像素数据：
    const all = ref.current?.getCurrentPixelData() ?? [];
    console.log('final pixels', all.length);
  };

  const handleImport = () => {
    const data: PixelData[] = [
      { x: 1, y: 1, color: '#ff0000' },
      { x: 2, y: 2, color: '#00ff00' },
    ];
    ref.current?.importData(data);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className="btn" onClick={handleImport}>导入初始数据</button>
        <button className="btn" onClick={() => ref.current?.clearUserDrawing()}>清空用户层</button>
        <button className="btn" onClick={() => ref.current?.clearCanvas()}>清空画布</button>
        <button className="btn" onClick={handleExport}>导出（自定义）</button>
        <button className="btn" onClick={() => ref.current?.undo()}>撤销</button>
        <button className="btn" onClick={() => ref.current?.redo()}>重做</button>
      </div>

      <PixelCanvas
        ref={ref}
        gridSize={100}
        initialData={[]}
        onGridSizeChange={(s) => console.log('grid size ->', s)}
        onDrawingChange={(next) => setOps(next)}
        onUserPixelCountChange={(n) => setUserCount(n)}
      />

      <div className="text-sm text-muted-foreground">
        用户层像素：{userCount}，操作记录：{ops.length}
      </div>
    </div>
  );
}
```

### FAQ
- 为什么回调不是“每像素”触发？
  - 为避免频繁状态抖动与性能问题，组件采用“笔触提交”与导入确认时合批回调的策略。
- 导入图片后，为什么有时不记录到操作列表？
  - 仅在初始化完成后导入的像素会记录为 `draw` 操作。初始化流程会在导入初始数据或空白初始化时设置完成标记。
- 能否自定义导出参数/暴露更多 API？
  - 可以，在 `useCanvasDrawing` 已有的导出能力基础上，将其通过 `useImperativeHandle` 透出为 Ref 方法即可（当前默认工具栏以 `scale=1`、透明背景导出）。 