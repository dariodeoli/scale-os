/*
 * Genera `public/brand/share.png` (1200×630) para og:image/twitter:image y el
 * JSON-LD de la landing (issue #158). Reproducible: `node build-tools/make-share-image.mjs`.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const sharp=require('sharp');
const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'..');
const icon=readFileSync(resolve(repo,'public/brand/icon-512.png')).toString('base64');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
 <defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
   <stop offset="0" stop-color="#2b0433"/><stop offset="1" stop-color="#4d065b"/>
  </linearGradient>
 </defs>
 <rect width="1200" height="630" fill="url(#bg)"/>
 <circle cx="1060" cy="110" r="200" fill="#ffffff" opacity="0.05"/>
 <circle cx="140" cy="580" r="240" fill="#ffffff" opacity="0.04"/>
 <image x="96" y="88" width="132" height="132" href="data:image/png;base64,${icon}"/>
 <text x="96" y="330" font-family="Helvetica, Arial, sans-serif" font-size="78" font-weight="bold" fill="#ffffff">Scale OS</text>
 <text x="96" y="396" font-family="Helvetica, Arial, sans-serif" font-size="34" fill="#eed9f4">Tu agencia crea. Scale OS ordena.</text>
 <text x="96" y="470" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#cfabe0">Producción · Portal del cliente · Ventas · Equipo · Inventario · Finanzas</text>
 <text x="96" y="566" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#ffffff" opacity="0.78">sistema.scaleparaguay.com · 30 días gratis</text>
</svg>`;
const png=await sharp(Buffer.from(svg)).png({compressionLevel:9}).toBuffer();
writeFileSync(resolve(repo,'public/brand/share.png'),png);
const meta=await sharp(png).metadata();
console.log(`share.png ${meta.width}x${meta.height} ${(png.length/1024).toFixed(1)} KB`);
