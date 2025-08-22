# Qiuye Canvas

一个可扩展的像素画板应用与组件库，基于 React 18 + TypeScript + Vite 构建，内置 Tailwind CSS v4 与 shadcn/ui，专注于高性能像素绘制体验。

## 特性

- 现代技术栈：React 18、TypeScript、Vite、Tailwind CSS v4、shadcn/ui
- 高性能像素绘制：离屏图层、可见区域绘制、RAF 合批
- 交互完善：缩放、拖拽、网格开关、颜色选择器、最近使用颜色
- 组件化设计：`src/components/PixelCanvas/` 下模块清晰、易维护
- 国际化：内置 `zh-CN` 与 `en-US`

## 安装与启动

```bash
pnpm install
pnpm dev
```

构建与预览：

```bash
pnpm build
pnpm preview
```

## 路由与页面

- `/` 与 `/canvas`：像素画板主页面（Qiuye Canvas 演示）

## 使用 PixelCanvas 组件

```tsx
import PixelCanvas from '@/components/PixelCanvas';
import type { PixelCanvasRef } from '@/components/PixelCanvas';

<PixelCanvas
  gridSize={100}
  onGridSizeChange={(size) => {}}
  initialData={[]}
  onDrawingChange={(ops) => {}}
/>
```

更多组件架构见 `src/components/PixelCanvas/README.md`。

## 环境变量

在根目录创建 `.env`：

```env
VITE_APP_TITLE=Qiuye Canvas
VITE_APP_DESCRIPTION=A canvas app built with React and TypeScript
VITE_API_BASE_URL=http://localhost:3001/api
```

## 文档

- `docs/pixel-canvas-performance.md` 性能优化指南

## 许可证

MIT
