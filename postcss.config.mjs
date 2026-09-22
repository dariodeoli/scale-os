/**
 * PostCSS del sistema v2 (Tailwind + owncoding-ui).
 *
 * Next procesa todo el CSS de la app con este pipeline: Tailwind genera las
 * utilidades que usan las pantallas nuevas y autoprefixer mantiene los prefijos
 * del CSS legado. Las 53 hojas existentes no cambian: no llevan `@tailwind` y
 * sus reglas siguen ganando por orden/especificidad donde corresponde.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
