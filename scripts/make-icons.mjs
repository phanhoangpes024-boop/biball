// Generates public/icon-192.png and public/icon-512.png without any native deps:
// solid dark rounded background with a white checkmark, full-bleed (maskable-safe).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // scanlines with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = size / 512; // geometry defined at 512 scale
  const segs = [
    [150, 268, 225, 343],
    [225, 343, 372, 180],
  ];
  const thick = 34 * s;
  const bg = [28, 28, 32]; // #1c1c20
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const d = Math.min(
        ...segs.map(([ax, ay, bx, by]) => distToSegment(x, y, ax * s, ay * s, bx * s, by * s))
      );
      // antialiased white stroke over solid bg
      const a = Math.max(0, Math.min(1, (thick - d) / (1.5 * s + 0.5)));
      rgba[i] = Math.round(bg[0] + (255 - bg[0]) * a);
      rgba[i + 1] = Math.round(bg[1] + (255 - bg[1]) * a);
      rgba[i + 2] = Math.round(bg[2] + (255 - bg[2]) * a);
      rgba[i + 3] = 255;
    }
  }
  return png(size, size, rgba);
}

const out = path.join(process.cwd(), "public");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "icon-192.png"), makeIcon(192));
writeFileSync(path.join(out, "icon-512.png"), makeIcon(512));
console.log("icons written to public/");
