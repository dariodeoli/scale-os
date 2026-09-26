"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';

// Geometría compartida del riel y del drawer móvil: una sola constante para
// que los enlaces y el botón de cerrar sesión midan y pesen igual (selección
// sin cambiar métricas). El ancho del riel y el corrimiento del contenido
// viven en `scale-workspace.tsx`; acá la pieza del riel. El subrayado es
// explícito (`no-underline`): sin preflight el navegador subraya todo `<a>`
// (`a:-webkit-any-link`) en reposo, hover y activo, y el nav no se subraya en
// ninguna superficie.
export const RAIL_ITEM='flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none no-underline transition hover:no-underline focus-visible:no-underline';

// El fondo y los textos del riel viven en `app/tailwind.css` (§Riel): una sola
// fuente con la especificidad correcta, para que una regla global vieja no
// pueda dejar el riel blanco sobre blanco.
// El corte móvil/escritorio del marco es `md` (768 px): debajo manda el drawer
// (`max-md:` en el topbar y el trigger) y desde 768 vive el riel. Antes el riel
// nacía en 761 px y el trigger moría en 768: entre 761 y 767 se veían riel y
// drawer a la vez (issue #61).
// Colapsado (60 px): el contenido queda en 44 px (`p-2`) para que el botón de
// colapsar, los ítems, la marca y el avatar entren enteros y centrados, sin
// recortes ni desbordes, con tooltips y `aria-label` que nombran el ítem.
const COLLAPSED='is-collapsed p-2 md:!w-[60px] [&_.workspace-wordmark]:hidden [&_.nav-caption]:hidden [&_.nav-label]:hidden [&_.person-container-details]:hidden [&_.mobile-sidebar-brand]:justify-center [&_.sidebar-brand]:justify-center [&_.sidebar-brand]:!px-0 [&_nav>a]:h-11 [&_nav>a]:w-11 [&_nav>a]:justify-center [&_nav>a]:!px-0 [&_nav>button]:h-11 [&_nav>button]:w-11 [&_nav>button]:justify-center [&_nav>button]:!px-0 [&_.profile-footer]:justify-items-center [&_.user]:!m-0 [&_.user]:!border-0 [&_.user]:!p-0 [&_.user]:justify-center [&_.user_.person-container]:justify-center';

export function DesktopSidebar({children}:{children:ReactNode}){
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{try{setCollapsed(localStorage.getItem('scale:sidebar-collapsed')==='true');}catch{/* Storage is optional. */}},[]);
 function toggle(){const next=!collapsed;setCollapsed(next);try{localStorage.setItem('scale:sidebar-collapsed',String(next));}catch{/* Keep the current page functional. */}}
 return <aside className={`desktop-sidebar hidden shrink-0 flex-col overflow-hidden border-r border-white/10 text-white/80 [&_.sidebar-brand]:flex [&_.sidebar-brand]:items-center [&_.sidebar-brand]:!px-3 [&_.sidebar-brand]:!pb-2 md:sticky md:top-0 md:flex md:h-dvh md:transition-[width] md:duration-200 md:ease-out motion-reduce:!transition-none ${collapsed?COLLAPSED:'p-3 md:!w-48'}`}>
  <div className={`flex shrink-0 pb-1 ${collapsed?'justify-center':'justify-end'}`}>
   <button type="button" className="sidebar-collapse grid h-11 w-11 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white" aria-label={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} title={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} aria-expanded={!collapsed} onClick={toggle}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
  </div>
  {children}
 </aside>;
}
