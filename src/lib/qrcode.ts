/**
 * Zero-dependency QR Code (Byte mode, Error Correction Level L) generator in pure TypeScript.
 * Renders an SVG path string for crisp, scalable QR codes.
 */

// RS Polynomial Division & Generator Polynomials for QR Version 1 to 5 (ECL L)
const EC_CAPACITY = [
  { ver: 1, totalBytes: 26, dataBytes: 19, ecBytes: 7, size: 21 },
  { ver: 2, totalBytes: 44, dataBytes: 34, ecBytes: 10, size: 25 },
  { ver: 3, totalBytes: 70, dataBytes: 55, ecBytes: 15, size: 29 },
  { ver: 4, totalBytes: 100, dataBytes: 80, ecBytes: 20, size: 33 },
  { ver: 5, totalBytes: 134, dataBytes: 108, ecBytes: 26, size: 37 },
];

// Galois Field GF(256) tables with primitive polynomial 0x11d
const LOG = new Uint8Array(256);
const EXP = new Uint8Array(256);
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 256; i++) EXP[i] = EXP[i - 255];

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[(LOG[a] + LOG[b]) % 255];
}

function calcRS(data: Uint8Array, ecCount: number): Uint8Array {
  // Generator polynomial coefficients
  let poly = new Uint8Array([1]);
  for (let i = 0; i < ecCount; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }

  const res = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const m = data[i] ^ res[0];
    for (let j = 0; j < ecCount - 1; j++) {
      res[j] = res[j + 1] ^ gfMul(poly[poly.length - 1 - j], m);
    }
    res[ecCount - 1] = gfMul(poly[0], m);
  }
  return res;
}

export function generateQRCodeSVG(text: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  // Find smallest version that fits
  const config = EC_CAPACITY.find((c) => c.dataBytes >= bytes.length + 3) || EC_CAPACITY[EC_CAPACITY.length - 1];
  const { ver, dataBytes, ecBytes, size } = config;

  // Encode Bitstream: Mode (8-bit Byte = 0100) + Count (8 bits for V1-9) + Data
  const buffer: number[] = [];
  const addBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) buffer.push((val >> i) & 1);
  };

  addBits(0b0100, 4); // Byte mode
  addBits(bytes.length, 8); // Character count
  for (const b of bytes) addBits(b, 8); // Data
  addBits(0, 4); // Terminator

  while (buffer.length % 8 !== 0) buffer.push(0);

  const dataArr = new Uint8Array(dataBytes);
  let bIdx = 0;
  for (let i = 0; i < buffer.length && bIdx < dataBytes; i += 8) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) byteVal = (byteVal << 1) | buffer[i + j];
    dataArr[bIdx++] = byteVal;
  }

  // Pad bytes (0xEC, 0x11)
  const pad = [0xec, 0x11];
  let pIdx = 0;
  while (bIdx < dataBytes) {
    dataArr[bIdx++] = pad[pIdx % 2];
    pIdx++;
  }

  const ecArr = calcRS(dataArr, ecBytes);
  const totalCodewords = new Uint8Array(dataBytes + ecBytes);
  totalCodewords.set(dataArr, 0);
  totalCodewords.set(ecArr, dataBytes);

  // Build Grid Matrix
  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));

  // Finder Patterns
  const addFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        const isOuterRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const isInner3x3 = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        grid[nr][nc] = isBorder || (!isOuterRing && !isInner3x3) ? 0 : 1;
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (grid[6][i] === -1) grid[6][i] = i % 2 === 0 ? 1 : 0;
    if (grid[i][6] === -1) grid[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // Alignment Pattern (Version >= 2)
  if (ver >= 2) {
    const pos = size - 7;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = pos + dr;
        const nc = pos + dc;
        if (grid[nr][nc] === -1) {
          const isEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          grid[nr][nc] = isEdge || isCenter ? 1 : 0;
        }
      }
    }
  }

  // Reserve Format Area
  for (let i = 0; i < 9; i++) {
    if (grid[8][i] === -1) grid[8][i] = 0;
    if (grid[i][8] === -1) grid[i][8] = 0;
    if (grid[8][size - 1 - i] === -1) grid[8][size - 1 - i] = 0;
    if (grid[size - 1 - i][8] === -1) grid[size - 1 - i][8] = 0;
  }

  // Populate Data Bits
  let bitPointer = 0;
  const totalBitLen = totalCodewords.length * 8;

  let dir = -1;
  let c = size - 1;
  while (c > 0) {
    if (c === 6) c--;
    for (let r = dir === -1 ? size - 1 : 0; r >= 0 && r < size; r += dir) {
      for (const col of [c, c - 1]) {
        if (grid[r][col] === -1) {
          let val = 0;
          if (bitPointer < totalBitLen) {
            const byteIndex = Math.floor(bitPointer / 8);
            const bitIndex = 7 - (bitPointer % 8);
            val = (totalCodewords[byteIndex] >> bitIndex) & 1;
            bitPointer++;
          }
          // Mask 0: (r + col) % 2 === 0
          const mask = (r + col) % 2 === 0 ? 1 : 0;
          grid[r][col] = val ^ mask;
        }
      }
    }
    dir = -dir;
    c -= 2;
  }

  // Build SVG Path
  let svgPath = "";
  const quietZone = 2;
  const totalSize = size + quietZone * 2;

  for (let r = 0; r < size; r++) {
    for (let col = 0; col < size; col++) {
      if (grid[r][col] === 1) {
        svgPath += `M${col + quietZone},${r + quietZone}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" class="size-full fill-current"><path d="${svgPath.trim()}"/></svg>`;
}
