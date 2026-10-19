'use client';
// Patrón único de barras de pestañas desplazables (#137): el carril conserva UNA
// fila y scrollea en horizontal; cuando hay pestañas fuera de vista aparecen los
// chevrones (con target de 44 px en móvil), así ninguna queda cortada sin salida.
// La semántica la aporta el hijo (nav de apartados, `SegmentedField`, `Subtabs`).
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {IconButton as ScaleIconButton} from "./ui/button";


type ScrollWindow={scrollable:boolean;atStart:boolean;atEnd:boolean};

export function TabScroller({children,className,label='pestañas'}:{children:ReactNode;className?:string;label?:string}){
 const track=useRef<HTMLDivElement>(null);
 const [bar,setBar]=useState<ScrollWindow>({scrollable:false,atStart:true,atEnd:true});
 const measure=useCallback(()=>{
  const node=track.current;if(!node)return;
  setBar({
   scrollable:node.scrollWidth>node.clientWidth+1,
   atStart:node.scrollLeft<=1,
   atEnd:node.scrollLeft+node.clientWidth>=node.scrollWidth-1,
  });
 },[]);
 // Keyboard focus must move only this track, immediately, even when its CSS
 // or an earlier arrow click requests smooth scrolling. Never scroll the page.
 const revealFocus=useCallback(()=>{
  const node=track.current;
  if(!node||typeof document==='undefined')return;
  const focused=document.activeElement;
  if(!(focused instanceof HTMLElement)||!node.contains(focused))return;
  const viewport=node.getBoundingClientRect(),item=focused.getBoundingClientRect();
  const start=viewport.left+node.clientLeft,end=start+node.clientWidth;
  const inset=item.width+8<=node.clientWidth?4:0;
  const delta=item.left<start+inset?item.left-start-inset:item.right>end-inset?item.right-end+inset:0;
  if(delta)node.scrollTo({left:Math.max(0,Math.min(node.scrollWidth-node.clientWidth,node.scrollLeft+delta)),behavior:'instant'});
 },[]);
 useEffect(()=>{
  const node=track.current;if(!node)return;
  const refresh=()=>{revealFocus();measure();};
  refresh();
  node.addEventListener('scroll',measure,{passive:true});
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(refresh):null;
  resize?.observe(node);
  const mutation=typeof MutationObserver!=='undefined'?new MutationObserver(refresh):null;
  mutation?.observe(node,{childList:true,subtree:true,characterData:true});
  node.addEventListener('focusin',refresh);
  window.addEventListener('resize',refresh);
  return()=>{node.removeEventListener('scroll',measure);resize?.disconnect();mutation?.disconnect();node.removeEventListener('focusin',refresh);window.removeEventListener('resize',refresh);};
 },[measure,revealFocus]);
 const step=(direction:-1|1)=>{
  const node=track.current;if(!node)return;
  const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  node.scrollBy({left:direction*Math.max(160,node.clientWidth*0.8),behavior:reduce?'auto':'smooth'});
 };
 return <div className={`tab-scroller ${className??''}`}>
  {bar.scrollable?<ScaleIconButton type="button" className="tab-scroller-button prev" title={`Ver ${label} anteriores`} label={`Ver ${label} anteriores`} disabled={bar.atStart} onClick={()=>step(-1)} icon={<><ChevronLeft size={16} aria-hidden="true"/></>} variant="outline" size="compact"></ScaleIconButton>:null}
  <div className="tab-scroller-track" ref={track}>{children}</div>
  {bar.scrollable?<ScaleIconButton type="button" className="tab-scroller-button next" title={`Ver ${label} siguientes`} label={`Ver ${label} siguientes`} disabled={bar.atEnd} onClick={()=>step(1)} icon={<><ChevronRight size={16} aria-hidden="true"/></>} variant="outline" size="compact"></ScaleIconButton>:null}
 </div>;
}
