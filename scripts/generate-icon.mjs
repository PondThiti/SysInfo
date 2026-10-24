import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height) {
  // RGBA buffer
  const rowSize = width * 4 + 1; // +1 filter byte per scanline
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Circle distance from center (128, 128)
      const dx = x - 128;
      const dy = y - 128;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 118) {
        // Gradient from indigo (#6366f1) to violet/cyan (#8b5cf6 / #06b6d4)
        const t = (x + y) / (width + height);
        const r = Math.round(99 * (1 - t) + 14 * t);
        const g = Math.round(102 * (1 - t) + 165 * t);
        const b = Math.round(241 * (1 - t) + 233 * t);

        // Zap shape in center (simple lightning polygon)
        // If inside zap: white
        const isZap =
          (x >= 110 && x <= 145 && y >= 50 && y <= 120 && (x - 110) * 1.5 > (y - 50)) ||
          (x >= 100 && x <= 150 && y >= 110 && y <= 135) ||
          (x >= 105 && x <= 140 && y >= 125 && y <= 200 && (200 - y) * 1.2 > (x - 105));

        if (isZap) {
          rawData[pixelOffset] = 255;
          rawData[pixelOffset + 1] = 255;
          rawData[pixelOffset + 2] = 255;
          rawData[pixelOffset + 3] = 255;
        } else {
          rawData[pixelOffset] = r;
          rawData[pixelOffset + 1] = g;
          rawData[pixelOffset + 2] = b;
          rawData[pixelOffset + 3] = 255;
        }
      } else {
        // Transparent outside
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  // CRC32
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation for PNG
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) | 0;
}

function createIcoFromPNG(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Icon type
  header.writeUInt16LE(1, 4); // 1 image

  const dirEntry = Buffer.alloc(16);
  dirEntry[0] = 0; // 256 width -> 0
  dirEntry[1] = 0; // 256 height -> 0
  dirEntry[2] = 0; // color count
  dirEntry[3] = 0; // reserved
  dirEntry.writeUInt16LE(1, 4); // planes
  dirEntry.writeUInt16LE(32, 6); // bit count
  dirEntry.writeUInt32LE(pngBuffer.length, 8); // bytes in res
  dirEntry.writeUInt32LE(22, 12); // image offset (6 + 16 = 22)

  return Buffer.concat([header, dirEntry, pngBuffer]);
}

fs.mkdirSync('./build', { recursive: true });
fs.mkdirSync('./public', { recursive: true });

const png = createPNG(256, 256);
const ico = createIcoFromPNG(png);

fs.writeFileSync('./build/icon.png', png);
fs.writeFileSync('./build/icon.ico', ico);
fs.writeFileSync('./public/icon.png', png);
fs.writeFileSync('./public/icon.ico', ico);

console.log('Icons generated successfully: build/icon.ico & build/icon.png');
