"use client";
import {useState} from 'react';
import {Eye,Smartphone,MessageCircle,TrendingUp} from 'lucide-react';
import {SelectCustom} from './profile-controls';
import {growthSeries,type GrowthEvent,type GrowthMetricName} from './growth-dashboard-data';
import './growth-dashboard.css';
// La lógica de datos vive en ./growth-dashboard-data (funciones puras); se
// reexporta para no romper imports existentes.
export type {GrowthEvent} from './growth-dashboard-data';
export {growthSeries,growthWindow,growthSum,growthVariation,metricSeries} from './growth-dashboard-data';
const metricIcons:Record<GrowthMetricName,typeof Eye>={page_view:Eye,mobile_view:Smartphone,whatsapp_click:MessageCircle};
export function GrowthDashboard({events}:{events:GrowthEvent[]}){
 const [days,setDays]=useState(30),{sum,points,metrics}=growthSeries(events,days),max=Math.max(1,...points.map(p=>p.count));
 return <section className="panel ops-stack growth-dashboard"><div className="panel-heading"><div><p className="eyebrow">CAPTACIÓN DIGITAL</p><h2>Visitas y crecimiento</h2></div><SelectCustom label="Período" choices={[{value:'7',label:'Últimos 7 días'},{value:'30',label:'Últimos 30 días'},{value:'90',label:'Últimos 90 días'}]} value={String(days)} onChange={value=>setDays(Number(value))}/></div>
 <div className="growth-cards">{metrics.map(({name,label,current,variation})=>{const Icon=metricIcons[name];return <article key={name}><p><Icon size={20}/>{label}</p><strong>{current.toLocaleString('es-PY')}</strong><small><TrendingUp size={14}/>{variation===null?'Sin base anterior':`${variation>0?'+':''}${variation.toFixed(1)}% vs. período anterior`}</small></article>;})}</div>
 <div><h3>Evolución diaria · páginas vistas</h3><div className="growth-chart" role="img" aria-label={`Páginas vistas durante ${days} días. ${sum('page_view')} en total.`}>{points.map(p=><div key={p.day} style={{height:Math.max(1,p.count/max*100)+'%'}} title={`${p.day}: ${p.count} vistas`}/>)}</div><div className="growth-axis"><span>{points[0]?.day}</span><span>{points.at(-1)?.day}</span></div></div>
 <p className="form-note">Son eventos registrados, no personas únicas ni usuarios conectados. Las vistas móviles no se suman al total de páginas. Las comprobaciones de despliegue quedan excluidas.</p>
 <details><summary>Ver datos diarios</summary><div className="growth-table"><table><thead><tr><th>Fecha</th><th>Páginas vistas</th></tr></thead><tbody>{points.map(p=><tr key={p.day}><td>{p.day}</td><td>{p.count}</td></tr>)}</tbody></table></div></details></section>;
}
