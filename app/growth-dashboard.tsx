"use client";
import {useState} from 'react';
import {Eye,Smartphone,MessageCircle,TrendingUp} from 'lucide-react';
import './growth-dashboard.css';
export type GrowthEvent={name:string;event_date:string;count:number};
export function growthSeries(events:GrowthEvent[],days:number,today=new Date()){
 const end=new Date(today.getFullYear(),today.getMonth(),today.getDate());
 const key=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
 const currentStart=new Date(end);currentStart.setDate(end.getDate()-days+1);
 const previousStart=new Date(currentStart);previousStart.setDate(currentStart.getDate()-days);
 const sum=(name:string,previous=false)=>events.filter(e=>e.name===name&&e.event_date>=(previous?key(previousStart):key(currentStart))&&e.event_date<(previous?key(currentStart):key(new Date(end.getFullYear(),end.getMonth(),end.getDate()+1)))).reduce((n,e)=>n+e.count,0);
 const points=Array.from({length:days},(_,i)=>{const date=new Date(currentStart);date.setDate(date.getDate()+i);const day=key(date);return{day,count:events.filter(e=>e.event_date===day&&e.name==='page_view').reduce((n,e)=>n+e.count,0)};});
 return{sum,points};
}
export function GrowthDashboard({events}:{events:GrowthEvent[]}){
 const [days,setDays]=useState(30),{sum,points}=growthSeries(events,days),max=Math.max(1,...points.map(p=>p.count));
 return <section className="panel ops-stack growth-dashboard"><div className="panel-heading"><div><p className="eyebrow">CAPTACIÓN DIGITAL</p><h2>Visitas y crecimiento</h2></div><label>Período <select value={days} onChange={e=>setDays(Number(e.target.value))}><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option></select></label></div>
 <div className="growth-cards">{([{name:'page_view',label:'Páginas vistas',Icon:Eye},{name:'mobile_view',label:'Vistas desde móvil',Icon:Smartphone},{name:'whatsapp_click',label:'Clics en WhatsApp',Icon:MessageCircle}]).map(({name,label,Icon})=>{const value=sum(name),previous=sum(name,true),change=previous?((value-previous)/previous*100):null;return <article key={name}><p><Icon size={20}/>{label}</p><strong>{value.toLocaleString('es-PY')}</strong><small><TrendingUp size={14}/>{change===null?'Sin base anterior':`${change>0?'+':''}${change.toFixed(1)}% vs. período anterior`}</small></article>;})}</div>
 <div><h3>Evolución diaria · páginas vistas</h3><div className="growth-chart" role="img" aria-label={`Páginas vistas durante ${days} días. ${sum('page_view')} en total.`}>{points.map(p=><div key={p.day} style={{height:Math.max(1,p.count/max*100)+'%'}} title={`${p.day}: ${p.count} vistas`}/>)}</div><div className="growth-axis"><span>{points[0]?.day}</span><span>{points.at(-1)?.day}</span></div></div>
 <p className="form-note">Son eventos registrados, no personas únicas ni usuarios conectados. Las vistas móviles no se suman al total de páginas. Las comprobaciones de despliegue quedan excluidas.</p>
 <details><summary>Ver datos diarios</summary><div className="growth-table"><table><thead><tr><th>Fecha</th><th>Páginas vistas</th></tr></thead><tbody>{points.map(p=><tr key={p.day}><td>{p.day}</td><td>{p.count}</td></tr>)}</tbody></table></div></details></section>;
}
