"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {Dialog} from './dialog';
import {ViewTabs} from './ui-v2';

// Ficha única de persona (#186 E1): UN solo `Dialog` (drawer) con pestañas.
// «Equipo» la abre sobre una persona (Perfil · Acceso · Remuneración) y «Mi
// perfil» sobre la propia (Perfil · Acceso · Mis datos). Los dos modos comparten
// este carcasa; cada pantalla aporta el contenido de sus pestañas.
export type SheetMode='team'|'self';
export type SheetTabId='perfil'|'acceso'|'remuneracion'|'datos';
export type SheetTab={id:SheetTabId;label:string;content:ReactNode};

const MODE_TABS:Record<SheetMode,readonly SheetTabId[]>={
 team:['perfil','acceso','remuneracion'],
 self:['perfil','acceso','datos'],
};

/**
 * Pestañas que realmente existen. La remuneración (`salary.view`) no se
 * monta ni se lista sin el permiso (#186 E2): el contenido ni siquiera se
 * evalúa, así que ningún monto llega al DOM de otros roles.
 */
export function sheetTabs(mode:SheetMode,salaryView:boolean,tabs:SheetTab[]){
 return tabs.filter(tab=>MODE_TABS[mode].includes(tab.id)&&(tab.id!=='remuneracion'||(mode==='team'&&salaryView)));
}

export function PersonSheet({mode,title,close,busy=false,salaryView=false,tabs,initialTab='perfil'}:{mode:SheetMode;title:string;close:()=>void;busy?:boolean;salaryView?:boolean;tabs:SheetTab[];initialTab?:SheetTabId}){
 const available=sheetTabs(mode,salaryView,tabs);
 const [active,setActive]=useState<SheetTabId>(initialTab);
 const current=available.find(tab=>tab.id===active)?available.find(tab=>tab.id===active)!:available[0];
 // Una pestaña ya visitada queda montada (oculta) para no perder lo tipeado al cambiar.
 const [visited,setVisited]=useState<SheetTabId[]>([current?.id||'perfil']);
 useEffect(()=>{setActive(initialTab);},[initialTab]);
 useEffect(()=>{if(current&&!visited.includes(current.id))setVisited(list=>[...list,current.id]);},[current,visited]);
 return <Dialog title={title} close={close} busy={busy} size="drawer">
  <div className="person-sheet grid min-w-0 gap-4" data-person-sheet={mode}>
   {available.length>1?<ViewTabs ariaLabel="Secciones de la ficha" label="secciones" value={current?.id||'perfil'} onChange={value=>setActive(value as SheetTabId)} options={available.map(tab=>[tab.id,tab.label] as const)}/>:null}
   {available.map(tab=>tab.id===current?.id||visited.includes(tab.id)?<div key={tab.id} role="group" aria-label={tab.label} data-sheet-tab={tab.id} hidden={tab.id!==current?.id} className="grid min-w-0 gap-4">{tab.content}</div>:null)}
  </div>
 </Dialog>;
}
