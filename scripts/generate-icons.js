import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const svgBuffer = fs.readFileSync('public/icon.svg');

  // Maskable SVG with safe margin (inner 80%)
  const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E2C98A" />
      <stop offset="50%" stop-color="#C9A55B" />
      <stop offset="100%" stop-color="#9A7B38" />
    </linearGradient>
  </defs>
  <!-- Full edge-to-edge background for maskable safe zone -->
  <rect width="512" height="512" fill="#1C1917" />
  
  <g transform="translate(51.2, 51.2) scale(0.8)">
    <!-- Outer Luxury Ring -->
    <circle cx="256" cy="256" r="210" fill="none" stroke="url(#goldGrad)" stroke-width="6" opacity="0.4" />
    
    <!-- Lotus Petals / Wellness Motif -->
    <path d="M256 100 C 220 160, 180 200, 180 260 C 180 310, 214 350, 256 390 C 298 350, 332 310, 332 260 C 332 200, 292 160, 256 100 Z" fill="url(#goldGrad)" opacity="0.2" />
    
    <!-- Monogram Letter E -->
    <g transform="translate(176, 146)">
      <path d="M40 20 H130 M40 20 V200 H130 M40 110 H110" fill="none" stroke="url(#goldGrad)" stroke-width="28" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
</svg>
`;

  // Badge SVG (monochrome / simple gold for Android status bar)
  const badgeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72" width="72" height="72">
  <rect width="72" height="72" rx="16" fill="#1C1917" />
  <g transform="translate(16, 14) scale(0.24)">
    <path d="M40 20 H130 M40 20 V200 H130 M40 110 H110" fill="none" stroke="#C9A55B" stroke-width="32" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>
`;

  // Ensure public/icons directory exists
  if (!fs.existsSync('public/icons')) {
    fs.mkdirSync('public/icons', { recursive: true });
  }

  // 1. 192x192
  const buf192 = await sharp(svgBuffer).resize(192, 192).png().toBuffer();
  fs.writeFileSync('public/icons/icon-192.png', buf192);
  fs.writeFileSync('public/pwa-192x192.png', buf192);

  // 2. 512x512
  const buf512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer();
  fs.writeFileSync('public/icons/icon-512.png', buf512);
  fs.writeFileSync('public/pwa-512x512.png', buf512);

  // 3. Maskable 512x512
  const bufMaskable = await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toBuffer();
  fs.writeFileSync('public/icons/maskable-512.png', bufMaskable);
  fs.writeFileSync('public/pwa-maskable-512x512.png', bufMaskable);

  // 4. Apple Touch Icon 180x180
  const bufApple = await sharp(svgBuffer).resize(180, 180).png().toBuffer();
  fs.writeFileSync('public/apple-touch-icon.png', bufApple);
  fs.writeFileSync('public/icons/apple-touch-icon.png', bufApple);

  // 5. Badge 72x72
  const bufBadge = await sharp(Buffer.from(badgeSvg)).resize(72, 72).png().toBuffer();
  fs.writeFileSync('public/icons/badge-72.png', bufBadge);

  // 6. Favicon 32x32 and 48x48
  const bufFavicon = await sharp(svgBuffer).resize(48, 48).png().toBuffer();
  fs.writeFileSync('public/favicon.ico', bufFavicon);

  console.log('All PWA icons generated successfully with exact dimensions!');
}

generateIcons().catch(console.error);
