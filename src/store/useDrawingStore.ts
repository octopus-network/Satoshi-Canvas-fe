/**
 * 绘制状态管理 Store
 * 用于管理全局绘制状态，控制轮询的暂停和恢复
 */

import { create } from 'zustand'

interface DrawingState {
  /** 是否正在绘制（鼠标按下状态） */
  isDrawing: boolean
  /** 设置绘制状态 */
  setIsDrawing: (isDrawing: boolean) => void
  /** 开始绘制 */
  startDrawing: () => void
  /** 结束绘制 */
  endDrawing: () => void
}

export const useDrawingStore = create<DrawingState>((set) => ({
  isDrawing: false,
  setIsDrawing: (isDrawing: boolean) => {
    // console.log(`🎨 全局绘制状态变更: ${isDrawing ? '开始绘制' : '结束绘制'}`);
    set({ isDrawing });
  },
  startDrawing: () => {
    // console.log('🎨 开始绘制');
    set({ isDrawing: true });
  },
  endDrawing: () => {
    // console.log('🎨 结束绘制');
    set({ isDrawing: false });
  },
}))
