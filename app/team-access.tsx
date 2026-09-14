"use client";
import {useState} from 'react';
import {api,Dialog,Editor} from './operations';
import {MemberActions} from './suite';
import {completeSave} from './save-completion';
import {TeamMember,teamRoleLabels} from './team-directory';
import {ActorIdentity} from './actor-identity';
import './team-access.css';
export function TeamAccess({member,email,role,currentEmail,refresh,ambiguous=false}:{member:TeamMember|null;email:string|null;role:string;currentEmail:string;refresh:()=>Promise<void>;ambiguous?:boolean}){
 const [invite,setInvite]=useState(false);
 const manage=['owner','admin'].includes(role)&&(!ambiguous||Boolean(member));
 const state=member?member.removed_at?'Acceso retirado':member.active?'Acceso habilitado':'Acceso suspendido':'Sin acceso al panel';
 return <section className="team-access" aria-label="Acceso al panel"><header className="team-access-header"><div><p className="team-access-kicker">Scale OS</p><h3>Acceso al panel</h3></div><span className={`team-access-status${member?.removed_at?' is-removed':member?.active?' is-active':''}`}>{state}</span></header>
 <div className="team-access-member">{member?<ActorIdentity name={member.full_name||member.email} photoUrl={member.photo_url} timestamp={null}/>:<span className="team-access-avatar" aria-hidden="true">?</span>}<div><strong>{member?.full_name||email||'Sin integrante vinculado'}</strong><p>{member?.email||email||'No hay correo disponible'}{member&&<> · {teamRoleLabels[member.role]||member.role}</>}</p></div></div>
 <p className="team-access-help">El permiso controla Scale OS; el cargo laboral se gestiona por separado en la ficha.</p>
 <div className="team-access-actions">{manage&&member&&!member.removed_at?<MemberActions member={member} currentEmail={currentEmail} role={role} refresh={refresh}/>:manage&&email?<button type="button" className="secondary" onClick={()=>setInvite(true)}>{member?.removed_at?'Volver a invitar':'Invitar al panel'}</button>:null}</div>
 {invite&&<Dialog title="Invitar a esta empresa" close={()=>setInvite(false)}><div className="team-access-dialog"><p className="form-note">Se habilitará el acceso y se enviará una invitación al correo indicado. Los datos del perfil y los pagos se conservan.</p><Editor fields={[{key:'email',label:'Correo del integrante',type:'email'},{key:'role',label:'Permiso de acceso',choices:Object.entries(teamRoleLabels).filter(([value])=>value!=='owner'||role==='owner').map(([value,label])=>({value,label}))}]} defaults={{email:email||'',role:'viewer'}} label="Habilitar y enviar invitación" save={async values=>{await api('/api/agency/members',values);await completeSave(()=>setInvite(false),refresh);}}/></div></Dialog>}
 </section>;
}
