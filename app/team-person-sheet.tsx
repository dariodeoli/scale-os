"use client";
import {useEffect,useState} from 'react';
import {Editor,api,type Field} from './operations';
import {SelectCustom} from './profile-controls';
import {currencyChoices} from './currencies';
import {PersonPhotoField} from './person-photo';
import {RemoveRecord} from './archive-controls';
import {TeamAccess} from './team-access';
import {TeamMember,teamRoleLabels} from './team-directory';
import {PersonSheet,type SheetTab,type SheetTabId} from './person-sheet';
import {AVISO_REFRESCO,completeSave} from './save-completion';
import {notify} from './feedback';
import {roleCan} from './capabilities';

export type Person={
  id:string;
  full_name:string;
  email:string|null;
  photo_url:string|null;
  job_title:string|null;
  compensation_type:string;
  compensation_amount:string;
  currency:string;
  invoices_company:boolean;
  started_on:string|null;
  ended_on:string|null;
  payment_day:number|null;
  active:boolean;
  notes:string|null;
  user_id:string|null;
  access_email:string|null;
};
export const compensationTypes=[
  {value:'fixed',label:'Fijo mensual'},
  {value:'variable',label:'Variable'},
  {value:'hourly',label:'Por hora'},
  {value:'per_project',label:'Por proyecto'},
];

type CollaboratorSave={collaborator?:Person;access?:{status:string;emailSent?:boolean}};
const errorText=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudo completar la operación.';

// Campos del perfil: sin ningún dato salarial (la API rechaza con 403 que un rol
// sin `salary.view` los envíe, y la pestaña Remuneración es la única que los edita).
const profileFields:Field[]=[
  {key:'full_name',label:'Nombre completo'},
  {key:'email',label:'Correo de contacto',type:'email',optional:true},
  {key:'job_title',label:'Cargo',optional:true},
  {key:'active',label:'Estado laboral',choices:[{value:'true',label:'Activo'},{value:'false',label:'Inactivo'}]},
  {key:'started_on',label:'Fecha de ingreso',type:'date',optional:true,section:'Fechas'},
  {key:'ended_on',label:'Fecha de salida',type:'date',optional:true,section:'Fechas'},
  {key:'notes',label:'Condiciones y notas',type:'textarea',optional:true},
];
const payFields:Field[]=[
  {key:'compensation_type',label:'Modalidad',choices:compensationTypes},
  {key:'compensation_amount',label:'Importe acordado',type:'money'},
  {key:'currency',label:'Moneda',choices:currencyChoices},
  {key:'invoices_company',label:'¿Emite factura?',choices:[{value:'true',label:'Sí'},{value:'false',label:'No'}]},
  {key:'payment_day',label:'Día de pago (1–31)',choices:[{value:'',label:'Sin definir'},...Array.from({length:31},(_,i)=>({value:String(i+1),label:String(i+1)}))],optional:true},
];

function accessMessage(access:CollaboratorSave['access']){
  if(!access)return null;
  if(access.status==='suspended')return {tone:'warning' as const,message:'Perfil guardado. Su acceso sigue suspendido; se administra desde la pestaña Acceso.'};
  if(access.status==='invited')return access.emailSent?{tone:'success' as const,message:'Acceso habilitado e invitación enviada.'}:{tone:'warning' as const,message:'Acceso habilitado. No se pudo enviar el correo; puede entrar con Google usando el correo registrado.'};
  if(access.status==='linked')return {tone:'success' as const,message:'Perfil guardado y acceso vinculado.'};
  if(access.status==='needs_admin')return {tone:'warning' as const,message:'Perfil guardado. Administración debe habilitar el acceso.'};
  return null;
}

/** ¿Este acceso se puede editar desde la ficha? (no el propio ni el de un dueño sin ser dueño). */
function accessEditable(member:TeamMember|null,role:string,currentEmail:string){
  return Boolean(member&&!member.removed_at&&member.email!==currentEmail&&!(member.role==='owner'&&role!=='owner'));
}

function ProfileTab({role,person,member,seedEmail,load,onCreated}:{role:string;person:Person|null;member:TeamMember|null;seedEmail:string;load:()=>Promise<void>;onCreated:(person:Person)=>void}){
  const defaults:Record<string,string>={
    full_name:person?.full_name||member?.full_name||'',
    email:person?.email||seedEmail||'',
    job_title:person?.job_title||'',
    active:String(person?.active??true),
    started_on:person?.started_on?.slice(0,10)||'',
    ended_on:person?.ended_on?.slice(0,10)||'',
    notes:person?.notes||'',
  };
  const note=person?'El estado laboral no modifica el acceso al panel.':['owner','admin'].includes(role)?'Al guardar un colaborador activo con correo, vinculamos su acceso; los permisos existentes se conservan.':'Administración debe autorizar el acceso al panel de los nuevos colaboradores.';
  return <>
    <p className="form-note">{note}</p>
    {(person||(member&&!member.removed_at))?<PersonPhotoField
      key={person?String(person.id):`member-${member?.id}`}
      photo={person?person.photo_url:member?.photo_url??null}
      name={person?person.full_name:member?.full_name||member?.email||'Integrante'}
      save={async value=>{
        if(person)await api(`/api/agency/collaborators/${person.id}`,{photo_url:value},'PATCH');
        else if(member)await api(`/api/agency/members/${member.id}/photo`,{photo_url:value},'PATCH');
        await load();
      }}
    />:null}
    <Editor
      key={person?String(person.id):`new-${member?.id||seedEmail}`}
      columns
      fields={profileFields}
      defaults={defaults}
      label={person?'Guardar perfil':'Crear persona'}
      cancelLabel={false}
      save={async values=>{
        const result=await api<CollaboratorSave>(`/api/agency/collaborators${person?`/${person.id}`:''}`,{...values,active:values.active==='true'},person?'PATCH':'POST');
        const extra=accessMessage(result.access);
        if(extra)notify(extra);
        // Se refresca ANTES de pasar a la persona creada: la ficha no se desmonta a mitad del guardado.
        try{await load();}catch{notify({tone:'warning',message:AVISO_REFRESCO});}
        if(!person&&result.collaborator)onCreated(result.collaborator);
      }}
    />
  </>;
}

function AccessTab({role,currentEmail,person,member,ambiguous,load}:{role:string;currentEmail:string;person:Person|null;member:TeamMember|null;ambiguous:boolean;load:()=>Promise<void>}){
  const editable=accessEditable(member,role,currentEmail);
  const [draft,setDraft]=useState<{role:string;active:string}|null>(null);
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  useEffect(()=>{setDraft(member&&editable?{role:member.role,active:String(member.active!==false)}:null);},[member?.id,member?.role,member?.active,member?.removed_at,editable]);
  const email=person?.email||(member&&member.email)||null;
  const dirty=Boolean(draft&&member&&(draft.role!==member.role||draft.active!==String(member.active!==false)));
  async function saveAccess(){
    if(!draft||!member||busy)return;
    setBusy('save');setError('');
    try{
      // Compare-and-set: el API rechaza (409) si otra persona cambió el rol o el acceso mientras tanto.
      await api(`/api/agency/members/${member.id}`,{role:draft.role,active:draft.active==='true',expected_role:member.role,expected_active:member.active!==false},'PATCH');
      await completeSave(()=>{},load);
    }catch(cause){setError(errorText(cause));}
    finally{setBusy('');}
  }
  async function resend(){
    if(!member||busy)return;
    setBusy('resend');setError('');
    try{
      const result=await api<{emailSent:boolean}>(`/api/agency/members/${member.id}/resend`,{});
      if(result.emailSent)notify({tone:'success',message:'Invitación enviada.'});
      else notify({tone:'warning',message:'El proveedor no pudo enviar el correo.'});
    }catch(cause){setError(errorText(cause));}
    finally{setBusy('');}
  }
  const choices=[...(role==='owner'?['owner']:[]),'admin','management','finance','sales','production','editor','viewer','collaborator'].map(value=>({value,label:teamRoleLabels[value]||value}));
  return <section className="grid min-w-0 gap-3" aria-label="Acceso al panel">
    <TeamAccess member={member} ambiguous={ambiguous} email={email} role={role} refresh={load}/>
    {ambiguous?<p className="form-note">Hay perfiles con el mismo correo. Revisá sus datos antes de vincular accesos; no se combinaron sus pagos.</p>:null}
    {member&&!member.removed_at?(draft?<>
      <div className="ops-form-grid">
        <SelectCustom label="Permiso" choices={choices} value={draft.role} onChange={value=>setDraft(current=>({...current!,role:value}))}/>
        <SelectCustom label="Estado de acceso" choices={[{value:'true',label:'Activo'},{value:'false',label:'Suspendido'}]} value={draft.active} onChange={value=>setDraft(current=>({...current!,active:value}))}/>
      </div>
      <p className="form-note">Cambiar el permiso o suspender el acceso cierra sus sesiones en esta empresa.</p>
      {error?<p className="error" role="alert">{error}</p>:null}
      <div className="inline-actions">
        <button type="button" className="primary" disabled={!dirty||Boolean(busy)} onClick={()=>void saveAccess()}>{busy==='save'?'Guardando…':'Guardar acceso'}</button>
        {member.active!==false?<button type="button" className="secondary" disabled={Boolean(busy)} onClick={()=>void resend()}>Reenviar invitación</button>:null}
        <RemoveRecord kind="members" id={member.id} name={member.email} role={role} done={load}/>
      </div>
    </>:<p className="form-note">Tu propio acceso se administra desde Mi perfil; el de otros dueños, desde Equipo.</p>):null}
    {!member&&!person?<p className="form-note">Guardá el perfil para poder invitar a esta persona al panel.</p>:null}
  </section>;
}

function PayTab({person,defaultCurrency,load}:{person:Person;defaultCurrency:string;load:()=>Promise<void>}){
  const defaults:Record<string,string>={
    compensation_type:person.compensation_type||'fixed',
    compensation_amount:person.compensation_amount||'0',
    currency:person.currency||defaultCurrency,
    invoices_company:String(person.invoices_company||false),
    payment_day:String(person.payment_day||5),
  };
  return <>
    <p className="form-note">La remuneración solo la ven y editan administración y finanzas.</p>
    <Editor
      key={String(person.id)}
      columns
      fields={payFields}
      defaults={defaults}
      label="Guardar remuneración"
      cancelLabel={false}
      save={async values=>{
        await api(`/api/agency/collaborators/${person.id}`,{...values,invoices_company:values.invoices_company==='true'},'PATCH');
        await completeSave(()=>{},load);
      }}
    />
  </>;
}

export type SheetTarget={personId:string|null;memberId:string|null;seedEmail:string;tab:SheetTabId};

/**
 * Ficha de una persona de Equipo. Cada pestaña guarda por separado (perfil,
 * acceso, remuneración): no hay un guardado a medias entre ellas (#186 E3).
 */
export function TeamPersonSheet({role,currentEmail,person,member,ambiguous,seedEmail,tab,defaultCurrency,load,onCreated,close}:{role:string;currentEmail:string;person:Person|null;member:TeamMember|null;ambiguous:boolean;seedEmail:string;tab:SheetTabId;defaultCurrency:string;load:()=>Promise<void>;onCreated:(person:Person)=>void;close:()=>void}){
  const salaryView=roleCan(role,'salary.view');
  const canManageAccess=roleCan(role,'members.manage');
  const tabs:SheetTab[]=[{id:'perfil',label:'Perfil',content:<ProfileTab role={role} person={person} member={member} seedEmail={seedEmail} load={load} onCreated={onCreated}/>}];
  if(canManageAccess&&(person||member))tabs.push({id:'acceso',label:'Acceso',content:<AccessTab role={role} currentEmail={currentEmail} person={person} member={member} ambiguous={ambiguous} load={load}/>});
  // Sin `salary.view` la pestaña no se arma: ni su contenido ni sus datos existen.
  if(salaryView&&person)tabs.push({id:'remuneracion',label:'Remuneración',content:<PayTab person={person} defaultCurrency={defaultCurrency} load={load}/>});
  const title=person?'Editar persona':'Nueva persona';
  return <PersonSheet mode="team" title={title} close={close} salaryView={salaryView} tabs={tabs} initialTab={tab}/>;
}
