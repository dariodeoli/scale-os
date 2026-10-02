'use client';
// Patrón único de barras de pestañas desplazables (#137): el carril conserva UNA
// fila y scrollea en horizontal; cuando hay pestañas fuera de vista aparecen los
// chevrones (con target de 44 px en móvil), así ninguna queda cortada sin salida.
// La semántica la aporta el hijo (nav de apartados, `SegmentedField`, `Subtabs`).
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

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
 useEffect(()=>{
  const node=track.current;if(!node)return;
  measure();
  node.addEventListener('scroll',measure,{passive:true});
  const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  resize?.observe(node);
  const mutation=typeof MutationObserver!=='undefined'?new MutationObserver(measure):null;
  mutation?.observe(node,{childList:true,subtree:true,characterData:true});
  window.addEventListener('resize',measure);
  return()=>{node.removeEventListener('scroll',measure);resize?.disconnect();mutation?.disconnect();window.removeEventListener('resize',measure);};
 },[measure]);
 const step=(direction:-1|1)=>{
  const node=track.current;if(!node)return;
  const reduce=typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  node.scrollBy({left:direction*Math.max(160,node.clientWidth*0.8),behavior:reduce?'auto':'smooth'});
 };
 return <div className={`tab-scroller ${className??''}`}>
  {bar.scrollable?<button type="button" className="tab-scroller-button prev" title={`Ver ${label} anteriores`} aria-label={`Ver ${label} anteriores`} disabled={bar.atStart} onClick={()=>step(-1)}><ChevronLeft size={16} aria-hidden="true"/></button>:null}
  <div className="tab-scroller-track" ref={track}>{children}</div>
  {bar.scrollable?<button type="button" className="tab-scroller-button next" title={`Ver ${label} siguientes`} aria-label={`Ver ${label} siguientes`} disabled={bar.atEnd} onClick={()=>step(1)}><ChevronRight size={16} aria-hidden="true"/></button>:null}
 </div>;
}
