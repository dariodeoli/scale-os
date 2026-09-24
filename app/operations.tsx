"use client";
import {currencyChoices} from "./currencies";
import {ViewToggle} from './view-toggle';
import {SearchField} from './search-field';
import {useCompanyCurrency} from './currency-provider';
import {ProjectPresence} from './presence';
import { useEffect, useState, useRef, useId } from "react";
import {normalizeCommercialDashboard, type CommercialDashboard} from './control-center-data';
import {Dialog,FormActions,useDialogPending,useDialogClose} from "./dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, MessageSquare, Pencil, Plus, RotateCcw, Star } from "lucide-react";
import { AmountInput, SelectCustom } from './profile-controls';
import {PHONE_ERROR, phoneValid, emailValid, EMAIL_ERROR} from './field-rules';
import {PasswordField} from './password-field';
import {PhoneField} from './phone-field';
import {EmailField} from './email-field';
import {PersonPhotoField} from './person-photo';
import {listDateShort} from './list-format';
import {EmptyBlock,LoadingBlock} from './ui-v2';
import {DriveLinkNote} from './drive-link';
import {DriveLinksInput,parseDriveLinksText} from './drive-links';
import {RemoveRecord} from './archive-controls';
import {PhotoViewer} from './photo-viewer';
import {ActorIdentity} from './actor-identity';
import {PersonContainer} from './person-container';
import {CommentBody,CommentComposer} from './commenting';
import {notify,notifyMutation} from './feedback';
import {teamDirectory,TeamMember,ArchivedProfile,teamRoleLabels} from './team-directory';
import {TeamAccess} from './team-access';
import {PermissionsMatrix} from './permissions-matrix';
import {dataFetch} from './data-cache';
import {canOpenPeopleWorkspace,roleCan} from './capabilities';

export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const r = await dataFetch(path.startsWith("/core-api/") ? path : `/core-api${path}`, {
    credentials: "include",
    method: body === undefined ? "GET" : method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "No se pudo completar la operación");
  notifyMutation(path,body===undefined?'GET':method,body,data);
  if(body!==undefined&&/^\/api\/agency\/(productivity\/profile|collaborators(?:\/\d+)?)$/.test(path))window.dispatchEvent(new Event('scale:identity-changed'));
  return data as T;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación";
export const money = (value: string | number, currency = "PYG") =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PYG" ? 0 : 2,
  }).format(Number(value));
export {Dialog} from './dialog';
type Choice = { value: string; label: string };
export type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "time" | "email" | "url" | "textarea" | "money" | "password" | "phone";
  choices?: Choice[];
  optional?: boolean;
  section?: string;
  wide?: boolean;
  help?: string;
  integer?: boolean;
  maxLength?: number;
  currencyKey?: string;
  currency?: string;
  currencyFrom?: (values: Record<string, string>) => string;
  lookup?: {label: string; run: (value: string) => Promise<Record<string, string>>};
};
const currencies = currencyChoices;
export function Editor({
  fields,
  defaults,
  save,
  label = "Guardar",
  columns = true,
  closeOnSave = false,
  resetOnSave = false,
  cancelLabel = 'Cancelar',
}: {
  fields: Field[];
  defaults: Record<string, string>;
  save: (v: Record<string, string>) => Promise<void>;
  label?: string;
  columns?: boolean;
  closeOnSave?: boolean;
  resetOnSave?: boolean;
  cancelLabel?: string | false;
}) {
  const shape: Record<string, z.ZodString> = {};
  for (const f of fields) {
    let s = z.string();
    if (!f.optional) s = s.min(1, `Completá ${f.label.toLowerCase()}`);
    if(f.integer)s=s.refine(value=>value===''||/^\d+$/.test(value),'Ingresá un número entero.');
    if(f.type==='phone')s=s.refine(value=>value===''||phoneValid(value),PHONE_ERROR);
    if(f.type==='email')s=s.refine(value=>value===''||emailValid(value),EMAIL_ERROR);
    shape[f.key] = s;
  }
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(z.object(shape)),
    defaultValues: defaults,
  });
  const [error, setError] = useState("");
  const formPrefix=useId(),saving=useRef(false),requestClose=useDialogClose();
  const [savingNow,setSavingNow]=useState(false),[saved,setSaved]=useState(false);
  const [lookupBusy,setLookupBusy]=useState(''),[lookupNotices,setLookupNotices]=useState<Record<string,string>>({});
  const pending=form.formState.isSubmitting||savingNow;
  useDialogPending(pending);
  useEffect(()=>{if(saved&&!pending){setSaved(false);requestClose?.();}},[saved,pending,requestClose]);
  async function runLookup(f:Field){if(!f.lookup||pending||lookupBusy)return;const value=(form.getValues(f.key)||'').trim();setLookupNotices(current=>({...current,[f.key]:''}));if(!value){setLookupNotices(current=>({...current,[f.key]:`Escribí ${f.label} primero.`}));return;}setLookupBusy(f.key);setError('');try{const found=await f.lookup.run(value);for(const [key,next] of Object.entries(found))form.setValue(key,String(next),{shouldValidate:true,shouldDirty:true});setLookupNotices(current=>({...current,[f.key]:'Datos encontrados. Revisá y guardá.'}));}catch(cause){setLookupNotices(current=>({...current,[f.key]:cause instanceof Error?cause.message:'No se pudo completar la consulta.'}));}finally{setLookupBusy('');}}
  const renderField = (f: Field) => {
    const id=`${formPrefix}-${f.key}`,invalid=!!form.formState.errors[f.key];
    const describedBy=[f.help?`${id}-help`:null,invalid?`${id}-error`:null,lookupNotices[f.key]?`${id}-lookup`:null].filter(Boolean).join(' ')||undefined;
    const derivedCurrency=f.currencyFrom?(f.currencyFrom(form.watch() as Record<string,string>)):undefined;
    return <div key={f.key} className={f.wide || f.type === 'textarea' || f.type === 'url' || ['title','description','drive_url','drive_links','address','notes','legal_name'].includes(f.key) ? 'ops-wide' : undefined}>
      {f.choices ? <SelectCustom label={`${f.label}${f.optional?' · Opcional':''}`} choices={f.choices} value={form.watch(f.key)||''} disabled={pending} invalid={invalid} describedBy={describedBy} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <label htmlFor={id}><span>{f.key==='drive_url'||f.key==='drive_links'?'Enlace de archivo o carpeta de Drive':f.label}{f.optional&&<span className="field-optional"> · Opcional</span>}</span>
        {f.key==='drive_links' ? (
          <DriveLinksInput value={form.watch(f.key)||''} disabled={pending} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/>
        ) : f.type === 'textarea' ? <textarea id={id} disabled={pending} aria-invalid={invalid||undefined} aria-describedby={describedBy} maxLength={f.maxLength} {...form.register(f.key)}/> : f.type === 'password' ? <PasswordField bare label={f.label} name={f.key} value={form.watch(f.key)||''} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})} autoComplete="new-password" required={!f.optional} minLength={8}/> : f.type === 'money' ? <AmountInput id={id} disabled={pending} invalid={invalid} describedBy={describedBy} value={form.watch(f.key)||''} currency={f.currency||derivedCurrency||form.watch(f.currencyKey||'currency')||'PYG'} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : f.type === 'phone' ? <PhoneField id={id} value={form.watch(f.key)||''} disabled={pending} invalid={invalid} describedBy={describedBy} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : f.type === 'email' ? <EmailField id={id} value={form.watch(f.key)||''} disabled={pending} invalid={invalid} describedBy={describedBy} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <span className={f.lookup?'ops-lookup-row':undefined}><input id={id} disabled={pending} aria-invalid={invalid||undefined} aria-describedby={describedBy} inputMode={f.type === 'number' ? (f.integer?'numeric':'decimal') : undefined} type={f.type||'text'} step={f.type === 'number' ? f.integer?'1':'0.01' : undefined} maxLength={f.maxLength} {...form.register(f.key)}/>{f.lookup&&<button type="button" className="text-button ops-lookup-button" disabled={pending||lookupBusy===f.key} onClick={()=>void runLookup(f)}>{lookupBusy===f.key?'Buscando…':f.lookup.label}</button>}</span>}
      </label>}
      {f.help&&<small id={`${id}-help`} className="field-help">{f.help}</small>}
      {invalid&&<small id={`${id}-error`} className="error" role="alert">{String(form.formState.errors[f.key]?.message)}</small>}
      {lookupNotices[f.key]&&<small id={`${id}-lookup`} className="field-help ops-lookup-note" role="status">{lookupNotices[f.key]}</small>}
    </div>;
  };
  return (
    <form
      className={columns ? "form-stack ops-form-grid" : "form-stack"}
      noValidate
      aria-busy={pending}
      onSubmit={form.handleSubmit(async (v) => {
        if(saving.current)return;
        saving.current=true;
        setSavingNow(true);
        setError("");
        try {
          const values:Record<string,unknown>={...v};
          if(typeof values.drive_links==='string')values.drive_links=parseDriveLinksText(values.drive_links);
          // `drive_links` is normalized to structured link objects just before
          // sending it to the API. Keep the public Editor contract string-based
          // so every existing form remains simple and type-safe.
          await save(values as unknown as Record<string, string>);
          if(resetOnSave)form.reset(defaults);
          // Most existing editors close in their own success callback. Only
          // simple edit dialogs opt in; multi-action detail drawers stay open.
          if(closeOnSave)setSaved(true);
        } catch (e) {
          setError(message(e));
        } finally {
          saving.current=false;
          setSavingNow(false);
        }
      })}
    >
      {fields.some(f=>f.key==='drive_url'||f.key==='drive_links')&&<div className="ops-wide"><DriveLinkNote multiple={fields.some(f=>f.key==='drive_links')}/></div>}
      {fields.filter(f=>!f.section).map(renderField)}
      {Array.from(new Set(fields.map(f=>f.section).filter((s):s is string=>Boolean(s)))).map(section=><details className="ops-profile-section ops-wide" key={section} open>
        <summary>{section}</summary><div className="ops-form-grid">{fields.filter(f=>f.section===section).map(renderField)}</div>
      </details>)}
      {error && (
        <p className="error form-error-summary ops-wide" role="alert">
          {error}
        </p>
      )}
      <FormActions>{requestClose&&cancelLabel&&<button className="secondary" type="button" disabled={pending} onClick={requestClose}>{cancelLabel}</button>}<button type="submit" className="primary ops-wide" disabled={pending}>
        {pending ? "Guardando…" : label}
      </button></FormActions>
    </form>
  );
}
type Person = {
  id: string;
  full_name: string;
  email: string | null;
  photo_url: string | null;
  job_title: string | null;
  compensation_type: string;
  compensation_amount: string;
  currency: string;
  invoices_company: boolean;
  started_on: string | null;
  ended_on: string | null;
  payment_day: number | null;
  active: boolean;
  notes: string | null;
  user_id: string | null;
  access_email: string | null;
};
const types = [
  { value: "fixed", label: "Fijo mensual" },
  { value: "variable", label: "Variable" },
  { value: "hourly", label: "Por hora" },
  { value: "per_project", label: "Por proyecto" },
];
export function OperationsWorkspace({
  role,
  currentEmail='',
  organizationName='',
}: {
  role: string;
  currentEmail?:string;
  organizationName?:string;
}) {
  if(!canOpenPeopleWorkspace(role))return <TeamDirectoryView organizationName={organizationName}/>;
  return <PeopleWorkspace role={role} currentEmail={currentEmail} organizationName={organizationName}/>;
}
type DirectoryPerson={id:string;full_name:string;photo_url:string|null;role:string;cargo?:string};
function TeamDirectoryView({organizationName}:{organizationName:string}){
  const [directory,setDirectory]=useState<DirectoryPerson[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let alive=true;void api<{directory:DirectoryPerson[]}>('/api/agency/team').then(data=>{if(alive){setDirectory(Array.isArray(data?.directory)?data.directory:[]);setLoaded(true);}}).catch(e=>{if(alive)setError(message(e));});return()=>{alive=false;};},[]);
  return <div className="ops-stack">
    <section className="panel">
      <div className="mb-4 min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-fore">Directorio interno</h2>
        <p className="mt-1 text-[13px] leading-[1.5] text-mute">Foto, nombre y cargo. Los datos personales de cada integrante se administran desde su propio perfil.</p>
      </div>
      {error&&<p className="error" role="alert">{error}</p>}
      {directory.length?<div className="ops-grid team-directory-grid">
        {directory.map(person=><article className="ops-card team-directory-card" key={person.id}><PersonContainer size="lg" name={person.full_name||'Integrante'} photoUrl={person.photo_url||undefined} secondary={teamRoleLabels[person.role]||person.cargo||'Sin cargo'} verified/></article>)}
      </div>:error?null:loaded?<EmptyBlock title="Sin integrantes para mostrar" description="Cuando la empresa tenga personas activas vas a verlas acá."/>:<LoadingBlock label="Cargando equipo…" lines={3}/>}
    </section>
  </div>;
}
function PeopleWorkspace({
  role,
  currentEmail='',
  organizationName='',
}: {
  role: string;
  currentEmail?:string;
  organizationName?:string;
}) {
  const {currency:defaultCurrency}=useCompanyCurrency();
  const [members,setMembers]=useState<TeamMember[]>([]),[archivedProfiles,setArchivedProfiles]=useState<ArchivedProfile[]>([]),[seedEmail,setSeedEmail]=useState(''),[search,setSearch]=useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [edit, setEdit] = useState<Person | "new" | null>(null);
  const [commercial, setCommercial] = useState<CommercialDashboard | null>(null);
  const [teamView,setTeamView]=useState<'cards'|'list'>('cards');
  const canManageAccess=roleCan(role,'members.manage');
  const [selectedAccess,setSelectedAccess]=useState<string[]>([]),[bulkAccessBusy,setBulkAccessBusy]=useState(false);
  function toggleAccessSelected(id:string){setSelectedAccess(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);}
  function selectVisibleAccess(){
    const ids=visiblePeople.filter(entry=>entry.member&&!entry.member.removed_at&&entry.member.email!==currentEmail).map(entry=>String(entry.member!.id));
    setSelectedAccess(current=>{const all=ids.length>0&&ids.every(id=>current.includes(id));return all?current.filter(id=>!ids.includes(id)):[...new Set([...current,...ids])];});
  }
  async function batchSetAccess(active:boolean){
    if(bulkAccessBusy||!selectedAccess.length)return;
    setBulkAccessBusy(true);setError('');
    const total=selectedAccess.length;
    let done=0,failed=0;
    try{
      // Una fila retirada o vencida no aborta el lote: se cuenta y se sigue (issue #22).
      for(const id of selectedAccess){
        try{await api(`/api/agency/members/${id}`,{active},'PATCH');done+=1;}
        catch{failed+=1;}
      }
      setSelectedAccess([]);await load();
      const action=active?'reactivado':'suspendido';
      const plural=(count:string)=>`${count} acceso${count==='1'?'':'s'} ${action}${count==='1'?'':'s'}.`;
      notify({tone:failed?'warning':'success',message:failed?`${plural(String(done))} ${failed} no se pudieron actualizar (acceso ya retirado).`:plural(String(done))});
    }catch(cause){setError(message(cause));await load().catch(()=>{});}
    finally{setBulkAccessBusy(false);}
  }
  // Equipo sigue a quienes gestionan personas o ven salarios (sin listas de roles paralelas).
  const salaryView = roleCan(role, "salary.view");
  const allowed = canOpenPeopleWorkspace(role);
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    setCommercial(null);
    void api<unknown>("/api/agency/control-center")
      .then(value => { if (alive) setCommercial(normalizeCommercialDashboard(value)); })
      .catch(() => { if (alive) setCommercial(null); });
    return () => { alive = false; };
  }, [allowed]);
  async function load() {
    const p = await api<{ collaborators: Person[];members?:TeamMember[];archivedProfiles?:ArchivedProfile[] }>("/api/agency/team");
    setPeople(p.collaborators);
    setMembers(p.members||[]);setArchivedProfiles(p.archivedProfiles||[]);
  }
  useEffect(() => {
    if (allowed)
      load()
        .catch((e) => setError(message(e)))
        .finally(() => setLoading(false));
  }, [allowed]);
  useEffect(()=>{
    if(!allowed)return;
    const refreshIdentity=()=>{void load().catch(e=>setError(message(e)));};
    window.addEventListener('scale:identity-changed',refreshIdentity);
    return()=>window.removeEventListener('scale:identity-changed',refreshIdentity);
  },[allowed]);
  async function done() {
    await load();
    setEdit(null);
    setNotice("Guardado correctamente.");
  }
  if (!allowed)
    return (
      <EmptyBlock title="Información restringida" description="Solo administración y finanzas pueden ver remuneraciones y comisiones."/>
    );
  const person = edit && edit !== "new" ? edit : null;
  const empty = { value: "", label: "Sin vincular" };
  const personFields: Field[] = [
    { key: "full_name", label: "Nombre completo", section: 'Datos personales' },
    {
      key: "email",
      label: "Correo de contacto",
      type: "email",
      optional: true,
      section: 'Datos personales',
    },
    {
      key: "active", label: "Estado laboral", choices: [
        { value: "true", label: "Activo" }, { value: "false", label: "Inactivo" },
      ],
      section: 'Datos personales',
    },
    {
      key: "started_on",
      label: "Fecha de ingreso",
      type: "date",
      optional: true,
      section: 'Fechas',
    },
    { key: "ended_on", label: "Fecha de salida", type: "date", optional: true, section: 'Fechas' },
    { key: "compensation_type", label: "Modalidad", choices: types, section: 'Remuneración y pagos' },
    { key: "compensation_amount", label: "Importe acordado", type: "money", section: 'Remuneración y pagos' },
    { key: "currency", label: "Moneda", choices: currencies, section: 'Remuneración y pagos' },
    {
      key: "invoices_company",
      label: "¿Emite factura?",
      section: 'Remuneración y pagos',
      choices: [
        { value: "true", label: "Sí" },
        { value: "false", label: "No" },
      ],
    },
    {
      key: "payment_day",
      label: "Día de pago (1–31)",
      choices: [{value:'',label:'Sin definir'},...Array.from({length:31},(_,i)=>({value:String(i+1),label:String(i+1)}))],
      optional: true,
      section: 'Remuneración y pagos',
    },
    { key: "notes", label: "Condiciones y notas", type: "textarea", optional: true },
  ];
  const directory=teamDirectory(people,members,archivedProfiles);
  const visiblePeople=directory.filter(entry=>`${entry.profile?.full_name||''} ${entry.profile?.email||''} ${entry.member?.full_name||''} ${entry.member?.email||''}`.toLowerCase().includes(search.trim().toLowerCase()));
  // Un pago sin nombre en el modo activo no se lista: el encabezado de columnas
  // solo aparece cuando hay filas visibles que lo justifiquen.
  const personDefaults: Record<string, string> = {
    full_name: person?.full_name || members.find(member=>member.email===seedEmail)?.full_name || "",
    job_title: person?.job_title || "",
    email: person?.email || seedEmail,
    compensation_type: person?.compensation_type || "fixed",
    compensation_amount: person?.compensation_amount || "0",
    currency: person?.currency || defaultCurrency,
    invoices_company: String(person?.invoices_company || false),
    started_on: person?.started_on?.slice(0, 10) || "",
    ended_on: person?.ended_on?.slice(0, 10) || "",
    payment_day: String(person?.payment_day || 5),
    active: String(person?.active ?? true),
    notes: person?.notes || "",
  };
  const dialogMember = person
    ? directory.find(entry=>entry.profile?.id===person.id)?.member || null
    : members.find(member=>member.email===seedEmail) || null;
  const [accessDraft,setAccessDraft]=useState<{role:string;active:string}|null>(null);
  const [accessBusy,setAccessBusy]=useState(false);
  useEffect(()=>{
    const member=dialogMember&&!dialogMember.removed_at&&!(dialogMember.email===currentEmail||dialogMember.role==='owner'&&role!=='owner')?dialogMember:null;
    setAccessDraft(member?{role:member.role,active:String(member.active!==false)}:null);
  },[dialogMember?.id,dialogMember?.role,dialogMember?.active,dialogMember?.removed_at]);
  return (
    <div className="ops-stack">
      <section className="panel">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-fore">Personas, accesos y remuneraciones</h2>
            <p className="mt-1 text-[13px] leading-[1.5] text-mute">Equipo{organizationName?` de ${organizationName}`:''}: directorio, roles y estado de cada integrante.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {roleCan(role,'settings.manage')&&<button className="secondary" onClick={()=>setPermissionsOpen(true)}>Permisos del panel</button>}
          <button
            className="primary"
            onClick={() => {setSeedEmail('');setEdit("new");}}
          >
            <Plus size={16} />
            Agregar persona
          </button>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className="kpi-strip" aria-label="Facturación contratada">
          <article className="kpi-card tone-blue">
            <p className="eyebrow">FACTURACIÓN CONTRATADA</p>
            {commercial===null?<strong>Calculando…</strong>:commercial.expectedMonthlyBilling===undefined?<strong>No disponible</strong>:commercial.expectedMonthlyBilling.length?<div className="kpi-amounts">{commercial.expectedMonthlyBilling.map(item=><span key={item.currency}>{money(Number(item.total),item.currency)} / mes</span>)}</div>:<strong>Sin contratos activos</strong>}
            <small>{commercial?.expectedMonthlyBilling===undefined?'No disponible':commercial.expectedMonthlyBilling.length?'Expectativa comercial vigente por moneda':'Los contratos se activan en la ficha comercial del cliente: plan contratado y monto mensual.'}</small>
          </article>
        </div>
        <div className="team-filters">
          <SearchField className="team-search" label="Buscar persona" value={search} onChange={setSearch} placeholder="Nombre, correo o cargo"/>
          <div className="choice-list compact">
            <button className={!search?'choice active':'choice'} onClick={()=>setSearch('')}>Todos</button>
            <button className={search==='activo'?'choice active':'choice'} onClick={()=>setSearch('activo')}>Activos</button>
            <button className={search==='inactivo'?'choice active':'choice'} onClick={()=>setSearch('inactivo')}>Inactivos</button>
          </div>
          <div className="workspace-view-controls"><ViewToggle label="Vista del equipo" value={teamView==='list'?'list':'grid'} onChange={value=>setTeamView(value==='list'?'list':'cards')}/></div>
        </div>
        {loading ? (
          <LoadingBlock label="Cargando equipo…" lines={4}/>
        ) : (
          <div className={`ops-grid${teamView==='list'?' ops-grid-list':''}`}>
            {canManageAccess&&visiblePeople.some(entry=>entry.member&&!entry.member.removed_at&&entry.member.email!==currentEmail)?<div className="bulk-bar" role="status" aria-live="polite"><span className="bulk-count">{selectedAccess.length?<><b>{selectedAccess.length}</b> seleccionado{selectedAccess.length===1?'':'s'}</>:<span className="bulk-hint">Seleccioná integrantes para operar en lote</span>}</span><div className="inline-actions bulk-actions"><button type="button" className="text-button" onClick={selectVisibleAccess}>Seleccionar visibles</button>{selectedAccess.length?<><button type="button" className="secondary" disabled={bulkAccessBusy} onClick={()=>void batchSetAccess(false)}>Suspender acceso</button><button type="button" className="secondary" disabled={bulkAccessBusy} onClick={()=>void batchSetAccess(true)}>Reactivar acceso</button><button type="button" className="text-button" onClick={()=>setSelectedAccess([])}>Limpiar</button></>:null}</div></div>:null}
            {teamView==='list'?<div className="person-hub-head-row" aria-hidden="true"><span>Persona</span><span>Datos</span><span>Estado</span><span>Ficha</span><span>Acceso</span><span>Acciones</span></div>:null}
            {visiblePeople.map((entry) => {const p=entry.profile;const accessState=!entry.member?'Sin acceso al panel':entry.member.removed_at?'Acceso retirado':entry.member.active?'Acceso habilitado':'Acceso suspendido';const accessRole=entry.member?teamRoleLabels[entry.member.role]||entry.member.role:'Sin permiso';return p?(
              <article className={`ops-card person-hub-card${teamView==='list'?' is-list':''}`} key={p.id}>
                <header className="person-hub-head">
                  {canManageAccess&&entry.member&&!entry.member.removed_at&&entry.member.email!==currentEmail?<label className="select-check" title="Seleccionar integrante"><input type="checkbox" aria-label={`Seleccionar ${p.full_name}`} checked={selectedAccess.includes(String(entry.member.id))} onChange={()=>toggleAccessSelected(String(entry.member!.id))}/></label>:null}
                  <div className="ops-person">
                    <PersonContainer size={teamView==='list'?'md':'lg'} name={p.full_name} photoUrl={p.photo_url||undefined} secondary={entry.member?teamRoleLabels[entry.member.role]||entry.member.role:(p.job_title||'Sin cargo')} verified/>
                  </div>
                  <span className="person-hub-state" data-state={p.active?'active':'inactive'}>{p.active?'Activo':'Inactivo'}</span>
                </header>
                <dl className="person-hub-facts">
                  <div className="person-hub-fact-wide"><dt>Correo</dt><dd title={p.email||undefined}>{p.email||'Sin correo'}</dd></div>
                  <div><dt>Acceso</dt><dd title={`${accessRole} · ${accessState}`}>{accessRole} · {accessState}</dd></div>
                  <div><dt>Ingreso</dt><dd className="list-date">{listDateShort(p.started_on)||'Sin fecha'}</dd></div>
                </dl>
                <div className="person-hub-chips">
                  {salaryView&&!p.compensation_amount&&p.active?<span className="hub-chip warn" title="Sin salario definido: abrí Perfil y completá la remuneración.">Sin salario definido</span>:null}
                  <span className="person-hub-comp">{types.find(type=>type.value===p.compensation_type)?.label||'Sin modalidad'}</span>
                  {salaryView&&<span className="hub-chip">{p.payment_day?`Día de pago ${p.payment_day}`:'Día de pago sin definir'}</span>}
                  {salaryView&&p.invoices_company?<span className="hub-chip">Emite factura</span>:null}
                  {p.ended_on?<span className="hub-chip warn">Salió el {listDateShort(p.ended_on)}</span>:null}
                </div>
                {p.notes&&<p className="ops-note-preview" title={p.notes}>{p.notes}</p>}
                <div className="person-hub-tail"><TeamAccess member={entry.member} ambiguous={entry.ambiguous} email={p.email} role={role} refresh={load}/>
                {entry.ambiguous&&<p className="form-note">Hay perfiles con el mismo correo. Revisá sus datos antes de vincular accesos; no se combinaron sus pagos.</p>}
                <footer className="person-hub-actions">
                  <div className="person-hub-buttons">
                    <button className="text-button" onClick={() => setEdit(p)}>
                      <Pencil size={14} />
                      Perfil
                    </button>
                  </div>
                  <div className="ops-card-actions"><RemoveRecord kind="collaborators" id={p.id} name={p.full_name} role={role} done={load}/></div>
                </footer></div>
              </article>
            ):<article className={`ops-card person-hub-card${teamView==='list'?' is-list':''}`} key={entry.key}>
              <header className="person-hub-head">
                {canManageAccess&&entry.member&&entry.member.email!==currentEmail?<label className="select-check" title="Seleccionar integrante"><input type="checkbox" aria-label={`Seleccionar ${entry.member.full_name||entry.member.email}`} checked={selectedAccess.includes(String(entry.member.id))} onChange={()=>toggleAccessSelected(String(entry.member!.id))}/></label>:null}
                <div className="ops-person"><PersonContainer size={teamView==='list'?'md':'lg'} name={entry.member!.full_name||'Integrante sin ficha'} photoUrl={entry.member!.photo_url} verified/></div>
                <span className="person-hub-state" data-state={entry.member!.removed_at||!entry.member!.active?'inactive':'active'}>{entry.member!.removed_at?'Acceso retirado':entry.member!.active?'Acceso activo':'Acceso suspendido'}</span>
              </header>
              <dl className="person-hub-facts">
                <div className="person-hub-fact-wide"><dt>Correo</dt><dd title={entry.member!.email||undefined}>{entry.member!.email}</dd></div>
                <div><dt>Acceso</dt><dd title={`${accessRole} · ${accessState}`}>{accessRole} · {accessState}</dd></div>
              </dl>
              <div className="person-hub-chips"><span className="hub-chip muted">Sin ficha laboral: agregala para registrar remuneración, fechas y pagos.</span>{entry.ambiguous?<span className="hub-chip warn" title="Hay perfiles con el mismo correo. Revisá sus datos antes de vincular accesos; no se combinaron sus pagos.">Perfiles ambiguos</span>:null}</div>
              <div className="person-hub-tail"><TeamAccess member={entry.member} email={entry.member!.email} role={role} refresh={load}/>
              <footer className="person-hub-actions">
                <div className="person-hub-buttons">
                  {entry.archivedProfileId?<button className="text-button positive" onClick={async()=>{try{await api(`/api/agency/collaborators/${entry.archivedProfileId}/restore`,{});await load();}catch(e){setError(message(e));}}}><RotateCcw size={14}/>Restaurar perfil</button>:!entry.ambiguous?<button className="text-button" onClick={()=>{setSeedEmail(entry.member!.email);setEdit('new');}}><Plus size={14}/>Agregar ficha laboral</button>:<p>Hay varios perfiles con este correo. Revisalos en Equipo y Papelera.</p>}
                  <button className="text-button" onClick={()=>{setSeedEmail(entry.member!.email);setEdit('new');}}>
                    <Pencil size={14}/>
                    Editar
                  </button>
                </div>
              </footer></div>
            </article>;})}
            {!visiblePeople.length && (
              <EmptyBlock className="[grid-column:1/-1]" title={search?'Sin coincidencias':'Todavía no hay personas'} description={search?'Probá con otro nombre, correo o cargo.':'Agregá la primera persona del equipo para registrar accesos y remuneraciones.'} action={search?<button type="button" className="text-button" onClick={()=>setSearch('')}>Limpiar búsqueda</button>:null}/>
            )}
          </div>
        )}
      </section>
      {edit && (
        <Dialog
          title={person ? "Editar persona" : "Nueva persona"}
          close={() => setEdit(null)}
          size="wide"
        >
          <p className="form-note">
            {['owner','admin'].includes(role) ? 'Al guardar un colaborador activo con correo, vinculamos su acceso automáticamente. Si es nuevo, recibe una invitación con permiso de lectura; los accesos existentes conservan sus permisos.' : 'Administración debe autorizar el acceso al panel de los nuevos colaboradores.'}
            {person?' El estado laboral no revoca accesos existentes.':seedEmail?' El nombre y la foto se toman de su perfil personal; esta ficha agrega datos laborales.':''}
          </p>
          {!person&&members.find(member=>member.email===seedEmail)?.photo_url&&<PhotoViewer photo={members.find(member=>member.email===seedEmail)!.photo_url!} name={personDefaults.full_name}/>}
          {(person||(dialogMember&&!dialogMember.removed_at))&&<div className={`person-identity-panel${person?'':' is-single'}`}>
            <PersonPhotoField
              key={person?String(person.id):`member-${dialogMember?.id}`}
              photo={person?person.photo_url:dialogMember?.photo_url??null}
              name={person?person.full_name:dialogMember?.full_name||dialogMember?.email||'Integrante'}
              save={async value=>{
                if(person){const result=await api<{collaborator:Person}>(`/api/agency/collaborators/${person.id}`,{photo_url:value},'PATCH');await load();setEdit(result.collaborator);}
                else if(dialogMember){await api<{member:{photo_url:string}}>(`/api/agency/members/${dialogMember.id}/photo`,{photo_url:value},'PATCH');await load();}
              }}
            />
            {dialogMember&&!dialogMember.removed_at?<section className="ops-profile-section person-access-panel" aria-label="Acceso al panel">
              <h3>Acceso al panel</h3>
              <div className="person-access-body">
                <p className="form-note"><span className={`team-access-status ${dialogMember.active?'is-active':'is-suspended'}`}>{dialogMember.active?'Acceso habilitado':'Acceso suspendido'}</span></p>
                {accessDraft?<>
                  <div className="ops-form-grid">
                    <SelectCustom label="Permiso" choices={[...(role==='owner'?['owner']:[]),'admin','management','finance','sales','production','editor','viewer','collaborator'].map(v=>({value:v,label:teamRoleLabels[v]||v}))} value={accessDraft.role} onChange={value=>setAccessDraft(draft=>({...draft!,role:value}))}/>
                    <SelectCustom label="Acceso" choices={[{value:'true',label:'Activo'},{value:'false',label:'Suspendido'}]} value={accessDraft.active} onChange={value=>setAccessDraft(draft=>({...draft!,active:value}))}/>
                  </div>
                  <p className="form-note">El permiso y el acceso se guardan junto con el perfil. Cambiar permisos o suspender cierra las sesiones de esta persona en esta empresa.</p>
                  <div className="person-access-actions">
                    {dialogMember.active!==false&&<button type="button" className="secondary" disabled={accessBusy} onClick={async()=>{setAccessBusy(true);try{const d=await api<{emailSent:boolean}>(`/api/agency/members/${dialogMember.id}/resend`,{});setNotice(d.emailSent?'Invitación enviada.':'El proveedor no pudo enviar el correo.');}catch(e){setError(message(e));}finally{setAccessBusy(false);}}}>Reenviar invitación</button>}
                    <RemoveRecord kind="members" id={dialogMember.id} name={dialogMember.email} role={role} done={load}/>
                  </div>
                </>:<p className="form-note">Tu propio acceso se administra desde Mi perfil; el de otros dueños, desde Equipo.</p>}
              </div>
            </section>:person?<TeamAccess member={dialogMember} ambiguous={directory.find(entry=>entry.profile?.id===person.id)?.ambiguous} email={person.email} role={role} refresh={load}/>:null}
          </div>}
          <Editor
            columns
            fields={salaryView?personFields:personFields.filter(field=>!['compensation_amount','currency','payment_day','invoices_company'].includes(field.key))}
            defaults={personDefaults}
            save={async (v) => {
              const result = await api<{access?:{status:string;emailSent?:boolean}}>(
                `/api/agency/collaborators${person ? `/${person.id}` : ""}`,
                {
                  ...v,
                  ...(person?{invoices_company: v.invoices_company === "true"}:{}),
                  active: v.active === "true",
                },
                person ? "PATCH" : "POST",
              );
              if(accessDraft&&dialogMember)await api(`/api/agency/members/${dialogMember.id}`,{role:accessDraft.role,active:accessDraft.active==='true'},'PATCH');
              await done();
              if(result.access?.status==='suspended'){setNotice('Perfil guardado. Su acceso sigue suspendido; se administra desde Equipo.');return;}
              setNotice(result.access?.status==='invited' ? result.access.emailSent ? 'Colaborador guardado. Acceso habilitado e invitación enviada.' : 'Colaborador guardado y acceso habilitado. No se pudo enviar el correo; puede entrar con Google usando el correo registrado.' : result.access?.status==='linked' ? 'Perfil guardado y acceso vinculado.' : result.access?.status==='needs_admin' ? 'Perfil guardado. Administración debe habilitar el acceso.' : 'Perfil guardado.');
            }}
          />
        </Dialog>
      )}
      {permissionsOpen&&<PermissionsMatrix role={role} close={()=>setPermissionsOpen(false)}/>}
    </div>
  );
}


export function ProjectComments({
  projectId,
  name,
  role,
}: {
  projectId: string;
  name: string;
  role: string;
}) {
  const [open, setOpen] = useState(false),
    [comments, setComments] = useState<
      { id: string; body: string; author_email: string; created_at: string; actor_name?:string; actor_photo_url?:string; actor_verified?:boolean }[]
    >([]),
    [error, setError] = useState("");
  async function load() {
    setComments(
      (
        await api<{ comments: typeof comments }>(
          `/api/agency/projects/${projectId}/comments`,
        )
      ).comments,
    );
  }
  return (
    <>
      <button
        className="text-button"
        onClick={() => {
          setOpen(true);
          load().catch((e) => setError(message(e)));
        }}
      >
        <MessageSquare size={14} /> Comentarios
      </button>
      {open && (
        <Dialog title={`Seguimiento · ${name}`} close={() => setOpen(false)}>
          <ProjectPresence projectId={projectId}/>
          <div className="ops-comments">
            {comments.map((c) => (
              <article className="ops-comment" key={c.id}>
                <ActorIdentity name={c.actor_name||c.author_email||'Integrante'} photoUrl={c.actor_photo_url} verified={c.actor_verified===true} timestamp={c.created_at}/>
                <CommentBody value={c.body}/>
              </article>
            ))}
            {!comments.length && (
              <p className="empty-copy">
                Todavía no hay comentarios. Dejá el próximo paso o una
                actualización.
              </p>
            )}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {role !== "viewer" && (
            <CommentComposer
              label="Comentario"
              save={async (body,mentionedUserIds) => {
                await api(`/api/agency/projects/${projectId}/comments`, {body,mentioned_user_ids:mentionedUserIds});
                await load();
              }}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
export function CompanySelector({ name }: { name: string }) {
  const [companies, setCompanies] = useState<
      { id: string; name: string; role: string;isDemo?:boolean }[]
    >([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [preferred,setPreferred]=useState<string|null>(null);
  const preferenceLock=useRef(false);
  useEffect(() => {
    let generation=0,alive=true;
    const load=(initial=false)=>{const version=++generation;void api<{ organizations: typeof companies; defaultOrganizationId?:string|number|null }>("/api/auth/organizations")
      .then((d) => {
        if(!alive||version!==generation)return;
        // A demo is an isolated session opened only from the public landing.
        // It is never a company the person can browse to from a real workspace.
        const realCompanies=d.organizations.filter(company=>!company.isDemo);
        setCompanies(realCompanies);
        setPreferred(d.defaultOrganizationId&&realCompanies.some(company=>String(company.id)===String(d.defaultOrganizationId))?String(d.defaultOrganizationId):null);
        if (
          initial && realCompanies.length > 1 &&
          !d.defaultOrganizationId &&
          !sessionStorage.getItem("scale_company_selected")
        )
          setOpen(true);
      })
      .catch((e) => {if(alive&&version===generation)setError(message(e));});};
    load(true);const refresh=()=>load();window.addEventListener('scale:default-company-changed',refresh);
    return()=>{alive=false;generation++;window.removeEventListener('scale:default-company-changed',refresh);};
  }, []);
  return (
    <>
      <button className="workspace" title={name} onClick={() => setOpen(true)}>
        <Building2 size={16} />
        <span className="company-name">{name}</span>
      </button>
      {open && (
        <Dialog title="Elegí la empresa" close={() => setOpen(false)}>
          <p className="form-note">
            Solo aparecen las empresas que te dieron acceso.
          </p>
          <div className="ops-stack">
            {companies.map((c) => (
              <div key={c.id} className="company-choice-row">
              <button
                className="choice"
                disabled={busy}
                key={c.id}
                onClick={async () => {
                  if(preferenceLock.current)return;preferenceLock.current=true;
                  setBusy(true);
                  setError('');
                  try {
                    await api("/api/auth/switch-organization", {
                      organizationId: c.id,
                    });
                    try{sessionStorage.setItem("scale_company_selected", "1");}catch{/* Navigation must still complete. */}
                    window.location.assign("/");
                  } catch (e) {
                    setError(message(e));
                    setBusy(false);
                    preferenceLock.current=false;
                  }
                }}
              >
                {c.name} · {c.role}
              </button>
              {!c.isDemo&&<button type="button" className="text-button" disabled={busy||preferred===String(c.id)} onClick={async()=>{
                if(preferenceLock.current)return;preferenceLock.current=true;setBusy(true);setError('');
                try{await api('/api/auth/default-organization',{organizationId:c.id});setPreferred(String(c.id));window.dispatchEvent(new Event('scale:default-company-changed'));}
                catch(e){setError(message(e));}finally{preferenceLock.current=false;setBusy(false);}
              }}><Star size={14}/>{preferred===String(c.id)?'Predeterminada':'Usar al iniciar sesión'}</button>}
              </div>
            ))}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
