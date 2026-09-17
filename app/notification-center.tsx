"use client";
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {CheckCircle2,AlertCircle,AlertTriangle} from 'lucide-react';
import {feedbackDuration,feedbackEvent,Feedback} from './feedback';
import './toast.css';
type Item=Feedback&{id:number};
const icons={success:CheckCircle2,error:AlertCircle,warning:AlertTriangle};
function Toast({item,close}:{item:Item;close:()=>void}){
 const Icon=icons[item.tone]||CheckCircle2;
 useEffect(()=>{const timer=window.setTimeout(close,feedbackDuration(item.tone));return()=>window.clearTimeout(timer);},[close,item.tone]);
 return <div className="feedback-toast" data-tone={item.tone}><span className="feedback-toast-icon" aria-hidden="true"><Icon size={17}/></span><p>{item.message}</p></div>;
}
export function NotificationCenter(){
 const [items,setItems]=useState<Item[]>([]),[ready,setReady]=useState(false);
 useEffect(()=>{let nextId=0;setReady(true);const receive=(event:Event)=>{const value=(event as CustomEvent<Feedback>).detail;if(!value?.message)return;const item={...value,id:++nextId};setItems(current=>[...current.filter(x=>x.message!==item.message),item].slice(-3));};window.addEventListener(feedbackEvent,receive);return()=>window.removeEventListener(feedbackEvent,receive);},[]);
 if(!ready)return null;
 return createPortal(<div className="feedback-stack" role="status" aria-live="polite" aria-relevant="additions" aria-label="Notificaciones de guardado">{items.map(item=><Toast key={item.id} item={item} close={()=>setItems(current=>current.filter(x=>x.id!==item.id))}/>)}</div>,document.body);
}
