// 适配 canister 新接口：/head（nonce+尺寸） + /canvas（紧凑全量） + /canvas_delta?since=REV（增量）
// 浏览器 fetch 会自动解 gzip；无需特殊处理。

export interface ApiPixel {
  owner: string | null; // 兼容旧类型；新协议里一定有 owner，但保留 null 以兼容旧渲染
  price: number;
  color: string;        // "#RRGGBB"
  x: number;
  y: number;
}

export interface CanvasApiResponse {
  pixels: ApiPixel[];
  rev: number;
}

export interface CompactOperatedPayload {
  rev: number;          // 最新版本号（= 后端 nonce）
  owners: string[];     // 所有者字典表（局部）
  xs: number[];         // u16，但 JSON 里是 number
  ys: number[];
  owners_idx: number[]; // 指向 owners 的下标
  prices: number[];     // u64 -> number（如需安全可改 bigint）
  colors: number[];     // 0xRRGGBB
}

export interface DeltaResponse {
  full: boolean;                // true=直接下发全量快照
  payload: CompactOperatedPayload;
}

export interface HeadResponse {
  nonce: number;
  width: number;
  height: number;
}

export const CANVAS_API = {
  BASE_URL: "https://p4nzc-yiaaa-aaaao-qkg2q-cai.raw.icp0.io",
  ENDPOINTS: {
    CANVAS: "/canvas",
    DELTA: "/canvas_delta",
    HEAD: "/head",
  },
  DEFAULT_WIDTH: 1366,   // 默认仅占位；真实以 /head 为准
  DEFAULT_HEIGHT: 768,
} as const;

// —— 工具 ——

const hexFromRgb24 = (n: number) =>
  "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6).toUpperCase();

const keyOf = (x: number, y: number, width: number) => y * width + x;

// 紧凑 → ApiPixel[]（校验用 width/height）
export function expandCompact(
  payload: CompactOperatedPayload,
  dims: { width: number; height: number }
): ApiPixel[] {
  const len = payload.xs.length;
  if (
    payload.ys.length !== len ||
    payload.owners_idx.length !== len ||
    payload.prices.length !== len ||
    payload.colors.length !== len
  ) {
    console.error("expandCompact: column lengths mismatch");
    return [];
  }

  const { width, height } = dims;
  const out: ApiPixel[] = [];
  for (let i = 0; i < len; i++) {
    const x = payload.xs[i];
    const y = payload.ys[i];
    if (
      typeof x !== "number" || typeof y !== "number" ||
      x < 0 || y < 0 || x >= width || y >= height
    ) continue;

    const ownerIdx = payload.owners_idx[i] ?? 0;
    out.push({
      x, y,
      owner: payload.owners[ownerIdx] ?? null,
      price: payload.prices[i],
      color: hexFromRgb24(payload.colors[i] ?? 0),
    });
  }
  return out;
}

// —— HTTP ——

export async function fetchHead(): Promise<HeadResponse> {
  const resp = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.HEAD}`, {
    method: "GET",
    headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return (await resp.json()) as HeadResponse;
}

export async function fetchCanvasCompact(): Promise<CompactOperatedPayload> {
  const resp = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.CANVAS}`, {
    method: "GET",
    headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return (await resp.json()) as CompactOperatedPayload;
}

export async function fetchCanvasDelta(since: number): Promise<DeltaResponse> {
  const url = `${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.DELTA}?since=${since}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return (await resp.json()) as DeltaResponse;
}

// —— 轻量状态容器：现在保存 width/height —— 
export class CanvasStore {
  private width: number;
  private height: number;
  private map: Map<number, ApiPixel>;
  public rev: number; // = 后端 nonce

  constructor(
    width: number = CANVAS_API.DEFAULT_WIDTH,
    height: number = CANVAS_API.DEFAULT_HEIGHT
  ) {
    this.width = width;
    this.height = height;
    this.map = new Map();
    this.rev = 0;
  }

  getDims() { return { width: this.width, height: this.height }; }
  getWidth() { return this.width; }
  getHeight() { return this.height; }

  private applyFull(payload: CompactOperatedPayload) {
    this.map.clear();
    const pixels = expandCompact(payload, { width: this.width, height: this.height });
    for (const p of pixels) this.map.set(keyOf(p.x, p.y, this.width), p);
    this.rev = payload.rev;
  }

  private applyIncremental(payload: CompactOperatedPayload) {
    const pixels = expandCompact(payload, { width: this.width, height: this.height });
    for (const p of pixels) this.map.set(keyOf(p.x, p.y, this.width), p);
    this.rev = payload.rev;
  }

  // 首次：按 /head 设置尺寸，再拉全量
  async init(): Promise<CanvasApiResponse> {
    const head = await fetchHead();
    if (head.width !== this.width || head.height !== this.height) {
      this.width = head.width;
      this.height = head.height;
      this.map.clear();
      this.rev = 0;
    }
    const full = await fetchCanvasCompact();
    this.applyFull(full);
    return { pixels: this.getAllPixels(), rev: this.rev };
  }

  // 保留原 sync（不依赖 /head；anyway 服务器会处理回滚为 full=true）
  async sync(): Promise<{ changed: ApiPixel[]; fullReload: boolean; rev: number }> {
    const delta = await fetchCanvasDelta(this.rev);
    if (delta.full) {
      this.applyFull(delta.payload);
      return { changed: this.getAllPixels(), fullReload: true, rev: this.rev };
    } else {
      const before = this.rev;
      this.applyIncremental(delta.payload);
      const changed = expandCompact(delta.payload, { width: this.width, height: this.height });
      return { changed, fullReload: before === 0, rev: this.rev };
    }
  }

  // 推荐：smartSync 先探测尺寸与 nonce
  async smartSync(): Promise<{ changed: ApiPixel[]; fullReload: boolean; rev: number }> {
    const head = await fetchHead();
    // 尺寸变化：强制全量对齐
    if (head.width !== this.width || head.height !== this.height) {
      this.width = head.width;
      this.height = head.height;
      this.map.clear();
      const full = await fetchCanvasCompact();
      this.applyFull(full);
      return { changed: this.getAllPixels(), fullReload: true, rev: this.rev };
    }

    if (head.nonce === this.rev) {
      return { changed: [], fullReload: false, rev: this.rev };
    }

    const delta = await fetchCanvasDelta(this.rev);
    if (delta.full) {
      this.applyFull(delta.payload);
      return { changed: this.getAllPixels(), fullReload: true, rev: this.rev };
    } else {
      const before = this.rev;
      this.applyIncremental(delta.payload);
      const changed = expandCompact(delta.payload, { width: this.width, height: this.height });
      return { changed, fullReload: before === 0, rev: this.rev };
    }
  }

  getAllPixels(): ApiPixel[] {
    return Array.from(this.map.values());
  }

  getPixel(x: number, y: number): ApiPixel | undefined {
    return this.map.get(keyOf(x, y, this.width));
  }
}

// —— 旧导出（保持你原模块的导出名，方便最少侵入改造）——

// 旧的 fetchCanvasData：改为返回 { pixels, rev } 方便上层保存 rev
// 注意：此函数已由 canvas.service.ts 中的实现替代，保留仅为兼容
export async function fetchCanvasData(): Promise<{ pixels: ApiPixel[]; rev: number }> {
  const tempStore = new CanvasStore();
  await tempStore.init();
  return { pixels: tempStore.getAllPixels(), rev: tempStore.rev };
}

// 旧的 parseCanvasResponse：不再使用数组协议，保留一个兜底实现（从紧凑对象转数组）
// 注意：此函数需要尺寸信息，但 Response 中不包含，需要先获取 head 获取尺寸
export async function parseCanvasResponse(response: Response): Promise<ApiPixel[]> {
  try {
    const data = (await response.json()) as CompactOperatedPayload;
    if (!data || !Array.isArray(data.xs)) return [];
    // 需要先获取 head 获取尺寸
    const head = await fetchHead();
    return expandCompact(data, { width: head.width, height: head.height });
  } catch (error) {
    console.error("Failed to parse compact JSON:", error);
    return [];
  }
}
