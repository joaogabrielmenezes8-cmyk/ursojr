import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { execSync } from 'child_process';

const brandDir = path.resolve('public/brand');
const publicDir = path.resolve('public');

if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

// ----------------------------------------------------------------------
// 1. SYMBOL SVG (BEAR HEAD + LIME GREEN CHECK BADGE)
// ----------------------------------------------------------------------
// ViewBox: 0 0 512 512
// White bear face, black outlines, winking eye, lime-green check shield
export const symbolSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.25"/>
    </filter>
  </defs>

  <g transform="translate(256, 256)">
    <!-- Main Bear Head Path with Ears (Centered at 0,0, radius ~170) -->
    <!-- Left Ear -->
    <path d="
      M -115 -100
      C -150 -165 -65 -215 -35 -145
      C -15 -145 15 -145 35 -145
      C 65 -215 150 -165 115 -100
      C 185 -50 205 70 145 145
      C 100 195 20 205 -35 200
      C -130 195 -195 125 -190 20
      C -185 -55 -155 -90 -115 -100
      Z
    " fill="#FFFFFF" stroke="#000000" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>

    <!-- Left Eye (Solid Black Circle) -->
    <circle cx="-65" cy="-20" r="18" fill="#000000" />

    <!-- Right Eye (Playful Wink: bold angled chevron > ) -->
    <path d="M 50 -28 L 76 -7 L 50 14" fill="none" stroke="#000000" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Cute Snout/Nose -->
    <ellipse cx="0" cy="5" rx="30" ry="22" fill="#000000" />
    <path d="M 0 25 L 0 45" stroke="#000000" stroke-width="14" stroke-linecap="round" />
    <path d="M -16 48 C -8 60 8 60 16 48" fill="none" stroke="#000000" stroke-width="14" stroke-linecap="round" />

    <!-- Lime Green Check Shield (Foreground on lower-right) -->
    <g transform="translate(75, 105) rotate(10)">
      <!-- Shield Body -->
      <path d="
        M -55 -40
        L 45 -40
        C 58 -40 68 -28 65 -15
        L 45 45
        C 40 58 25 65 12 65
        L -40 65
        C -55 65 -65 52 -62 38
        L -52 -25
        C -54 -33 -48 -40 -35 -40
        Z
      " fill="#C7FF3D" stroke="#000000" stroke-width="20" stroke-linejoin="round"/>

      <!-- Inner Bold Checkmark -->
      <path d="M -22 8 L -2 28 L 32 -10" fill="none" stroke="#000000" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
</svg>
`;

// ----------------------------------------------------------------------
// 2. APP ICON SVG (WITH #0F1115 DARK SQUIRCLE BACKGROUND)
// ----------------------------------------------------------------------
export const appIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- Rounded Squircle Dark Canvas -->
  <rect width="512" height="512" rx="115" fill="#0F1115"/>

  <!-- Centered Bear Symbol (scaled nicely with comfortable breathing margin) -->
  <g transform="translate(256, 256) scale(0.86)">
    <!-- Main Bear Head Path with Ears -->
    <path d="
      M -115 -100
      C -150 -165 -65 -215 -35 -145
      C -15 -145 15 -145 35 -145
      C 65 -215 150 -165 115 -100
      C 185 -50 205 70 145 145
      C 100 195 20 205 -35 200
      C -130 195 -195 125 -190 20
      C -185 -55 -155 -90 -115 -100
      Z
    " fill="#FFFFFF"/>

    <!-- Left Eye -->
    <circle cx="-65" cy="-20" r="18" fill="#0F1115" />

    <!-- Right Eye Wink -->
    <path d="M 50 -28 L 76 -7 L 50 14" fill="none" stroke="#0F1115" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Snout/Nose -->
    <ellipse cx="0" cy="5" rx="30" ry="22" fill="#0F1115" />
    <path d="M 0 25 L 0 45" stroke="#0F1115" stroke-width="14" stroke-linecap="round" />
    <path d="M -16 48 C -8 60 8 60 16 48" fill="none" stroke="#0F1115" stroke-width="14" stroke-linecap="round" />

    <!-- Lime Green Check Shield -->
    <g transform="translate(75, 105) rotate(10)">
      <path d="
        M -55 -40
        L 45 -40
        C 58 -40 68 -28 65 -15
        L 45 45
        C 40 58 25 65 12 65
        L -40 65
        C -55 65 -65 52 -62 38
        L -52 -25
        C -54 -33 -48 -40 -35 -40
        Z
      " fill="#C7FF3D" stroke="#0F1115" stroke-width="18" stroke-linejoin="round"/>
      <path d="M -22 8 L -2 28 L 32 -10" fill="none" stroke="#0F1115" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>
</svg>
`;

// ----------------------------------------------------------------------
// 3. HORIZONTAL LOGO SVG (BEAR + URSO JR. + TAGLINE)
// ----------------------------------------------------------------------
// ViewBox: 0 0 1000 340
export const horizontalLogoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 340" width="1000" height="340">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@700;900&amp;display=swap');
      .urso-text {
        font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 900;
        font-size: 158px;
        letter-spacing: -2px;
      }
      .tagline-text {
        font-family: 'Fredoka', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-weight: 700;
        font-size: 44px;
        letter-spacing: 0.5px;
      }
    </style>
  </defs>

  <!-- Left Bear Symbol (scale down & place at left) -->
  <g transform="translate(160, 165) scale(0.68)">
    <path d="
      M -115 -100
      C -150 -165 -65 -215 -35 -145
      C -15 -145 15 -145 35 -145
      C 65 -215 150 -165 115 -100
      C 185 -50 205 70 145 145
      C 100 195 20 205 -35 200
      C -130 195 -195 125 -190 20
      C -185 -55 -155 -90 -115 -100
      Z
    " fill="#FFFFFF" stroke="#000000" stroke-width="24" stroke-linejoin="round" stroke-linecap="round"/>

    <circle cx="-65" cy="-20" r="18" fill="#000000" />
    <path d="M 50 -28 L 76 -7 L 50 14" fill="none" stroke="#000000" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />

    <ellipse cx="0" cy="5" rx="30" ry="22" fill="#000000" />
    <path d="M 0 25 L 0 45" stroke="#000000" stroke-width="14" stroke-linecap="round" />
    <path d="M -16 48 C -8 60 8 60 16 48" fill="none" stroke="#000000" stroke-width="14" stroke-linecap="round" />

    <g transform="translate(75, 105) rotate(10)">
      <path d="
        M -55 -40
        L 45 -40
        C 58 -40 68 -28 65 -15
        L 45 45
        C 40 58 25 65 12 65
        L -40 65
        C -55 65 -65 52 -62 38
        L -52 -25
        C -54 -33 -48 -40 -35 -40
        Z
      " fill="#C7FF3D" stroke="#000000" stroke-width="20" stroke-linejoin="round"/>
      <path d="M -22 8 L -2 28 L 32 -10" fill="none" stroke="#000000" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </g>

  <!-- Right Typography "URSO JR." -->
  <g transform="translate(320, 185)">
    <!-- Black Outline Behind URSO -->
    <text x="0" y="0" class="urso-text" fill="#000000" stroke="#000000" stroke-width="26" stroke-linejoin="round" stroke-linecap="round">URSO</text>
    <!-- White Foreground URSO -->
    <text x="0" y="0" class="urso-text" fill="#FFFFFF">URSO</text>

    <!-- Black Outline Behind JR. -->
    <text x="400" y="0" class="urso-text" fill="#000000" stroke="#000000" stroke-width="26" stroke-linejoin="round" stroke-linecap="round">JR.</text>
    <!-- Lime Green Foreground JR. -->
    <text x="400" y="0" class="urso-text" fill="#C7FF3D">JR.</text>

    <!-- Tagline: "Seu estagiário com IA." -->
    <!-- Black Outline -->
    <text x="5" y="68" class="tagline-text" fill="#000000" stroke="#000000" stroke-width="12" stroke-linejoin="round" stroke-linecap="round">Seu estagiário com IA.</text>
    <!-- White Fill -->
    <text x="5" y="68" class="tagline-text" fill="#FFFFFF">Seu estagiário com IA.</text>
  </g>
</svg>
`;

async function generateAll() {
  console.log('Generating brand assets with sharp...');

  // 1. Write SVGs
  fs.writeFileSync(path.join(brandDir, 'urso-jr-symbol.svg'), symbolSvg.trim());
  fs.writeFileSync(path.join(brandDir, 'urso-jr-app-icon.svg'), appIconSvg.trim());
  fs.writeFileSync(path.join(brandDir, 'urso-jr-logo-horizontal.svg'), horizontalLogoSvg.trim());

  // 2. Render horizontal logo PNG (High-resolution, transparent)
  await sharp(Buffer.from(horizontalLogoSvg))
    .png()
    .toFile(path.join(brandDir, 'urso-jr-logo-horizontal.png'));
  console.log('✓ /public/brand/urso-jr-logo-horizontal.png generated');

  // Also symbol PNG
  await sharp(Buffer.from(symbolSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(brandDir, 'urso-jr-symbol.png'));
  console.log('✓ /public/brand/urso-jr-symbol.png generated');

  // 3. Render App Icons & Favicons (#0F1115 background with centered bear + check)
  const appIconBuffer = Buffer.from(appIconSvg);

  // 512x512 PWA
  await sharp(appIconBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ /public/pwa-512x512.png generated');

  // 192x192 PWA
  await sharp(appIconBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ /public/pwa-192x192.png generated');

  // apple-touch-icon.png (180x180)
  await sharp(appIconBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ /public/apple-touch-icon.png generated');

  // favicon-32x32.png
  await sharp(appIconBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('✓ /public/favicon-32x32.png generated');

  // favicon-16x16.png
  await sharp(appIconBuffer)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('✓ /public/favicon-16x16.png generated');

  // favicon.ico (multi-resolution via convert)
  try {
    execSync(`convert public/favicon-16x16.png public/favicon-32x32.png public/favicon.ico`);
    console.log('✓ /public/favicon.ico generated');
  } catch (err) {
    // fallback copy 32x32 as ico
    fs.copyFileSync(path.join(publicDir, 'favicon-32x32.png'), path.join(publicDir, 'favicon.ico'));
    console.log('✓ /public/favicon.ico created from 32x32');
  }

  console.log('All brand assets successfully generated!');
}

generateAll().catch(console.error);
