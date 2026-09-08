"use client";
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {CheckCircle2,AlertCircle,X} from 'lucide-react';
import {feedbackEvent,Feedback} from './feedback';
type Item=Feedback&{id:number};
function Toast({item,close}:{item:Item;close:()=>void}){
 const [paused,setPaused]=useState(false);
 useEffect(()=>{if(paused)return;const timer=window.setTimeout(close,item.tone==='success'?6500:12000);return()=>window.clearTimeout(timer);},[paused,close,item.tone]);
 return <div className={`feedback-toast feedback-${item.tone}`} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
 {item.tone==='success'?<CheckCircle2 aria-hidden="true" size={21}/>:<AlertCircle aria-hidden="true" size={21}/>}<p>{item.message}</p><button type="button" onClick={close} aria-label="Cerrar notificación"><X size={18}/></button></div>;
}
export function NotificationCenter(){
 const [items,setItems]=useState<Item[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{let nextId=0;setReady(true);const receive=(event:Event)=>{const value=(event as CustomEvent<Feedback>).detail;if(!value?.message)return;const item={...value,id:++nextId};setItems(current=>[...current.filter(x=>x.message!==item.message),item].slice(-4));};window.addEventListener(feedbackEvent,receive);return()=>window.removeEventListener(feedbackEvent,receive);},[]);
 if(!ready)return null;
 return createPortal(<div className="feedback-stack" role="status" aria-live="polite" aria-relevant="additions" aria-label="Notificaciones de guardado">{items.map(item=><Toast key={item.id} item={item} close={()=>setItems(current=>current.filter(x=>x.id!==item.id))}/>)}</div>,document.body);
}
