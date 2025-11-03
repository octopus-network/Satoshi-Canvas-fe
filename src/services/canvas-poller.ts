// src/services/canvas-poller.ts
import { CanvasStore, type ApiPixel } from "./canvas-client";

export interface PollOptions {
  /** 初始间隔（成功时使用） */
  baseIntervalMs?: number;      // 默认 8000
  /** 最大回退间隔（失败时上限） */
  maxIntervalMs?: number;       // 默认 60000
  /** 回退倍数（失败后乘以它） */
  backoffFactor?: number;       // 默认 1.8
  /** 抖动比例（±jitter%） */
  jitter?: number;              // 默认 0.2
  /** 页面隐藏时的倍率（放缓） */
  hiddenMultiplier?: number;    // 默认 2
  /** 启动后是否立即发起一次同步 */
  initialImmediate?: boolean;   // 默认 true
}

type UpdatePayload = { changed: ApiPixel[]; fullReload: boolean; rev: number };

type UpdateHandler = (p: UpdatePayload) => void;
type ErrorHandler = (err: unknown) => void;

export class CanvasPoller {
  private store: CanvasStore;
  private opts: Required<PollOptions>;
  private running = false;
  private timer: number | undefined;
  private currentDelay: number;
  private updateHandlers: Set<UpdateHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private visibilityHandler: () => void;
  private onlineHandler: () => void;
  private offlineHandler: () => void;

  constructor(store?: CanvasStore, opts?: PollOptions) {
    this.store = store ?? new CanvasStore();
    this.opts = {
      baseIntervalMs: opts?.baseIntervalMs ?? 8000,
      maxIntervalMs: opts?.maxIntervalMs ?? 60000,
      backoffFactor: opts?.backoffFactor ?? 1.8,
      jitter: opts?.jitter ?? 0.2,
      hiddenMultiplier: opts?.hiddenMultiplier ?? 2,
      initialImmediate: opts?.initialImmediate ?? true,
    };
    this.currentDelay = this.opts.baseIntervalMs;
    this.visibilityHandler = () => {
      if (!this.running) return;
      // 页面从隐藏→可见：立刻同步并重置间隔
      if (typeof document !== "undefined" && !document.hidden) {
        this.currentDelay = this.opts.baseIntervalMs;
        this.tick(true).catch(() => {});
      }
    };
    this.onlineHandler = () => {
      if (this.running) {
        this.currentDelay = this.opts.baseIntervalMs;
        this.tick(true).catch(() => {});
      }
    };
    this.offlineHandler = () => { /* 可选：提示离线 */ };
  }

  /** 订阅更新（返回取消订阅函数） */
  onUpdate(fn: UpdateHandler) { 
    this.updateHandlers.add(fn); 
    return () => this.updateHandlers.delete(fn); 
  }

  /** 订阅错误（返回取消订阅函数） */
  onError(fn: ErrorHandler) { 
    this.errorHandlers.add(fn); 
    return () => this.errorHandlers.delete(fn); 
  }

  /** 启动轮询 */
  start() {
    if (this.running) return;
    this.running = true;
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", this.visibilityHandler);
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onlineHandler);
      window.addEventListener("offline", this.offlineHandler);
    }
    this.tick(this.opts.initialImmediate).catch(() => {});
  }

  /** 停止轮询 */
  stop() {
    this.running = false;
    if (this.timer !== undefined) { 
      clearTimeout(this.timer); 
      this.timer = undefined; 
    }
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.visibilityHandler);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onlineHandler);
      window.removeEventListener("offline", this.offlineHandler);
    }
  }

  /** 立即触发一次同步（不影响轮询节奏） */
  forceSync() { 
    return this.tick(true); 
  }

  private async tick(immediate = false) {
    if (!this.running) return;
    if (!immediate) await this.sleep(this.getDelay());
    if (!this.running) return;
    try {
      // ✅ 优先使用 smartSync（内部 /head + /delta；回滚会 full=true）
      const res = await this.store.smartSync();

      // 成功：重置间隔
      this.currentDelay = this.opts.baseIntervalMs;

      // 有变化才通知
      if (res.fullReload || res.changed.length) {
        this.updateHandlers.forEach(h => h(res));
      }
    } catch (err) {
      // 错误：回退并上报
      this.errorHandlers.forEach(h => h(err));
      this.currentDelay = Math.min(
        Math.floor(this.currentDelay * this.opts.backoffFactor),
        this.opts.maxIntervalMs
      );
    } finally {
      if (this.running) this.tick(false).catch(() => {});
    }
  }

  private getDelay(): number {
    let base = this.currentDelay;

    // 页面隐藏时放缓
    if (typeof document !== "undefined" && document.hidden) {
      base = Math.min(this.opts.maxIntervalMs, Math.floor(base * this.opts.hiddenMultiplier));
    }

    // 加抖动避免脉冲
    const jitter = this.opts.jitter;
    if (jitter > 0) {
      const delta = base * jitter;
      const rand = (Math.random() * 2 - 1) * delta; // ±delta
      base = Math.max(250, Math.floor(base + rand));
    }

    return base;
  }

  private sleep(ms: number) {
    return new Promise<void>(resolve => {
      this.timer = window.setTimeout(() => resolve(), ms);
    });
  }

  // —— 快照 & 访问器 ——
  getRev() { 
    return this.store.rev; 
  }

  getPixels() { 
    return this.store.getAllPixels(); 
  }

  getStore() { 
    return this.store; 
  }
}
