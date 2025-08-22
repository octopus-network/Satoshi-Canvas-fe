import React, { useState, useCallback, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEFAULT_COLORS } from "../constants";
import { validateAndApplyHexColor } from "../utils";
import { useTranslation } from "react-i18next";

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  recentColors: string[];
  onAddToRecentColors: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentColor,
  onColorChange,
  recentColors,
  onAddToRecentColors,
}) => {
  const [hexInputValue, setHexInputValue] = useState(currentColor);
  const { t } = useTranslation();

  // 处理16进制颜色输入
  const handleHexInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHexInputValue(value); // 只更新本地输入状态
    },
    []
  );

  // 验证并应用16进制颜色
  const validateAndApplyColor = useCallback(
    (value: string) => {
      const validatedColor = validateAndApplyHexColor(value, currentColor);
      if (validatedColor !== currentColor) {
        onColorChange(validatedColor);
        onAddToRecentColors(validatedColor);
      }
      setHexInputValue(validatedColor);
    },
    [currentColor, onColorChange, onAddToRecentColors]
  );

  // 处理输入框的键盘事件
  const handleHexInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 按Enter键应用颜色
      if (e.key === "Enter") {
        validateAndApplyColor(hexInputValue);
      }
    },
    [hexInputValue, validateAndApplyColor]
  );

  // 处理输入框失去焦点
  const handleHexInputBlur = useCallback(() => {
    validateAndApplyColor(hexInputValue);
  }, [hexInputValue, validateAndApplyColor]);

  // 处理颜色选择
  const handleColorSelect = useCallback(
    (color: string) => {
      onColorChange(color);
      onAddToRecentColors(color);
    },
    [onColorChange, onAddToRecentColors]
  );

  // 同步currentColor变化到输入框
  useEffect(() => {
    setHexInputValue(currentColor);
  }, [currentColor]);

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm font-medium text-foreground">
        {t("pages.canvas.colorPicker.colorLabel")}
      </span>

      <TooltipProvider>
        <Popover>
          <Tooltip delayDuration={350}>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  className="w-10 h-10 rounded border-2 border-border cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                  style={{ backgroundColor: currentColor }}
                />
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("pages.canvas.colorPicker.currentColor")}: {currentColor}
              </p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-auto p-4"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {/* 默认色卡 */}
            <div className="mb-4">
              <p className="text-xs font-medium text-foreground mb-2">
                {t("pages.canvas.colorPicker.defaultPalette")}
              </p>
              <div className="grid grid-cols-6 gap-1">
                {DEFAULT_COLORS.map((color, index) => (
                  <Tooltip key={`${color}-${index}`} delayDuration={350}>
                    <TooltipTrigger asChild>
                      <button
                        className={`w-8 h-8 rounded border-2 cursor-pointer hover:scale-110 transition-transform ${
                          currentColor === color
                            ? "border-primary border-4"
                            : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleColorSelect(color)}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{color}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* 16进制颜色输入 */}
            <div className="mb-4">
              <p className="text-xs font-medium text-foreground mb-2">
                {t("pages.canvas.colorPicker.hexInputLabel")}
              </p>
              <div className="flex gap-2 items-center mr-1">
                <input
                  type="text"
                  value={hexInputValue}
                  onChange={handleHexInputChange}
                  onKeyDown={handleHexInputKeyDown}
                  onBlur={handleHexInputBlur}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={7}
                />
                <Tooltip delayDuration={350}>
                  <TooltipTrigger asChild>
                    <div
                      className="w-8 h-8 rounded border border-border cursor-help"
                      style={{ backgroundColor: currentColor }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {t("pages.canvas.colorPicker.currentColor")}:{" "}
                      {currentColor}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 最近使用的颜色 */}
            {recentColors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-foreground mb-2">
                  {t("pages.canvas.colorPicker.recentUsed")}
                </p>
                <div className="flex gap-1 flex-wrap max-w-[248px]">
                  {recentColors.map((color, index) => (
                    <Tooltip key={`${color}-${index}`} delayDuration={350}>
                      <TooltipTrigger asChild>
                        <button
                          className={`w-6 h-6 rounded border-2 cursor-pointer hover:scale-110 transition-transform ${
                            currentColor === color
                              ? "border-primary"
                              : "border-border"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorSelect(color)}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{color}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    </div>
  );
};
