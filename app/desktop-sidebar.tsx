"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';

// Geometría compartida del riel y del drawer móvil: una sola constante para
// que los enlaces y el botón de cerrar sesión midan y pesen igual (selección
// sin cambiar métricas). El ancho del riel y el corrimiento del contenido
// viven en `scale-workspace.tsx`; acá la pieza del riel.
export const RAIL_ITEM='flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none transition';

// El fondo y los textos del riel viven en `app/tailwind.css` (§Riel): una sola
// fuente con la especificidad correcta, para que una regla global vieja no
// pueda dejar el riel blanco sobre blanco.
export function DesktopSidebar({children}:{children:ReactNode}){
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{try{setCollapsed(localStorage.getItem('scale:sidebar-collapsed')==='true');}catch{/* Storage is optional. */}},[]);
 function toggle(){const next=!collapsed;setCollapsed(next);try{localStorage.setItem('scale:sidebar-collapsed',String(next));}catch{/* Keep the current page functional. */}}
 return <aside className={`desktop-sidebar hidden shrink-0 flex-col border-r border-white/10 p-3 text-white/80 [&_.sidebar-brand]:flex [&_.sidebar-brand]:items-center [&_.sidebar-brand]:!px-3 [&_.sidebar-brand]:!pb-2 min-[761px]:sticky min-[761px]:top-0 min-[761px]:flex min-[761px]:h-dvh ${collapsed?'is-collapsed min-[761px]:!w-[60px] [&_.workspace-wordmark]:hidden [&_.nav-caption]:hidden [&_.nav-label]:hidden [&_.person-container-details]:hidden [&_.sidebar-brand]:justify-center [&_.sidebar-brand]:!px-0 [&_nav>a]:justify-center [&_nav>a]:!px-0 [&_nav>button]:justify-center [&_nav>button]:!px-0':'min-[761px]:!w-48'}`}>
  <div className={`flex pb-1 ${collapsed?'justify-center':'justify-end'}`}>
   <button type="button" className="sidebar-collapse grid h-11 w-11 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white" aria-label={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} title={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} aria-expanded={!collapsed} onClick={toggle}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
  </div>
  {children}
 </aside>;
}
