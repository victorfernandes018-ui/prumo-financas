// Gera os ícones PNG do app (PWA, iPhone, Android) a partir do logo em SVG.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";

// Fundo cheio (sem cantos arredondados nem transparência): iOS e Android aplicam a própria máscara.
// `scale` controla o tamanho do símbolo; maskable precisa caber na "zona segura" (80% central).
const svg = (scale) => {
  const s = 32 * scale;
  const o = (32 - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop stop-color="#7c7ff5"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs>
  <rect width="32" height="32" fill="url(#g)"/>
  <g transform="translate(${o} ${o}) scale(${scale})">
    <path d="M8 20.5 13 15.5l4 3.5 7-8" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="24" cy="11" r="2.2" fill="#fff"/>
  </g></svg>`;
};

const targets = [
  { file: "public/icons/icon-192.png", size: 192, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, scale: 1 },
  { file: "public/icons/maskable-512.png", size: 512, scale: 0.72 },
  { file: "public/icons/apple-touch-icon.png", size: 180, scale: 0.9 },
  { file: "public/icons/badge-96.png", size: 96, scale: 1 },
];

for (const t of targets) {
  await sharp(Buffer.from(svg(t.scale)), { density: 1024 }).resize(t.size, t.size).png().toFile(t.file);
  console.log("✓", t.file);
}
