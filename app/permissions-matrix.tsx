"use client";
import {useEffect,useState} from 'react';
import {ChevronDown,ShieldCheck} from 'lucide-react';
import {api,Dialog} from './operations';
import {teamRoleLabels} from './team-directory';
import './permissions-matrix.css';

type MatrixRow={id:string;label:string;description:string;defaults:string[];overrides:Record<string,boolean|undefined>};
type MatrixData={roles:string[];capabilities:MatrixRow[]};
const errorText=(error:unknown)=>error instanceof Error?error.message:'No se pudo guardar el permiso.';
function defaultAllowed(row:MatrixRow,role:string){return row.defaults.includes(role);}
function effective(row:MatrixRow,role:string){const override=row.overrides[role];return override===undefined?defaultAllowed(row,role):override;}

export const roleDescriptions:Record<string,string>={
 owner:'Dueño: acceso total al panel, incluidos permisos, accesos y configuración.',
 admin:'Administrador: gestiona el equipo, las invitaciones y los ajustes de la empresa.',
 management:'Gerencia: dirige clientes, proyectos, producción y la operación comercial.',
 finance:'Finanzas: administra pagos, informes, Equipo y comisiones.',
 sales:'Ventas: atiende clientes, presupuestos y las oportunidades del pipeline.',
 production:'Producción: ejecuta proyectos y órdenes y utiliza Inventario y Estudio.',
 editor:'Editor: consulta y trabaja la producción de piezas.',
 viewer:'Solo lectura: consulta los módulos del panel con acceso reducido.',
 colaborador:'Colaborador: trabaja en clientes, proyectos, producción, presupuestos, pipeline, inventario y estudio, sin ver finanzas, salarios, pagos, accesos ni actividad.',
};

const capabilityGroups:{name:string;keywords:string[]}[]=[
 {name:'Panel',keywords:['panel','resumen','tablero','control','dashboard','summary','actividad','activity','preferencia','preference','métrica','metrica','metric']},
 {name:'Comercial',keywords:['cliente','client','presupuesto','budget','proyecto','project','pipeline','oportunidad','opportunity','lead','venta','sales','comercial','plan']},
 {name:'Producción',keywords:['producción','produccion','production','orden','order','pieza','piece','inventario','inventory','estudio','studio','entrega','taller','work']},
 {name:'Finanzas',keywords:['finanza','finance','pago','payment','cobro','cobranza','mora','collection','factura','invoice','cuenta','account','informe','report','comisión','comision','commission','salario','salary','payout']},
 {name:'Equipo',keywords:['equipo','team','persona','people','member','invitación','invitacion','invite','acceso','access','permiso','permission','miembro','colaborador','collaborator','rol','role']},
 {name:'Configuración',keywords:['configuración','configuracion','config','settings','empresa','company','papelera','trash','ajuste','admin']},
];
function domainFor(row:MatrixRow){const text=(row.id+' '+row.label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return capabilityGroups.find(group=>group.keywords.some(keyword=>text.includes(keyword)))?.name||'Otros';}
function groupedRows(capabilities:MatrixRow[]){const groups=capabilityGroups.map(group=>({name:group.name,rows:capabilities.filter(row=>domainFor(row)===group.name)})).filter(group=>group.rows.length>0);const rest=capabilities.filter(row=>domainFor(row)==='Otros');if(rest.length)groups.push({name:'Otros',rows:rest});return groups;}

function RoleExplorer({data}:{data:MatrixData}){
 return <div className="permissions-explorer">
  {Object.keys(teamRoleLabels).map(roleId=>{
   const granted=data.capabilities.filter(row=>effective(row,roleId));
   const denied=data.capabilities.filter(row=>!effective(row,roleId));
   return <details className="permissions-role-card" key={roleId}>
    <summary>
     <span className="permissions-role-name">{teamRoleLabels[roleId]}</span>
     <span className="permissions-role-description">{roleDescriptions[roleId]||teamRoleLabels[roleId]}</span>
     <span className="permissions-role-count">{granted.length===data.capabilities.length?'Todos los permisos':`${granted.length} de ${data.capabilities.length}`}</span>
     <ChevronDown className="permissions-role-chevron" size={16} aria-hidden="true"/>
    </summary>
    <div className="permissions-role-lists">
     <div>
      <h4>Qué puede hacer</h4>
      {granted.length?<ul>{granted.map(row=><li key={row.id}><b>{row.label}</b><small>{row.description}</small></li>)}</ul>:<p className="form-note">No tiene permisos habilitados.</p>}
     </div>
     <div>
      <h4>Qué no puede</h4>
      {denied.length?<ul>{denied.map(row=><li key={row.id}><b>{row.label}</b><small>{row.description}</small></li>)}</ul>:<p className="form-note">Nada: tiene todos los permisos del panel.</p>}
     </div>
    </div>
   </details>;
  })}
 </div>;
}

function MatrixView({role,explorer}:{role:string;explorer:boolean}){
 const [data,setData]=useState<MatrixData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true);
 const owner=role==='owner';
 async function load(){setLoading(true);setError('');try{setData(await api<MatrixData>('/api/agency/permissions'));}catch(cause){setError(errorText(cause));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function toggle(rowId:string,roleId:string,allowed:boolean){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:rowId,role:roleId,allowed},'PATCH');setData(updated);setNotice('Permiso guardado. Los cambios se aplican desde la próxima acción de esa persona.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 async function resetRow(rowId:string){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:rowId,role:null,allowed:null},'PATCH');setData(updated);setNotice('Permisos restablecidos a los valores por defecto.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 async function resetAll(){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:null,role:null,allowed:null},'PATCH');setData(updated);setNotice('Todos los permisos volvieron a los valores por defecto.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 return <div className="permissions-matrix" aria-busy={loading||busy}>
  <p className="form-note"><ShieldCheck size={16} aria-hidden="true"/> Definí qué puede hacer cada cargo. El Dueño siempre conserva todos los permisos. Los cambios se guardan por empresa y se auditan.</p>
  {error?<p className="error" role="alert">{error} <button type="button" className="text-button" onClick={()=>void load()}>Reintentar</button></p>:null}
  {notice?<p role="status" className="permissions-notice">{notice}</p>:null}
  {loading?<p role="status">Cargando permisos…</p>:!data?null:<>
   {explorer&&<RoleExplorer data={data}/>}
   <div className="permissions-scroll">
    <table>
     <thead><tr><th>Capacidad</th>{data.roles.map(roleId=><th key={roleId}>{teamRoleLabels[roleId]||roleId}</th>)}</tr></thead>
     {groupedRows(data.capabilities).map(group=><tbody key={group.name}>
      <tr className="permissions-domain-row"><th colSpan={data.roles.length+1} scope="colgroup">{group.name}</th></tr>
      {group.rows.map(row=><tr key={row.id}>
       <th scope="row"><b>{row.label}</b><small>{row.description}</small></th>
        {data.roles.map(roleId=>{const checked=effective(row,roleId),isDefault=defaultAllowed(row,roleId);return <td key={roleId}><label className="permissions-check"><input type="checkbox" checked={checked} disabled={!owner||busy} aria-label={`${row.label} · ${teamRoleLabels[roleId]}`} onChange={event=>void toggle(row.id,roleId,event.target.checked)}/><span className={`permissions-state ${checked?'is-allowed':'is-denied'} ${checked===isDefault?'is-default':'is-override'}`} aria-hidden="true">{checked?'✓':'×'}</span></label></td>;})}
      </tr>)}
     </tbody>)}
    </table>
   </div>
   {owner?<div className="inline-actions permissions-reset"><button type="button" className="text-button" disabled={busy} onClick={()=>void resetAll()}>Restablecer todos los permisos por defecto</button></div>:<p className="form-note">Solo el Dueño puede modificar esta matriz.</p>}
  </>}
 </div>;
}

export function PermissionsMatrix({role,close}:{role:string;close:()=>void}){
 return <Dialog title="Permisos del panel" close={close}><MatrixView role={role} explorer={false}/></Dialog>;
}

export function PermissionsMatrixPanel({role}:{role:string}){
 return <div className="ops-stack"><section className="panel" aria-labelledby="roles-permissions-title">
  <div className="panel-heading">
   <div>
    <p className="eyebrow">EQUIPO</p>
    <h2 id="roles-permissions-title">Roles y permisos</h2>
   </div>
  </div>
  <MatrixView role={role} explorer/>
 </section></div>;
}
