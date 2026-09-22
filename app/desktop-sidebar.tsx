"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import './desktop-sidebar.css';

export function DesktopSidebar({children}:{children:ReactNode}){
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{try{setCollapsed(localStorage.getItem('scale:sidebar-collapsed')==='true');}catch{/* Storage is optional. */}},[]);
 function toggle(){const next=!collapsed;setCollapsed(next);try{localStorage.setItem('scale:sidebar-collapsed',String(next));}catch{/* Keep the current page functional. */}}
 return <aside className={`${collapsed?'desktop-sidebar is-collapsed':'desktop-sidebar'} flex flex-col`}>
  <button type="button" className="sidebar-collapse" aria-label={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} title={collapsed?'Expandir barra lateral':'Colapsar barra lateral'} aria-expanded={!collapsed} onClick={toggle}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button>
  {children}
 </aside>;
}
