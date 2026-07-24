const fs = require('fs');
const path = require('path');
// Since 'image-size' or 'sharp' might be available in node_modules, let's try reading the PNG IHDR chunk directly to get dimensions!

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // PNG signature is 8 bytes, followed by IHDR chunk
  // IHDR chunk data starts at offset 16
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

const files = [
  'custom_logo.png',
  'custom_logo_square.png',
  'popli_logo.png',
  'brand_logo.png',
  'logo-glow.png',
  'logo.png'
];

for (const f of files) {
  try {
    const p = path.join(__dirname, 'assets/images', f);
    const dims = getPngDimensions(p);
    console.log(`${f}: ${dims.width}x${dims.height}`);
  } catch (e) {
    console.log(`${f}: ERROR - ${e.message}`);
  }
}
