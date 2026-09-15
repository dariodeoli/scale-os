"use client";
import {useEffect,useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import {api,Dialog} from './operations';
import {teamRoleLabels} from './team-directory';
import './permissions-matrix.css';

type MatrixRow={id:string;label:string;description:string;defaults:string[];overrides:Record<string,boolean|undefined>};
type MatrixData={roles:string[];capabilities:MatrixRow[]};
const errorText=(error:unknown)=>error instanceof Error?error.message:'No se pudo guardar el permiso.';
function defaultAllowed(row:MatrixRow,role:string){return row.defaults.includes(role);}
function effective(row:MatrixRow,role:string){const override=row.overrides[role];return override===undefined?defaultAllowed(row,role):override;}

export function PermissionsMatrix({role,close}:{role:string;close:()=>void}){
 const [data,setData]=useState<MatrixData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true);
 const owner=role==='owner';
 async function load(){setLoading(true);setError('');try{setData(await api<MatrixData>('/api/agency/permissions'));}catch(cause){setError(errorText(cause));}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function toggle(rowId:string,roleId:string,allowed:boolean){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:rowId,role:roleId,allowed},'PATCH');setData(updated);setNotice('Permiso guardado. Los cambios se aplican desde la próxima acción de esa persona.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 async function resetRow(rowId:string){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:rowId,role:null,allowed:null},'PATCH');setData(updated);setNotice('Permisos restablecidos a los valores por defecto.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 async function resetAll(){if(!owner)return;setBusy(true);setError('');setNotice('');try{const updated=await api<MatrixData>('/api/agency/permissions',{capability:null,role:null,allowed:null},'PATCH');setData(updated);setNotice('Todos los permisos volvieron a los valores por defecto.');}catch(cause){setError(errorText(cause));}finally{setBusy(false);}}
 return <Dialog title="Permisos del panel" close={close}>
  <div className="permissions-matrix" aria-busy={loading||busy}>
   <p className="form-note"><ShieldCheck size={16} aria-hidden="true"/> Definí qué puede hacer cada cargo. El Dueño siempre conserva todos los permisos. Los cambios se guardan por empresa y se auditan.</p>
   {error?<p className="error" role="alert">{error} <button type="button" className="text-button" onClick={()=>void load()}>Reintentar</button></p>:null}
   {notice?<p role="status" className="permissions-notice">{notice}</p>:null}
   {loading?<p role="status">Cargando permisos…</p>:!data?null:<>
    <div className="permissions-scroll">
     <table>
      <thead><tr><th>Capacidad</th>{data.roles.map(roleId=><th key={roleId}>{teamRoleLabels[roleId]||roleId}</th>)}</tr></thead>
      <tbody>{data.capabilities.map(row=><tr key={row.id}>
       <th scope="row"><b>{row.label}</b><small>{row.description}</small></th>
       {data.roles.map(roleId=>{const checked=effective(row,roleId),isDefault=defaultAllowed(row,roleId);return <td key={roleId}><label className="permissions-check"><input type="checkbox" checked={checked} disabled={!owner||busy} aria-label={`${row.label} · ${teamRoleLabels[roleId]}`} onChange={event=>void toggle(row.id,roleId,event.target.checked)}/><span className={checked===isDefault?'permissions-state is-default':'permissions-state is-override'} aria-hidden="true">{checked?'✓':'×'}</span></label></td>;})}
      </tr>)}</tbody>
     </table>
    </div>
    {owner?<div className="inline-actions permissions-reset"><button type="button" className="text-button" disabled={busy} onClick={()=>void resetAll()}>Restablecer todos los permisos por defecto</button></div>:<p className="form-note">Solo el Dueño puede modificar esta matriz.</p>}
   </>}
  </div>
 </Dialog>;
}
