'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {portalApi} from '../../client-portal-api';
import {listDateFull} from '../../list-format';
import '../portal.css';
type Delivery={id:number;title:string;summary:string;asset_name:string;version:number;published_at:string;project_name:string;client_name:string;due_date?:string|null;due_time?:string|null};
export default function ClientDeliveries(){
 const [deliveries,setDeliveries]=useState<Delivery[]>([]),[name,setName]=useState(''),[error,setError]=useState('');
 useEffect(()=>{void Promise.all([portalApi<{user:{fullName:string}}>('/me',undefined,'GET'),portalApi<{deliveries:Delivery[]}>('/deliveries',undefined,'GET')]).then(([me,data])=>{setName(me.user.fullName);setDeliveries(data.deliveries);}).catch(e=>{if((e as {status?:number}).status===401)window.location.assign('/cliente/ingresar');else setError(e instanceof Error?e.message:'No se pudieron cargar las entregas');});},[]);
 async function logout(){await portalApi('/auth/logout',{});window.location.assign('/cliente/ingresar');}
 return <main className="client-portal"><section className="client-portal-card"><header><div><p className="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Entregables</h1><p className="portal-muted">{name&&`Hola, ${name}. `}Sólo aparecen piezas publicadas para tu empresa.</p></div><button className="secondary" onClick={()=>void logout()}>Salir</button></header>{error&&<p className="error" role="alert">{error}</p>}<div className="delivery-list">{deliveries.map(delivery=><article className="delivery" key={delivery.id}><div><h2>{delivery.title}</h2><small>{delivery.client_name} · {delivery.project_name} · Versión {delivery.version}{delivery.due_date&&listDateFull(delivery.due_date,delivery.due_time)?<> · Entrega <span className="portal-date">{listDateFull(delivery.due_date,delivery.due_time)}</span></>:null}</small></div>{delivery.summary&&<p>{delivery.summary}</p>}<Link className="button" href={`/cliente/entregas/${delivery.id}`}>Ver entrega</Link></article>)}{!error&&!deliveries.length&&<p className="portal-muted">Todavía no hay entregables publicados para esta cuenta.</p>}</div></section></main>;
}
