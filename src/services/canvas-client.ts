// 适配 canister 新接口：/canvas（紧凑全量）与 /canvas_delta?since=REV（增量）
// 浏览器 fetch 会自动解 gzip；无需特殊处理。

export interface ApiPixel {
  owner: string | null; // 兼容旧类型；新协议里一定有 owner，但保留 null 以兼容旧渲染
  price: number;        // 注意：如需安全处理>2^53-1，请改为 bigint
  color: string;        // "#RRGGBB"
  x: number;
  y: number;
}

export interface CanvasApiResponse {
  pixels: ApiPixel[];
  rev: number;
}

// ——新协议类型——
export interface CompactOperatedPayload {
  rev: number;          // 最新版本号
  owners: string[];     // 所有者字典表
  xs: number[];         // u16，不过 JSON 里就是 number
  ys: number[];
  owners_idx: number[]; // 指向 owners 的下标
  prices: number[];     // u64 序列化为 JSON number（如需 BigInt 可调整）
  colors: number[];     // 0xRRGGBB
}

export interface DeltaResponse {
  full: boolean;                // true=直接下发全量快照
  payload: CompactOperatedPayload;
}

export const CANVAS_API = {
  BASE_URL: "https://p4nzc-yiaaa-aaaao-qkg2q-cai.raw.icp0.io",
  ENDPOINTS: {
    CANVAS: "/canvas",
    DELTA: "/canvas_delta",
  },
  GRID_SIZE: 1000,
} as const;

// ———— 工具 ————
const hexFromRgb24 = (n: number) =>
  "#" + (n >>> 0).toString(16).padStart(6, "0").slice(-6).toUpperCase();

const keyOf = (x: number, y: number, grid: number = CANVAS_API.GRID_SIZE) => y * grid + x;

// 解包紧凑载荷 → ApiPixel[]
export function expandCompact(payload: CompactOperatedPayload, grid: number = CANVAS_API.GRID_SIZE): ApiPixel[] {
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

  const out: ApiPixel[] = new Array(len);
  for (let i = 0; i < len; i++) {
    const x = payload.xs[i];
    const y = payload.ys[i];

    // 基础校验（与旧逻辑一致）
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      x < 0 ||
      y < 0 ||
      x >= grid ||
      y >= grid
    ) {
      continue;
    }

    const ownerIdx = payload.owners_idx[i] ?? 0;
    const owner = payload.owners[ownerIdx] ?? null;
    out[i] = {
      x,
      y,
      owner,
      price: payload.prices[i],
      color: hexFromRgb24(payload.colors[i] ?? 0),
    };
  }
  // 过滤掉可能的空洞
  return out.filter(Boolean) as ApiPixel[];
}

// —— HTTP ——
// 首次全量（紧凑）
export async function fetchCanvasCompact(): Promise<CompactOperatedPayload> {
  const resp = await fetch(`${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.CANVAS}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Cache-Control": "no-cache",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = (await resp.json()) as CompactOperatedPayload;
  return data;
}

// 增量
export async function fetchCanvasDelta(since: number): Promise<DeltaResponse> {
  const url = `${CANVAS_API.BASE_URL}${CANVAS_API.ENDPOINTS.DELTA}?since=${since}`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Cache-Control": "no-cache",
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = (await resp.json()) as DeltaResponse;
  return data;
}

// —— 轻量状态容器：把紧凑格式解包成 ApiPixel[] 并支持增量应用 ——
export class CanvasStore {
  private grid: number;
  private map: Map<number, ApiPixel>;
  public rev: number; // 当前持有的最新版本号

  constructor(grid: number = CANVAS_API.GRID_SIZE) {
    this.grid = grid;
    this.map = new Map();
    this.rev = 0;
  }

  // 全量替换
  private applyFull(payload: CompactOperatedPayload) {
    this.map.clear();
    const pixels = expandCompact(payload, this.grid);
    for (const p of pixels) {
      this.map.set(keyOf(p.x, p.y, this.grid), p);
    }
    this.rev = payload.rev;
  }

  // 增量写入（payload 中的像素直接覆盖）
  private applyIncremental(payload: CompactOperatedPayload) {
    const pixels = expandCompact(payload, this.grid);
    for (const p of pixels) {
      this.map.set(keyOf(p.x, p.y, this.grid), p);
    }
    this.rev = payload.rev;
  }

  // 对外：初始化（一次全量）
  async init(): Promise<CanvasApiResponse> {
    const full = await fetchCanvasCompact();
    this.applyFull(full);
    return { pixels: this.getAllPixels(), rev: this.rev };
  }

  // 对外：拉取并应用增量（返回变化的像素，便于局部重绘）
  async sync(): Promise<{ changed: ApiPixel[]; fullReload: boolean; rev: number }> {
    const delta = await fetchCanvasDelta(this.rev);
    if (delta.full) {
      this.applyFull(delta.payload);
      return { changed: this.getAllPixels(), fullReload: true, rev: this.rev };
    } else {
      this.applyIncremental(delta.payload);
      const changed = expandCompact(delta.payload, this.grid);
      return { changed, fullReload: false, rev: this.rev };
    }
  }

  getAllPixels(): ApiPixel[] {
    return Array.from(this.map.values());
  }

  getPixel(x: number, y: number): ApiPixel | undefined {
    return this.map.get(keyOf(x, y, this.grid));
  }
}

// —— 旧导出（保持你原模块的导出名，方便最少侵入改造）——

// 旧的 fetchCanvasData：改为返回 { pixels, rev } 方便上层保存 rev
export async function fetchCanvasData(): Promise<{ pixels: ApiPixel[]; rev: number }> {
  const full = await fetchCanvasCompact();
  const pixels = expandCompact(full);
  return { pixels, rev: full.rev };
}

// 旧的 parseCanvasResponse：不再使用数组协议，保留一个兜底实现（从紧凑对象转数组）
export async function parseCanvasResponse(response: Response): Promise<ApiPixel[]> {
  try {
    const data = (await response.json()) as CompactOperatedPayload;
    if (!data || !Array.isArray(data.xs)) return [];
    return expandCompact(data);
  } catch (error) {
    console.error("Failed to parse compact JSON:", error);
    return [];
  }
}


