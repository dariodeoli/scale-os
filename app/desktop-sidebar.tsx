"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';

// Geometría compartida del riel y del drawer móvil: una sola constante para
// que los enlaces y el botón de cerrar sesión midan y pesen igual (selección
// sin cambiar métricas). El ancho del riel y el corrimiento del contenido
// viven en `scale-workspace.tsx`; acá sólo la pieza del riel.
export const RAIL_ITEM='flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none transition';

export function DesktopSidebar({children}:{children:ReactNode}){
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{try{setCollapsed(localStorage.getItem('scale:sidebar-collapsed')==='true');}catch{/* Storage is optional. */}},[]);
 function toggle(){const next=!collapsed;setCollapsed(next);try{localStorage.setItem('scale:sidebar-collapsed',String(next));}catch{/* Keep the current page functional. */}}
 return <aside className={`desktop-sidebar hidden shrink-0 flex-col border-r border-ink-600 bg-ink-800 min-[761px]:sticky min-[761px]:top-0 min-[761px]:flex min-[761px]:h-dvh ${collapsed?'is-collapsed min-[761px]:!w-[60px] [&_.workspace-wordmark]:hidden [&_.nav-caption]:hidden [&_.nav-label]:hidden [&_.person-container-details]:hidden [&_.sidebar-brand]:justify-center [&_.sidebar-brand]:!px-0':'min-[761px]:!w-48'} [&_.sidebar-brand]:flex [&_.sidebar-brand]:items-center [&_.sidebar-brand]:!px-3 [&_.sidebar-brand]:pt-2 [&_.sidebar-brand]:!mb-4`}>
  <div className={`flex p-2 ${collapsed?'justify-center':'justify-end'}`}>
   <button type="button" className="sidebar-collapse grid h-10 w-10 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-fore" aria-label={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} title={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} aria-expanded={!collapsed} onClick={toggle}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
  </div>
  {children}
 </aside>;
}
