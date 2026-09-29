import 'owncoding-ui/styles.css';
import './globals.css';
import './qa-fixes.css';
import './mobile-forms.css';
import './ui-system.css';
import './contrast.css';
import './tailwind.css';
import {NotificationCenter} from './notification-center';
import {scaleMetadata,viewport} from './brand-metadata';

export const metadata=scaleMetadata;
export {viewport};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="es"><head><script dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem('scale-theme');if(t==='dark'||t==='contrast')document.documentElement.dataset.theme=t;else if(!t&&window.matchMedia&&window.matchMedia('(prefers-contrast: more)').matches)document.documentElement.dataset.theme='contrast';}catch(e){}`}}/>
  {/* Fuentes críticas del marco (issue #76): Outfit latin (variable 400–700,
      la del load page y el shell) y DM Mono 400 latin (caption del riel).
      El preload arranca la descarga junto con el CSS y, con
      `font-display: optional` en fonts.css, no hay swap tardío. */}
  <link rel="preload" href="/fonts/s/outfit/v15/QGYvz_MVcBeNP4NJtEtqUYLknw.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
  <link rel="preload" href="/fonts/s/dmmono/v16/aFTU7PB1QTsUX8KYthqQBK6PYK0.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>
 </head><body>{children}<NotificationCenter/></body></html>; }
