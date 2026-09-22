"use client";
import {useEffect,useState, type ChangeEvent} from 'react';
import {ChevronDown,ShieldCheck} from 'lucide-react';
import {Switch} from 'owncoding-ui';
import {api,Dialog} from './operations';
import {teamRoleLabels} from './team-directory';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,PageHeader,StateChip} from './ui-v2';

type MatrixRow={id:string;label:string;description:string;defaults:string[];overrides:Record<string,boolean|undefined>};
type MatrixData={roles:string[];capabilities:MatrixRow[]};
const errorText=(error:unknown)=>error instanceof Error?error.message:'No se pudo guardar el permiso.';
function defaultAllowed(row:MatrixRow,role:string){return row.defaults.includes(role);}
function effective(row:MatrixRow,role:string){const override=row.overrides[role];return override===undefined?defaultAllowed(row,role):override;}
function overrideCount(row:MatrixRow){return Object.values(row.overrides).filter(value=>value!==undefined).length;}

export const roleDescriptions:Record<string,string>={
 owner:'Dueño: acceso total al panel, incluidos permisos, accesos y configuración.',
 admin:'Administrador: gestiona el equipo, las invitaciones y los ajustes de la empresa.',
 management:'Gerencia: dirige clientes, proyectos, producción y la operación comercial.',
 finance:'Finanzas: administra pagos, informes, Equipo y comisiones.',
 sales:'Ventas: atiende clientes, presupuestos y las oportunidades del pipeline.',
 production:'Producción: ejecuta proyectos y órdenes y utiliza Inventario y Estudio.',
 editor:'Editor: consulta y trabaja la producción de piezas.',
 viewer:'Solo lectura: consulta los módulos del panel con acceso reducido.',
 collaborator:'Colaborador: trabaja clientes, proyectos, producción, presupuestos, pipeline, estudio e inventario sin ver finanzas, salarios, accesos ni actividad.',
};

const capabilityGroups:{name:string;keywords:string[]}[]=[
 {name:'Panel',keywords:['panel','resumen','tablero','control','dashboard','summary','actividad','activity','preferencia','preference','métrica','metrica','metric']},
 {name:'Comercial',keywords:['cliente','client','presupuesto','budget','proyecto','project','pipeline','oportunidad','opportunity','lead','venta','sales','comercial','plan']},
 {name:'Producción',keywords:['producción','produccion','production','orden','order','pieza','piece','inventario','inventory','estudio','studio','entrega','taller','work']},
 {name:'Finanzas',keywords:['finanza','finance','pago','payment','cobro','cobranza','mora','collection','factura','invoice','cuenta','account','informe','report','comisión','commission']},
 {name:'Equipo',keywords:['equipo','team','persona','people','member','invitación','invitacion','invite','acceso','access','permiso','permission','miembro','colaborador','assignee']},
 {name:'Configuración',keywords:['configuración','configuracion','config','settings','empresa','company','papelera','trash','ajuste','admin']},
];
function domainFor(row:MatrixRow){const text=(row.id+' '+row.label).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return capabilityGroups.find(group=>group.keywords.some(keyword=>text.includes(keyword)))?.name||'Configuración';}
type CapabilityGroup={name:string;rows:MatrixRow[]};
function groupedRows(capabilities:MatrixRow[]):CapabilityGroup[]{
 const groups:CapabilityGroup[]=capabilityGroups.map(group=>({name:group.name,rows:capabilities.filter(row=>domainFor(row)===group.name)})).filter(group=>group.rows.length);
 const known=new Set(groups.flatMap(group=>group.rows.map(row=>row.id)));
 const rest=capabilities.filter(row=>!known.has(row.id));
 if(rest.length)groups.push({name:'Otros',rows:rest});
 return groups;
}

/** Superficie v2 de tarjeta: una sola pieza, sin bordes anidados. */
const CARD='rounded-xl border border-ink-600 bg-ink-800 p-4';

/** Matriz de permisos en v2: encabezado y filas comparten una sola plantilla. */
const MATRIX_TEMPLATE='grid-cols-[minmax(15rem,1.4fr)_minmax(0,2.6fr)]';
const MATRIX_COLUMNS=[{key:'capability',label:'Capacidad'},{key:'roles',label:'Permisos por cargo'}];

function RoleExplorer({data}:{data:MatrixData}){
 return <div className="grid gap-2">
  {Object.keys(teamRoleLabels).map(roleId=>{
   const granted=data.capabilities.filter(row=>effective(row,roleId));
   const denied=data.capabilities.filter(row=>!effective(row,roleId));
   const all=granted.length===data.capabilities.length;
   return <details className="group rounded-xl border border-ink-600 bg-ink-800" key={roleId}>
    <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 p-4">
     <span className="text-sm font-semibold text-fore">{teamRoleLabels[roleId]}</span>
     <span className="min-w-0 flex-1 text-xs text-mute">{roleDescriptions[roleId]||teamRoleLabels[roleId]}</span>
     <StateChip tone={all?'ok':'mute'} title={`${granted.length} de ${data.capabilities.length} capacidades`}>{all?'Todos los permisos':`${granted.length} de ${data.capabilities.length}`}</StateChip>
     <ChevronDown className="shrink-0 text-mute transition-transform group-open:rotate-180" size={16} aria-hidden="true"/>
    </summary>
    <div className="grid gap-4 border-t border-ink-600 p-4 sm:grid-cols-2">
     <div className="min-w-0">
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute">Qué puede hacer</h4>
      {granted.length?<ul className="grid gap-2">{granted.map(row=><li key={row.id} className="min-w-0"><b className="block text-[13px] text-fore">{row.label}</b><small className="block text-[11.5px] text-mute">{row.description}</small></li>)}</ul>:<p className="text-xs text-mute">No tiene permisos habilitados.</p>}
     </div>
     <div className="min-w-0">
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute">Qué no puede</h4>
      {denied.length?<ul className="grid gap-2">{denied.map(row=><li key={row.id} className="min-w-0"><b className="block text-[13px] text-fore">{row.label}</b><small className="block text-[11.5px] text-mute">{row.description}</small></li>)}</ul>:<p className="text-xs text-mute">Nada: tiene todos los permisos del panel.</p>}
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
 async function resetAll(){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:null,role:null,allowed:null},'PATCH');setData(updated);setNotice('Todos los permisos volvieron a los valores por defecto.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 const manual=data?data.capabilities.reduce((total,row)=>total+overrideCount(row),0):0;
 return <div className="grid gap-4" aria-busy={loading||busy}>
  <p className="flex items-start gap-2 text-xs text-mute"><ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0"/> Definí qué puede hacer cada cargo. El Dueño siempre conserva todos los permisos. Los cambios se guardan por empresa y se auditan.</p>
  {error?<ErrorBlock title="No pudimos guardar el permiso" description={error} onRetry={()=>void load()}/>:null}
  {notice?<p role="status" className="text-xs text-ok">{notice}</p>:null}
  {loading?<LoadingBlock label="Cargando permisos…" lines={4}/>:!data?<EmptyBlock title="Sin datos de permisos" description="El API no devolvió la matriz de capacidades."/>:<>
   {explorer&&<>
    <KpiStrip>
     <Kpi label="Capacidades" valor={data.capabilities.length} hint="Acciones que controla el panel" destacado/>
     <Kpi label="Cargos" valor={data.roles.length} hint="Roles configurables de la empresa"/>
     <Kpi label="Ajustes manuales" valor={manual} hint="Permisos fuera del valor por defecto"/>
    </KpiStrip>
    <RoleExplorer data={data}/>
   </>}
   <ListGrid label="Roles y permisos" template={MATRIX_TEMPLATE} columns={MATRIX_COLUMNS} minWidthClass="min-w-[52rem]">
    {groupedRows(data.capabilities).map(group=><div key={group.name} className="contents">
     <p className="mt-3 mb-1 w-full font-mono text-[10px] uppercase tracking-[.13em] text-mute" role="row">{group.name}</p>
     {group.rows.map(row=><ListRow key={row.id} template={MATRIX_TEMPLATE}>
      <div className="min-w-0">
       <b className="block text-[13.5px] font-semibold leading-[1.2] text-fore">{row.label}</b>
       <small className="block text-[11.5px] text-mute">{row.description}</small>
       {overrideCount(row)?<small className="mt-1 block text-[10.5px] text-info tabular-nums">{overrideCount(row)} ajuste{overrideCount(row)===1?'':'s'} manual{overrideCount(row)===1?'':'es'}</small>:null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
       {data.roles.map(roleId=>{const checked=effective(row,roleId);return <span key={roleId} className="flex items-center gap-2 whitespace-nowrap">
        <Switch checked={checked} disabled={!owner||busy} ariaLabel={`${row.label} · ${teamRoleLabels[roleId]||roleId}`} onChange={(event:ChangeEvent<HTMLInputElement>)=>void toggle(row.id,roleId,event.target.checked)}/>
        <span className="text-[11.5px] text-mute">{teamRoleLabels[roleId]||roleId}</span>
       </span>;})}
      </div>
     </ListRow>)}
    </div>)}
   </ListGrid>
   {owner?<div className="flex justify-end"><button type="button" className="text-button" disabled={busy} onClick={()=>void resetAll()}>Restablecer todos los permisos por defecto</button></div>:<p className="text-xs text-mute">Solo el Dueño puede modificar esta matriz.</p>}
  </>}
 </div>;
}

export function PermissionsMatrix({role,close}:{role:string;close:()=>void}){
 return <Dialog title="Permisos del panel" close={close}><MatrixView role={role} explorer={false}/></Dialog>;
}

export function PermissionsMatrixPanel({role}:{role:string}){
 return <section className="grid gap-4" aria-labelledby="roles-permissions-title">
  <PageHeader eyebrow="Equipo" title="Roles y permisos" subtitle="Un permiso por capacidad y cargo; el Dueño conserva todo."/>
  <MatrixView role={role} explorer/>
 </section>;
}
