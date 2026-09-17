"use client";
import {useEffect,useState} from 'react';
import {api,Dialog} from './operations';
import {ActorIdentity} from './actor-identity';
import {Trash2} from 'lucide-react';

const roles:Record<string,string[]>={
 members:['owner','admin','management'],
 clients:['owner','admin','management','sales','collaborator'],
 projects:['owner','admin','management','production','collaborator'],
 'work-orders':['owner','admin','management','production'],
 leads:['owner','admin','management','finance','sales'],
 plans:['owner','admin','management','finance','sales','production','collaborator'],
 budgets:['owner','admin','management','finance','sales','production','collaborator'],
 inventory:['owner','admin','management','production','finance'],
 collaborators:['owner','admin','management'],accounts:['owner','admin','finance'],
};
const labels:Record<string,string>={clients:'Cliente',projects:'Proyecto','work-orders':'Orden',leads:'Oportunidad',plans:'Plan',budgets:'Presupuesto',inventory:'Equipo de inventario',collaborators:'Colaborador',accounts:'Cuenta'};
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación';

export function RemoveRecord({kind,id,name,role,done}:{kind:string;id:string;name:string;role:string;done:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!roles[kind]?.includes(role))return null;
 const access=kind==='members';
 return <><button className="icon-button record-remove" type="button" title={access?'Quitar acceso':'Mover a la papelera'} aria-label={`${access?'Quitar acceso':'Mover a la papelera'}: ${name}`} onClick={()=>{setError('');setOpen(true);}}><Trash2 size={16}/></button>
 {open&&<Dialog title={access?'Quitar acceso o invitación':'Mover a la papelera'} close={()=>{if(!busy)setOpen(false);}}>
  <p><strong>{name}</strong></p>
  <p>{access?'Esta persona dejará de entrar a esta empresa, incluso con Google. Sus sesiones se cerrarán. No se borrarán sus comentarios, pagos ni su acceso a otras empresas. Podés invitarla nuevamente desde Equipo.':'Se quitará de las vistas activas. Podés recuperarlo desde Papelera; los pagos, comprobantes y la auditoría se conservan.'}</p>
  {['clients','projects'].includes(kind)&&<p className="form-note">Sus proyectos u órdenes vinculados también quedarán ocultos mientras este registro esté en la papelera. Restaurarlo volverá a mostrarlos, salvo los eliminados por separado.</p>}
  {kind==='budgets'&&<p className="form-note">El enlace público dejará de funcionar. Restaurar el presupuesto no volverá a publicarlo automáticamente.</p>}
  {kind==='accounts'&&<p className="form-note">Solo se pueden retirar cuentas con saldo cero. Su historial seguirá disponible.</p>}
  {kind==='collaborators'&&<p className="form-note">Esto retira el perfil del colaborador, no su acceso. Para revocar el acceso usá Equipo.</p>}
  {kind==='inventory'&&<p className="form-note">Archivar no equivale a dar de baja un activo: no modifica su valor patrimonial.</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="inline-actions"><button className="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button><button className="secondary danger" disabled={busy} onClick={async()=>{setBusy(true);try{await api(`/api/agency/${kind}/${id}`,{},'DELETE');await done();setOpen(false);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}>{busy?'Procesando…':access?'Confirmar: quitar acceso':'Confirmar: mover a papelera'}</button></div>
 </Dialog>}</>;
}

type Removed={kind:string;id:string;name:string;removed_at:string;actor_name?:string;actor_photo_url?:string;actor_verified?:boolean};
export function TrashWorkspace({refresh}:{refresh:()=>Promise<void>}){
 const [records,setRecords]=useState<Removed[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 async function load(){setRecords((await api<{records:Removed[]}>('/api/agency/trash')).records);}
 useEffect(()=>{void load().catch(e=>setError(errorMessage(e))).finally(()=>setLoading(false));},[]);
 return <section className="panel settings-card" aria-labelledby="trash-workspace-title"><div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Trash2 size={18}/></span><div><h2 id="trash-workspace-title">Papelera de esta empresa</h2><p>Solo ves registros que tu permiso permite recuperar. No se borran de forma definitiva. Los accesos retirados se devuelven con una nueva invitación desde Equipo.</p></div></div>
 {error&&<p className="error" role="alert">{error}</p>}{loading?<p>Cargando…</p>:!records.length?<p className="trash-empty">No hay registros en la papelera.</p>:<ul className="trash-list">{records.map(r=><li className="trash-row" key={`${r.kind}-${r.id}`}><span className="trash-kind">{labels[r.kind]}</span><div className="trash-info"><b>{r.name}</b><small>Movido a Papelera por <ActorIdentity name={r.actor_name} photoUrl={r.actor_photo_url} verified={r.actor_verified===true} timestamp={r.removed_at}/></small></div><button className="secondary trash-restore" disabled={Boolean(busy)} onClick={async()=>{setBusy(`${r.kind}-${r.id}`);setError('');try{await api(`/api/agency/${r.kind}/${r.id}/restore`,{});await Promise.all([load(),refresh()]);}catch(e){setError(errorMessage(e));}finally{setBusy('');}}}>{busy===`${r.kind}-${r.id}`?'Restaurando…':'Restaurar'}</button></li>)}</ul>}
 </section>;
}
