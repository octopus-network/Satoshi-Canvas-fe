import React, { useState, useCallback, useEffect, useRef } from "react";
import { hexToHsv, hsvToHex } from "../utils";

interface HsvColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  width?: number;
  height?: number;
}

export const HsvColorPicker: React.FC<HsvColorPickerProps> = ({
  currentColor,
  onColorChange,
  width = 240,
  height = 160,
}) => {
  const [hsv, setHsv] = useState(() => {
    const parsed = hexToHsv(currentColor);
    return parsed || { h: 0, s: 100, v: 100 };
  });
  
  const [isDraggingSaturation, setIsDraggingSaturation] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  
  const saturationRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // 同步外部颜色变化
  useEffect(() => {
    const parsed = hexToHsv(currentColor);
    if (parsed) {
      setHsv(parsed);
    }
  }, [currentColor]);

  // 更新颜色
  const updateColor = useCallback((newHsv: { h: number; s: number; v: number }) => {
    setHsv(newHsv);
    const hexColor = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    onColorChange(hexColor);
  }, [onColorChange]);

  // 处理饱和度/亮度面板点击
  const handleSaturationClick = useCallback((e: React.MouseEvent) => {
    if (!saturationRef.current) return;
    
    const rect = saturationRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    
    updateColor({ ...hsv, s: Math.max(0, Math.min(100, s)), v: Math.max(0, Math.min(100, v)) });
  }, [hsv, updateColor]);

  // 处理色相条点击
  const handleHueClick = useCallback((e: React.MouseEvent) => {
    if (!hueRef.current) return;
    
    const rect = hueRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const h = Math.round((x / rect.width) * 360);
    
    updateColor({ ...hsv, h: Math.max(0, Math.min(360, h)) });
  }, [hsv, updateColor]);

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingSaturation && saturationRef.current) {
      const rect = saturationRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const s = Math.round((x / rect.width) * 100);
      const v = Math.round(100 - (y / rect.height) * 100);
      
      updateColor({ ...hsv, s: Math.max(0, Math.min(100, s)), v: Math.max(0, Math.min(100, v)) });
    }
    
    if (isDraggingHue && hueRef.current) {
      const rect = hueRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const h = Math.round((x / rect.width) * 360);
      
      updateColor({ ...hsv, h: Math.max(0, Math.min(360, h)) });
    }
  }, [isDraggingSaturation, isDraggingHue, hsv, updateColor]);

  // 处理鼠标释放
  const handleMouseUp = useCallback(() => {
    setIsDraggingSaturation(false);
    setIsDraggingHue(false);
  }, []);

  // 添加全局事件监听
  useEffect(() => {
    if (isDraggingSaturation || isDraggingHue) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingSaturation, isDraggingHue, handleMouseMove, handleMouseUp]);

  // 计算当前选中颜色的背景色（用于色相条）
  const hueColor = hsvToHex(hsv.h, 100, 100);

  return (
    <div className="space-y-3">
      {/* 饱和度/亮度面板 */}
      <div className="relative">
        <div
          ref={saturationRef}
          className="relative cursor-crosshair border border-border rounded overflow-hidden"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            background: `linear-gradient(to right, #fff, ${hueColor}), linear-gradient(to bottom, transparent, #000)`,
            backgroundBlendMode: 'multiply',
          }}
          onClick={handleSaturationClick}
          onMouseDown={() => setIsDraggingSaturation(true)}
        >
          {/* 选中点指示器 */}
          <div
            className="absolute w-3 h-3 border-2 border-white rounded-full shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(hsv.s / 100) * width}px`,
              top: `${((100 - hsv.v) / 100) * height}px`,
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* 色相条 */}
      <div className="relative">
        <div
          ref={hueRef}
          className="relative cursor-pointer border border-border rounded overflow-hidden"
          style={{
            width: `${width}px`,
            height: '20px',
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
          }}
          onClick={handleHueClick}
          onMouseDown={() => setIsDraggingHue(true)}
        >
          {/* 色相选择器指示器 */}
          <div
            className="absolute w-1 h-full bg-white border border-gray-400 shadow-sm pointer-events-none transform -translate-x-1/2"
            style={{
              left: `${(hsv.h / 360) * width}px`,
            }}
          />
        </div>
      </div>

      {/* 颜色预览 */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 border border-border rounded"
          style={{ backgroundColor: currentColor }}
        />
        <div className="text-xs text-muted-foreground">
          H: {hsv.h}° S: {hsv.s}% V: {hsv.v}%
        </div>
      </div>
    </div>
  );
};
