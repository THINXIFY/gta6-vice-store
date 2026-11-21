/**
 * Minimal GIF decoder (GIF87a/89a), dependency-free: returns every frame fully composited at
 * the logical screen size, honouring global/local colour tables, transparency, interlacing and
 * the disposal methods. Used to scrub an animation by scroll position instead of time.
 */

export type GifFrame = { rgba: Uint8ClampedArray<ArrayBuffer>; delayMs: number };
export type DecodedGif = { width: number; height: number; frames: GifFrame[] };

function lzw(data: Uint8Array, minCodeSize: number, pixelCount: number): Uint8Array {
  const out = new Uint8Array(pixelCount);
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const prefix = new Uint16Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);
  let codeSize = minCodeSize + 1;
  let mask = (1 << codeSize) - 1;
  let next = clear + 2;
  let old = -1;
  let first = 0;
  let bits = 0;
  let datum = 0;
  let op = 0;
  for (let i = 0; i < clear; i++) suffix[i] = i;

  for (let i = 0; i < data.length && op < pixelCount; ) {
    while (bits < codeSize && i < data.length) {
      datum |= data[i++]! << bits;
      bits += 8;
    }
    if (bits < codeSize) break;
    let code = datum & mask;
    datum >>>= codeSize;
    bits -= codeSize;

    if (code === clear) {
      codeSize = minCodeSize + 1;
      mask = (1 << codeSize) - 1;
      next = clear + 2;
      old = -1;
      continue;
    }
    if (code === end) break;
    if (old === -1) {
      out[op++] = suffix[code]!;
      old = code;
      first = code;
      continue;
    }
    const incoming = code;
    let sp = 0;
    if (code >= next) {
      stack[sp++] = first;
      code = old;
    }
    while (code >= clear) {
      stack[sp++] = suffix[code]!;
      code = prefix[code]!;
    }
    first = suffix[code]!;
    stack[sp++] = first;
    if (next < 4096) {
      prefix[next] = old;
      suffix[next] = first;
      next++;
      if ((next & mask) === 0 && next < 4096) {
        codeSize++;
        mask = (1 << codeSize) - 1;
      }
    }
    old = incoming;
    while (sp > 0 && op < pixelCount) out[op++] = stack[--sp]!;
  }
  return out;
}

export function decodeGif(buffer: ArrayBuffer): DecodedGif {
  const b = new Uint8Array(buffer);
  const sig = String.fromCharCode(...b.subarray(0, 6));
  if (sig !== "GIF87a" && sig !== "GIF89a") throw new Error("Not a GIF");
  const width = b[6]! | (b[7]! << 8);
  const height = b[8]! | (b[9]! << 8);
  const packed = b[10]!;
  let p = 13;
  let globalTable: Uint8Array | null = null;
  if (packed & 0x80) {
    const size = 3 * (1 << ((packed & 7) + 1));
    globalTable = b.subarray(p, p + size);
    p += size;
  }

  const frames: GifFrame[] = [];
  const canvas = new Uint8ClampedArray(width * height * 4);
  let gce = { disposal: 0, transparent: -1, delayMs: 100 };

  const readBlocks = () => {
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (p < b.length) {
      const n = b[p++]!;
      if (n === 0) break;
      chunks.push(b.subarray(p, p + n));
      total += n;
      p += n;
    }
    const all = new Uint8Array(total);
    let o = 0;
    for (const c of chunks) {
      all.set(c, o);
      o += c.length;
    }
    return all;
  };

  while (p < b.length) {
    const block = b[p++];
    if (block === 0x3b) break; // trailer
    if (block === 0x21) {
      const label = b[p++];
      if (label === 0xf9) {
        // Graphic control extension
        const flags = b[p + 1]!;
        gce = {
          disposal: (flags >> 2) & 7,
          transparent: flags & 1 ? b[p + 4]! : -1,
          delayMs: Math.max(20, (b[p + 2]! | (b[p + 3]! << 8)) * 10 || 100),
        };
        p += 6; // size(4) + fields + terminator
      } else {
        readBlocks();
      }
      continue;
    }
    if (block !== 0x2c) break; // unknown: stop safely

    const left = b[p]! | (b[p + 1]! << 8);
    const top = b[p + 2]! | (b[p + 3]! << 8);
    const w = b[p + 4]! | (b[p + 5]! << 8);
    const h = b[p + 6]! | (b[p + 7]! << 8);
    const flags = b[p + 8]!;
    p += 9;
    let table = globalTable;
    if (flags & 0x80) {
      const size = 3 * (1 << ((flags & 7) + 1));
      table = b.subarray(p, p + size);
      p += size;
    }
    const interlaced = (flags & 0x40) !== 0;
    const minCode = b[p++]!;
    const indices = lzw(readBlocks(), minCode, w * h);

    // Disposal 3 (restore to previous) needs the canvas as it was before this frame.
    const before = gce.disposal === 3 ? canvas.slice() : null;

    // Interlaced rows arrive in 4 passes.
    const rowOrder: number[] = [];
    if (interlaced) {
      for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]] as const) for (let y = start; y < h; y += step) rowOrder.push(y);
    }
    for (let i = 0; i < h; i++) {
      const y = interlaced ? rowOrder[i]! : i;
      const cy = top + y;
      if (cy >= height) continue;
      for (let x = 0; x < w; x++) {
        const cx = left + x;
        if (cx >= width) continue;
        const idx = indices[i * w + x]!;
        if (idx === gce.transparent || !table) continue;
        const o = (cy * width + cx) * 4;
        canvas[o] = table[idx * 3]!;
        canvas[o + 1] = table[idx * 3 + 1]!;
        canvas[o + 2] = table[idx * 3 + 2]!;
        canvas[o + 3] = 255;
      }
    }
    frames.push({ rgba: canvas.slice(), delayMs: gce.delayMs });

    if (gce.disposal === 2) {
      for (let y = top; y < Math.min(height, top + h); y++) canvas.fill(0, (y * width + left) * 4, (y * width + Math.min(width, left + w)) * 4);
    } else if (gce.disposal === 3 && before) {
      canvas.set(before);
    }
    gce = { disposal: 0, transparent: -1, delayMs: 100 };
  }
  return { width, height, frames };
}
