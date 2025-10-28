export interface PurchasePixel { x: number; y: number; color: string; }

const toRgb24 = (hex: string): number => {
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.startsWith("0x") || s.startsWith("0X")) s = s.slice(2);
  if (s.length !== 6) throw new Error("Bad color length");
  const v = parseInt(s, 16);
  if (Number.isNaN(v)) throw new Error("Bad color hex");
  return v >>> 0; // 0xRRGGBB
};

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    s += String.fromCharCode.apply(null, Array.from(sub) as unknown as number[]);
  }
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const varuintLen = (x: number): number => {
  let n = 0;
  let v = x >>> 0;
  do { n++; v >>>= 7; } while (v > 0);
  return n;
};
const writeVaruint = (buf: Uint8Array, off: number, x: number): number => {
  let v = x >>> 0;
  while (v >= 0x80) {
    buf[off++] = (v & 0x7f) | 0x80;
    v >>>= 7;
  }
  buf[off++] = v & 0x7f;
  return off;
};

/**
 * 打包 PX3 base64url 字符串（单买家）
 * @param buyer 购买者地址
 * @param items 像素（x,y,color）
 * @param grid  画布宽（默认 1000）
 */
export function packPX3Base64Url(
  buyer: string,
  items: PurchasePixel[],
  grid = 1000
): string {
  if (items.length === 0) {
    const enc = new TextEncoder();
    const bb = enc.encode(buyer);
    const total = 5 + 2 + bb.length + 4; // hdr + buyer + count(0)
    const buf = new Uint8Array(total);
    let off = 0;
    buf.set([0x50,0x58,0x33,0x01,0x00], off); off += 5; // "PX3", v=1, flags=0
    buf[off++] = bb.length & 0xff; buf[off++] = (bb.length>>>8)&0xff;
    buf.set(bb, off); off += bb.length;
    buf[off++] = 0; buf[off++] = 0; buf[off++] = 0; buf[off++] = 0;
    return bytesToBase64Url(buf);
  }

  const enc = new TextEncoder();
  const buyerBytes = enc.encode(buyer);
  if (buyerBytes.length > 0xffff) throw new Error("buyer too long");

  const n = items.length;
  const idxs = new Array<number>(n);
  const colors = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const it = items[i];
    if (it.x < 0 || it.x >= grid || it.y < 0 || it.y >= grid) {
      throw new Error("x/y out of range");
    }
    idxs[i] = it.x + it.y * grid;
    colors[i] = toRgb24(it.color);
  }

  // 颜色：是否可用 256 色调色板
  const paletteMap = new Map<number, number>();
  const palette: number[] = [];
  for (const c of colors) {
    if (!paletteMap.has(c)) {
      if (palette.length >= 256) break;
      paletteMap.set(c, palette.length);
      palette.push(c);
    }
  }
  const usePalette = palette.length <= 256;

  // 索引：Abs24(3B/idx) vs DeltaVarint（按大小估算择优）
  const idxSorted = [...idxs].sort((a,b) => a-b);
  let varintBytes = varuintLen(idxSorted[0]);
  for (let i = 1; i < n; i++) varintBytes += varuintLen(idxSorted[i] - idxSorted[i-1]);
  const absBytes = n * 3;
  const useDelta = varintBytes < absBytes;

  // 总长度估算
  let total = 5 + 2 + buyerBytes.length + 4; // hdr + buyer + count
  if (usePalette) total += 2 + palette.length * 3; // palette_cnt + palette
  total += useDelta ? varintBytes : absBytes;      // indices
  total += usePalette ? n : n * 3;                 // colors

  const buf = new Uint8Array(total);
  let off = 0;

  const flags =
    (useDelta ? 0b01 : 0b00) | // idx_mode
    ((usePalette ? 1 : 0) << 2); // color_mode

  // header
  buf.set([0x50,0x58,0x33,0x01, flags], off); off += 5; // "PX3", v=1, flags
  buf[off++] = buyerBytes.length & 0xff; buf[off++] = (buyerBytes.length>>>8)&0xff;
  buf.set(buyerBytes, off); off += buyerBytes.length;
  buf[off++] = (n      ) & 0xff;
  buf[off++] = (n >>> 8) & 0xff;
  buf[off++] = (n >>>16) & 0xff;
  buf[off++] = (n >>>24) & 0xff;

  // palette (optional)
  if (usePalette) {
    buf[off++] = palette.length & 0xff;
    buf[off++] = (palette.length >>> 8) & 0xff;
    for (const c of palette) {
      buf[off++] = (c >>> 16) & 0xff;
      buf[off++] = (c >>> 8)  & 0xff;
      buf[off++] = (c       ) & 0xff;
    }
  }

  if (useDelta) {
    // 为了让 colors 与 indices 顺序一致：把像素整体按 idx 排序
    const pix = idxs.map((idx, i) => ({ idx, color: colors[i] }))
                     .sort((a,b)=>a.idx-b.idx);
    // indices: varint
    off = writeVaruint(buf, off, pix[0].idx);
    for (let i = 1; i < n; i++) off = writeVaruint(buf, off, pix[i].idx - pix[i-1].idx);
    // colors
    if (usePalette) {
      for (let i = 0; i < n; i++) buf[off++] = paletteMap.get(pix[i].color)! & 0xff;
    } else {
      for (let i = 0; i < n; i++) {
        const c = pix[i].color;
        buf[off++] = (c >>> 16) & 0xff;
        buf[off++] = (c >>> 8)  & 0xff;
        buf[off++] = (c       ) & 0xff;
      }
    }
  } else {
    // indices: Abs24（按原顺序）
    for (let i = 0; i < n; i++) {
      const idx = idxs[i];
      buf[off++] = (idx       ) & 0xff;
      buf[off++] = (idx >>>  8) & 0xff;
      buf[off++] = (idx >>> 16) & 0xff;
    }
    // colors
    if (usePalette) {
      for (let i = 0; i < n; i++) buf[off++] = paletteMap.get(colors[i])! & 0xff;
    } else {
      for (let i = 0; i < n; i++) {
        const c = colors[i];
        buf[off++] = (c >>> 16) & 0xff;
        buf[off++] = (c >>> 8)  & 0xff;
        buf[off++] = (c       ) & 0xff;
      }
    }
  }

  return bytesToBase64Url(buf);
}


