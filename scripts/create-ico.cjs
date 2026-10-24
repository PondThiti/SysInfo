const fs = require('fs');

const pngBuffer = fs.readFileSync('build/icon_256.png');

// Create ICO with 1 image (256x256 PNG)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type 1 = ICO
header.writeUInt16LE(1, 4); // 1 Image

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(0, 0); // Width: 0 = 256
dirEntry.writeUInt8(0, 1); // Height: 0 = 256
dirEntry.writeUInt8(0, 2); // Color count: 0 = >= 8bpp
dirEntry.writeUInt8(0, 3); // Reserved
dirEntry.writeUInt16LE(1, 4); // Color planes
dirEntry.writeUInt16LE(32, 6); // Bits per pixel
dirEntry.writeUInt32LE(pngBuffer.length, 8); // Image size
dirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

const icoBuffer = Buffer.concat([header, dirEntry, pngBuffer]);

fs.writeFileSync('build/icon.ico', icoBuffer);
fs.writeFileSync('public/icon.ico', icoBuffer);
fs.writeFileSync('electron/assets/icon.ico', icoBuffer);
console.log('Successfully wrote 256x256 ICO. Total bytes:', icoBuffer.length);
