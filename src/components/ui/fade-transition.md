# FadeTransition 组件

一个通用的淡入淡出过渡动画组件，基于 `react-spring` 实现，支持元素的平滑进场和退场动画。

## 功能特性

- ✅ 平滑的淡入淡出动画
- ✅ 可配置的动画参数
- ✅ 支持自定义样式和类名
- ✅ TypeScript 支持
- ✅ 轻量级，易于使用

## 基础用法

```tsx
import { FadeTransition } from "@/components/ui/fade-transition";

// 基础使用
<FadeTransition show={isVisible}>
  <div>这里是需要动画的内容</div>
</FadeTransition>
```

## 高级用法

### 自定义动画持续时间

```tsx
<FadeTransition 
  show={isLoading} 
  config={{ duration: 300 }}
>
  <div>加载中...</div>
</FadeTransition>
```

### 添加自定义样式

```tsx
<FadeTransition 
  show={isModalOpen}
  className="fixed inset-0 bg-black/50 flex items-center justify-center"
  style={{ zIndex: 1000 }}
>
  <div className="bg-white p-6 rounded-lg">
    模态框内容
  </div>
</FadeTransition>
```

### 自定义透明度值

```tsx
<FadeTransition 
  show={isVisible}
  from={{ opacity: 0.2 }}
  enter={{ opacity: 0.9 }}
  leave={{ opacity: 0 }}
>
  <div>自定义透明度变化</div>
</FadeTransition>
```

## API 参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `show` | `boolean` | - | **必需**。控制组件显示/隐藏的布尔值 |
| `children` | `React.ReactNode` | - | **必需**。要渲染的子元素 |
| `config` | `SpringConfig \| { duration?: number }` | `{ duration: 200 }` | 动画配置参数 |
| `className` | `string` | - | 自定义 CSS 类名 |
| `style` | `React.CSSProperties` | - | 自定义内联样式 |
| `from` | `{ opacity?: number }` | `{ opacity: 0 }` | 入场时的初始透明度 |
| `enter` | `{ opacity?: number }` | `{ opacity: 1 }` | 完全显示时的透明度 |
| `leave` | `{ opacity?: number }` | `{ opacity: 0 }` | 退场时的透明度 |

## 使用场景

### 1. 加载遮罩层

```tsx
<div className="relative">
  {/* 主要内容 */}
  <div>主要内容区域</div>
  
  {/* 加载遮罩 */}
  <FadeTransition 
    show={isLoading}
    className="absolute inset-0 bg-white/80 flex items-center justify-center"
  >
    <div>加载中...</div>
  </FadeTransition>
</div>
```

### 2. 条件显示的通知

```tsx
<FadeTransition show={hasError}>
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
    错误信息：{errorMessage}
  </div>
</FadeTransition>
```

### 3. 模态框背景

```tsx
<FadeTransition 
  show={isOpen}
  className="fixed inset-0 bg-black/50 z-50"
>
  <div className="flex items-center justify-center min-h-screen">
    <div className="bg-white p-6 rounded-lg">
      模态框内容
    </div>
  </div>
</FadeTransition>
```

## 性能说明

- 使用 `react-spring` 的 `useTransition` 钩子，性能优异
- 仅在必要时创建和销毁 DOM 元素
- 支持 GPU 加速的 CSS 动画
- 默认 200ms 动画时长，平衡了流畅性和响应速度

## 注意事项

1. 确保项目已安装 `@react-spring/web` 依赖
2. 组件会在 `show` 为 `false` 时完全从 DOM 中移除
3. 动画过程中元素仍会占用 DOM 位置，适合绝对定位的遮罩层使用
