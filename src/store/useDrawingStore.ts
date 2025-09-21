/**
 * Drawing state management Store
 * Manages global drawing state, controls polling pause and resume
 */

import { create } from 'zustand'

interface DrawingState {
  /** Whether currently drawing (mouse down state) */
  isDrawing: boolean
  /** Set drawing state */
  setIsDrawing: (isDrawing: boolean) => void
  /** Start drawing */
  startDrawing: () => void
  /** End drawing */
  endDrawing: () => void
}

export const useDrawingStore = create<DrawingState>((set) => ({
  isDrawing: false,
  setIsDrawing: (isDrawing: boolean) => {
    // console.log(`🎨 Global drawing state change: ${isDrawing ? 'Start drawing' : 'End drawing'}`);
    set({ isDrawing });
  },
  startDrawing: () => {
    // console.log('🎨 Start drawing');
    set({ isDrawing: true });
  },
  endDrawing: () => {
    // console.log('🎨 End drawing');
    set({ isDrawing: false });
  },
}))
