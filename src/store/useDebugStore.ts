import { create } from 'zustand';

interface DebugState {
  isDebugMode: boolean;
  enableDebugMode: () => void;
  disableDebugMode: () => void;
  toggleDebugMode: () => void;
}

export const useDebugStore = create<DebugState>((set, get) => ({
  isDebugMode: false,

  enableDebugMode: () => {
    set({ isDebugMode: true });
    console.log('🔧 全局调试模式已启用');
  },

  disableDebugMode: () => {
    set({ isDebugMode: false });
    console.log('🔧 全局调试模式已禁用');
  },

  toggleDebugMode: () => {
    const currentMode = get().isDebugMode;
    set({ isDebugMode: !currentMode });
    console.log(`🔧 全局调试模式已${!currentMode ? '启用' : '禁用'}`);
  },
}));

// 在window对象上注册全局调试命令
if (typeof window !== 'undefined') {
  (window as any).enableDebug = () => {
    useDebugStore.getState().enableDebugMode();
  };

  (window as any).disableDebug = () => {
    useDebugStore.getState().disableDebugMode();
  };

  (window as any).toggleDebug = () => {
    useDebugStore.getState().toggleDebugMode();
  };

  (window as any).debugHelp = () => {
    console.log(`
🔧 全局调试命令帮助：
- enableDebug()   : 启用全局调试模式（显示所有调试信息）
- disableDebug()  : 禁用全局调试模式（隐藏所有调试信息）
- toggleDebug()   : 切换全局调试模式状态
- debugHelp()     : 显示此帮助信息

当前状态: ${useDebugStore.getState().isDebugMode ? '已启用' : '已禁用'}
    `);
  };
}
