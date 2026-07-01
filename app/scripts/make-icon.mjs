// Tạo file icon.ico 256x256 cho electron-builder
// PNG nhúng trong ICO (Windows Vista+ hỗ trợ)
// Màu gradient tím-hồng + chữ "M"
import fs from "node:fs";
import zlib from "node:zlib";
import path from "node:path";

const SIZE = 256;
const data = Buffer.alloc(SIZE * SIZE * 4);

// Tính pixel
function setPx(x, y, r, g, b, a) {
  const idx = (y * SIZE + x) * 4;
  data[idx] = b;       // BGR
  data[idx + 1] = g;
  data[idx + 2] = r;
  data[idx + 3] = a;
}

// Vẽ gradient + shape tròn
const cx = SIZE / 2;
const cy = SIZE / 2;
const radius = SIZE * 0.42;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius + 4) {
      setPx(x, y, 0, 0, 0, 0);
      continue;
    }
    const t = (x + y) / (SIZE * 2);
    const r = Math.round(139 + (236 - 139) * t);
    const g = Math.round(92 + (72 - 92) * t);
    const b = Math.round(246 + (153 - 246) * t);
    let a = 255;
    if (dist > radius - 6) {
      a = Math.round(255 * (1 - (dist - (radius - 6)) / 10));
    } else if (dist > radius - 18) {
      const ringT = (dist - (radius - 18)) / 12;
      a = 255 - Math.round(ringT * 60);
    } else {
      a = 255;
    }
    setPx(x, y, r, g, b, Math.max(0, Math.min(255, a)));
  }
}

// Vẽ chữ "M" ở giữa (pixel font thủ công)
function drawM(ox, oy, scale, color) {
  // M is made of vertical bars + diagonals
  const pixels = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 9; col++) {
      // Left vertical bar
      if (col === 0 || col === 1) pixels.push([col, row]);
      // Right vertical bar
      if (col === 7 || col === 8) pixels.push([col, row]);
      // Left diagonal (top 3 rows)
      if (row <= 3 && (col === 2 || col === 3) && col - 1 === row) pixels.push([col, row]);
      if (row <= 3 && (col === 2 || col === 3) && 8 - col === row) pixels.push([col, row]);
      // Middle valleys
      if (row === 0 || row === 1) {
        if (col === 4 || col === 5 || col === 6) pixels.push([col, row]);
      }
    }
  }
  for (const [px, py] of pixels) {
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const x = ox + px * scale + dx;
        const y = oy + py * scale + dy;
        if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) {
          setPx(x, y, color[0], color[1], color[2], 255);
        }
      }
    }
  }
}

const scale = 14;
const offsetX = Math.round((SIZE - 9 * scale) / 2);
const offsetY = Math.round((SIZE - 7 * scale) / 2);
drawM(offsetX, offsetY, scale, [255, 255, 255]);

// Tạo PNG từ raw RGBA
function crc32(buf) {
  let c;
  let crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// Filter byte 0 mỗi row + RGBA
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  raw[y * (1 + SIZE * 4)] = 0;
  data.copy(raw, y * (1 + SIZE * 4) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const compressed = zlib.deflateSync(raw);

const png = Buffer.concat([
  sig,
  chunk("IHDR", ihdr),
  chunk("IDAT", compressed),
  chunk("IEND", Buffer.alloc(0)),
]);

// Tạo ICO (chỉ chứa 1 entry, PNG-format)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type = ICO
icoHeader.writeUInt16LE(1, 4); // 1 icon

const icoEntry = Buffer.alloc(16);
icoEntry[0] = SIZE === 256 ? 0 : SIZE; // 0 = 256
icoEntry[1] = SIZE === 256 ? 0 : SIZE;
icoEntry[2] = 0; // colors
icoEntry[3] = 0; // reserved
icoEntry.writeUInt16LE(1, 4); // planes
icoEntry.writeUInt16LE(32, 6); // bit depth
icoEntry.writeUInt32LE(png.length, 8); // size
icoEntry.writeUInt32LE(6 + 16, 12); // offset

const ico = Buffer.concat([icoHeader, icoEntry, png]);

const out = path.resolve("assets/icon.ico");
fs.writeFileSync(out, ico);
console.log(`Wrote ${out} (${ico.length} bytes)`);