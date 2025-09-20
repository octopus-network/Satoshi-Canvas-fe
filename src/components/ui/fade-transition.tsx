import React from "react";
import { useTransition, animated, SpringConfig } from "@react-spring/web";
import { cn } from "@/lib/utils";

interface FadeTransitionProps {
  /** 控制组件显示/隐藏的布尔值 */
  show: boolean;
  /** 要渲染的子元素 */
  children: React.ReactNode;
  /** 动画配置 */
  config?: SpringConfig | { duration?: number };
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 入场时的初始透明度 */
  from?: { opacity?: number };
  /** 完全显示时的透明度 */
  enter?: { opacity?: number };
  /** 退场时的透明度 */
  leave?: { opacity?: number };
}

/**
 * 通用的淡入淡出过渡动画组件
 * 
 * @example
 * ```tsx
 * <FadeTransition show={isLoading}>
 *   <div>Loading...</div>
 * </FadeTransition>
 * ```
 * 
 * @example
 * ```tsx
 * <FadeTransition 
 *   show={isVisible} 
 *   config={{ duration: 300 }}
 *   className="absolute inset-0"
 * >
 *   <div>Modal Content</div>
 * </FadeTransition>
 * ```
 */
export const FadeTransition: React.FC<FadeTransitionProps> = ({
  show,
  children,
  config = { duration: 200 },
  className,
  style,
  from = { opacity: 0 },
  enter = { opacity: 1 },
  leave = { opacity: 0 },
}) => {
  const transitions = useTransition(show, {
    from,
    enter,
    leave,
    config,
  });

  return (
    <>
      {transitions((animatedStyle, item) =>
        item ? (
          <animated.div
            style={{
              ...animatedStyle,
              ...style,
            }}
            className={cn(className)}
          >
            {children}
          </animated.div>
        ) : null
      )}
    </>
  );
};

export default FadeTransition;
