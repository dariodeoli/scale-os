/**
 * Tailwind del sistema v2 de Scale OS (decisión 22-09-2026, campaña #41).
 *
 * Base: preset de `owncoding-ui` (paleta por tokens `--c-*`, ver app/tailwind.css).
 * - `content` incluye la app, el bundle de la librería y los fixtures del
 *   harness visual (para que las clases que sólo viven en los fixtures existan
 *   al medir).
 * - `preflight` queda desactivado (decisión documentada en DESIGN-SYSTEM.md): el
 *   reset global rompería las 53 hojas legadas. app/tailwind.css trae la base
 *   mínima que necesitan las utilidades (borde sólido + color heredable).
 * - El tema oscuro de Scale OS es `html[data-theme="dark"]` (script del layout);
 *   con `darkMode: ['selector', ...]` los `dark:` del preset siguen ese contrato
 *   sin depender de la clase `dark` y sin tocar el tema legado.
 */
import preset from 'owncoding-ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
const config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './build-tools/visual-harness/*.mjs',
    './build-tools/visual-harness/fixtures/**/*.mjs',
    // El preset ya declara el bundle; se repite para no depender del merge.
    './node_modules/owncoding-ui/dist/**/*.js',
  ],
  darkMode: ['selector', 'html[data-theme="dark"]'],
  corePlugins: {preflight: false},
  theme: {
    extend: {
      // La marca conserva sus fuentes: Outfit para texto, DM Mono para códigos
      // y metadatos (globals.css ya las carga self-hosted).
      fontFamily: {
        sans: ['Outfit', 'Arial', 'sans-serif'],
        display: ['Outfit', 'Arial', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
};

export default config;
