"use client";
import {currencyChoices} from "./currencies";
import {useCompanyCurrency} from './currency-provider';
import {ProjectPresence} from './presence';
import { useEffect, useMemo, useState, useRef, useId } from "react";
import {normalizeCommercialDashboard, type CommercialDashboard} from './control-center-data';
import {Dialog,FormActions,useDialogPending,useDialogClose} from "./dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Banknote, Building2, Check, MessageSquare, Pencil, Plus, RotateCcw, Star, X , CircleDollarSign } from "lucide-react";
import { AmountInput, SelectCustom } from './profile-controls';
import {ProfilePhoto} from './profile-photo';
import {DriveLinkNote} from './drive-link';
import {DriveLinksInput,parseDriveLinksText} from './drive-links';
import {RemoveRecord} from './archive-controls';
import {PhotoViewer} from './photo-viewer';
import {ActorIdentity,actorInitials} from './actor-identity';
import {PersonContainer} from './person-container';
import {CommentBody,CommentComposer} from './commenting';
import {notifyMutation} from './feedback';
import {teamDirectory,TeamMember,ArchivedProfile,teamRoleLabels} from './team-directory';
import {TeamAccess} from './team-access';
import {PermissionsMatrix} from './permissions-matrix';
import {dataFetch} from './data-cache';

export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const r = await dataFetch(`/core-api${path}`, {
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
const day = (v: string | null) => (v ? v.slice(0, 10) : "—");
export {Dialog} from './dialog';
type Choice = { value: string; label: string };
export type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "time" | "email" | "url" | "textarea" | "money" | "password";
  choices?: Choice[];
  optional?: boolean;
  section?: string;
  wide?: boolean;
  help?: string;
  integer?: boolean;
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
    if(f.integer)s=s.refine(value=>value===''||/^\d+$/.test(value),'Ingresá un importe entero.');
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
        ) : f.type === 'textarea' ? <textarea id={id} disabled={pending} aria-invalid={invalid||undefined} aria-describedby={describedBy} {...form.register(f.key)}/> : f.type === 'money' ? <AmountInput id={id} disabled={pending} invalid={invalid} describedBy={describedBy} value={form.watch(f.key)||''} currency={f.currency||derivedCurrency||form.watch(f.currencyKey||'currency')||'PYG'} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <span className={f.lookup?'ops-lookup-row':undefined}><input id={id} disabled={pending} aria-invalid={invalid||undefined} aria-describedby={describedBy} type={f.type||'text'} step={f.type === 'number' ? f.integer?'1':'0.01' : undefined} {...form.register(f.key)}/>{f.lookup&&<button type="button" className="text-button ops-lookup-button" disabled={pending||lookupBusy===f.key} onClick={()=>void runLookup(f)}>{lookupBusy===f.key?'Buscando…':f.lookup.label}</button>}</span>}
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
type Commission = {
  id: string;
  beneficiary_name: string;
  kind: string;
  status: string;
  amount: string;
  currency: string;
  percentage: string | null;
  basis: string;
  base_amount: string | null;
  invoice_number: string | null;
  due_on: string | null;
};
type MonthlyCommission = {
  recipient_id: string | null;
  name: string | null;
  currency: string;
  expected_amount: string | number;
  recorded_amount: string | number;
  approved_amount: string | number;
  paid_amount: string | number;
  pending_amount: string | number;
};
type Account = {
  id: string;
  name: string;
  currency: string;
  active: boolean;
  balance: string;
};
type Invoice = {
  id: string;
  number: string;
  client_name: string;
  currency: string;
  total: string;
  paid_amount: string;
};
type Payout = {
  id: string;
  collaborator_name: string | null;
  beneficiary_name: string | null;
  amount: string;
  currency: string;
  account_name: string;
  paid_on: string;
  reference: string;
};
const types = [
  { value: "fixed", label: "Fijo mensual" },
  { value: "variable", label: "Variable" },
  { value: "hourly", label: "Por hora" },
  { value: "per_project", label: "Por proyecto" },
];
const states: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  paid: "Pagada",
  cancelled: "Cancelada",
};
function salaryMonth(now=new Date()) {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).formatToParts(now);
 return `${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;
}
export function OperationsWorkspace({
  mode,
  role,
  currentEmail='',
  organizationName='',
  activeTab='people',
  onTabChange,
}: {
  mode: "people" | "commissions";
  role: string;
  currentEmail?:string;
  organizationName?:string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const {currency:defaultCurrency}=useCompanyCurrency();
  const [members,setMembers]=useState<TeamMember[]>([]),[archivedProfiles,setArchivedProfiles]=useState<ArchivedProfile[]>([]),[seedEmail,setSeedEmail]=useState(''),[search,setSearch]=useState('');
  const [people, setPeople] = useState<Person[]>([]),
    [commissions, setCommissions] = useState<Commission[]>([]),
    [accounts, setAccounts] = useState<Account[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [payouts, setPayouts] = useState<Payout[]>([]);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [edit, setEdit] = useState<Person | "new" | null>(null),
    [newCommission, setNewCommission] = useState(false),
    [pay, setPay] = useState<{
      person?: Person;
      commission?: Commission;
    } | null>(null),
    [filter, setFilter] = useState("all");
  const [commercial, setCommercial] = useState<CommercialDashboard | null>(null);
  const [teamView,setTeamView]=useState<'cards'|'list'>('cards');
  const [commissionMonth, setCommissionMonth] = useState(() => salaryMonth()),
    [monthlyCommissions, setMonthlyCommissions] = useState<MonthlyCommission[]>([]),
    [monthlyLoading, setMonthlyLoading] = useState(false),
    [monthlyRefresh, setMonthlyRefresh] = useState(0);
  const allowed = ["owner", "admin", "finance"].includes(role);
  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    setCommercial(null);
    void api<unknown>("/api/agency/control-center")
      .then(value => { if (alive) setCommercial(normalizeCommercialDashboard(value)); })
      .catch(() => { if (alive) setCommercial(null); });
    return () => { alive = false; };
  }, [allowed]);
  useEffect(() => {
    if (!allowed || mode !== "commissions") return;
    let alive = true;
    setMonthlyLoading(true);
    void api<{ month: string; records: MonthlyCommission[] }>(`/api/agency/commissions/monthly?month=${encodeURIComponent(commissionMonth)}`)
      .then(value => { if (alive) setMonthlyCommissions(value.records); })
      .catch(() => { if (alive) setMonthlyCommissions([]); })
      .finally(() => { if (alive) setMonthlyLoading(false); });
    return () => { alive = false; };
  }, [allowed, mode, commissionMonth, monthlyRefresh]);
  const salaryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    let defined = 0, missing = 0;
    for (const person of people) {
      if (!person.active) continue;
      const amount = Number(person.compensation_amount);
      if (person.compensation_type === "fixed" && Number.isFinite(amount) && amount > 0) {
        totals.set(person.currency, (totals.get(person.currency) || 0) + amount);
        defined += 1;
      } else {
        missing += 1;
      }
    }
    return { totals, defined, missing };
  }, [people]);
  const monthlyGap = useMemo(() => {
    if (!commercial?.expectedMonthlyBilling) return [];
    return commercial.expectedMonthlyBilling
      .filter(item => Number(item.total) > 0)
      .map(item => {
        const salary = salaryTotals.totals.get(item.currency) || 0;
        return { currency: item.currency, gap: Number(item.total) - salary };
      });
  }, [commercial, salaryTotals]);
  async function load() {
    const [p, c, a, i, x] = await Promise.all([
      api<{ collaborators: Person[];members?:TeamMember[];archivedProfiles?:ArchivedProfile[] }>(mode==='people'?"/api/agency/team":"/api/agency/collaborators"),
      mode==='commissions'?api<{ commissions: Commission[] }>("/api/agency/commissions"):Promise.resolve({commissions:[]}),
      api<{ accounts: Account[] }>("/api/agency/accounts"),
      mode==='commissions'?api<{ invoices: Invoice[] }>("/api/agency/invoices"):Promise.resolve({invoices:[]}),
      api<{ payouts: Payout[] }>("/api/agency/payouts"),
    ]);
    setPeople(p.collaborators);
    setMembers(p.members||[]);setArchivedProfiles(p.archivedProfiles||[]);
    setCommissions(c.commissions);
    setAccounts(a.accounts);
    setInvoices(i.invoices);
    setPayouts(x.payouts);
  }
  useEffect(() => {
    if (allowed)
      load()
        .catch((e) => setError(message(e)))
        .finally(() => setLoading(false));
  }, [allowed,mode]);
  useEffect(()=>{
    if(!allowed)return;
    const refreshIdentity=()=>{void load().catch(e=>setError(message(e)));};
    window.addEventListener('scale:identity-changed',refreshIdentity);
    return()=>window.removeEventListener('scale:identity-changed',refreshIdentity);
  },[allowed,mode]);
  async function done() {
    await load();
    setMonthlyRefresh(value => value + 1);
    setEdit(null);
    setNewCommission(false);
    setPay(null);
    setNotice("Guardado correctamente.");
  }
  async function state(c: Commission, status: string) {
    setError("");
    try {
      await api(`/api/agency/commissions/${c.id}`, { status }, "PATCH");
      await load();
    } catch (e) {
      setError(message(e));
    }
  }
  if (!allowed)
    return (
      <section className="panel">
        <h2>Información restringida</h2>
        <p>
          Solo administración y finanzas pueden ver remuneraciones y comisiones.
        </p>
      </section>
    );
  const person = edit && edit !== "new" ? edit : null;
  const empty = { value: "", label: "Sin vincular" };
  const personFields: Field[] = [
    { key: "full_name", label: "Nombre completo", section: 'Datos personales' },
    { key: "job_title", label: "Cargo", optional: true, section: 'Datos personales' },
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
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {mode === "people"
                ? "PERSONAS, ACCESOS Y REMUNERACIONES"
                : "VENTAS Y RECOMENDACIONES"}
            </p>
            <h2>
              {mode === "people" ? `Equipo${organizationName?' de '+organizationName:''}` : "Comisiones y referidos"}
            </h2>
          </div>
          <div className="inline-actions">
          {mode==='people'&&['owner','admin'].includes(role)&&<button className="secondary" onClick={()=>setPermissionsOpen(true)}>Permisos del panel</button>}
          <button
            className="primary"
            onClick={() =>
              mode === "people" ? (setSeedEmail(''),setEdit("new")) : setNewCommission(true)
            }
          >
            <Plus size={16} />
            {mode === "people" ? "Agregar persona" : "Comisión"}
          </button>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {mode==='people'&&<div className="kpi-strip" aria-label="Salarios y facturación estimada">
          <article className="kpi-card tone-brand">
            <p className="eyebrow">SALARIOS MENSUALES</p>
            {salaryTotals.totals.size?<div className="kpi-amounts">{Array.from(salaryTotals.totals).map(([currency,total])=><span key={currency}>{money(total,currency)}</span>)}</div>:<strong>Sin salarios definidos</strong>}
            <small>Suma de perfiles activos con salario fijo mensual</small>
          </article>
          <article className="kpi-card tone-green">
            <p className="eyebrow">PERFILES DE SALARIO</p>
            <strong>{salaryTotals.defined} definidos</strong>
            <small>{salaryTotals.missing} activos sin salario fijo mensual</small>
          </article>
          <article className="kpi-card tone-blue">
            <p className="eyebrow">FACTURACIÓN CONTRATADA</p>
            {commercial===null?<strong>Calculando…</strong>:commercial.expectedMonthlyBilling===undefined?<strong>No disponible</strong>:commercial.expectedMonthlyBilling.length?<div className="kpi-amounts">{commercial.expectedMonthlyBilling.map(item=><span key={item.currency}>{money(Number(item.total),item.currency)} / mes</span>)}</div>:<strong>Sin contratos activos</strong>}
            <small>{commercial?.expectedMonthlyBilling===undefined?'No disponible':commercial.expectedMonthlyBilling.length?'Expectativa comercial vigente por moneda':'Los contratos se activan en la ficha comercial del cliente: plan contratado y monto mensual.'}</small>
          </article>
          <article className="kpi-card tone-warning">
            <p className="eyebrow">RESULTADO MENSUAL</p>
            {monthlyGap.length?<div className="kpi-amounts">{monthlyGap.map(row=><span key={row.currency}>{money(row.gap,row.currency)}</span>)}</div>:<strong>Sin datos</strong>}
            <small>Facturación contratada menos salarios, por moneda</small>
          </article>
        </div>}
        {mode==='people'&&<div className="team-filters">
          <label className="team-search">
            <span>Buscar persona</span>
            <input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nombre, correo o cargo"/>
          </label>
          <div className="choice-list compact">
            <button className={!search?'choice active':'choice'} onClick={()=>setSearch('')}>Todos</button>
            <button className={search==='activo'?'choice active':'choice'} onClick={()=>setSearch('activo')}>Activos</button>
            <button className={search==='inactivo'?'choice active':'choice'} onClick={()=>setSearch('inactivo')}>Inactivos</button>
          </div>
          <div className="team-view-toggle" role="group" aria-label="Vista del equipo">
            <button type="button" className={teamView==='cards'?'is-active':undefined} aria-pressed={teamView==='cards'} onClick={()=>setTeamView('cards')}>Tarjetas</button>
            <button type="button" className={teamView==='list'?'is-active':undefined} aria-pressed={teamView==='list'} onClick={()=>setTeamView('list')}>Lista</button>
          </div>
        </div>}
        {loading ? (
          <p>Cargando…</p>
        ) : mode === "people" ? (
          <div className="ops-grid">
            {visiblePeople.map((entry) => {const p=entry.profile;const accessState=!entry.member?'Sin acceso al panel':entry.member.removed_at?'Acceso retirado':entry.member.active?'Acceso habilitado':'Acceso suspendido';const accessRole=entry.member?teamRoleLabels[entry.member.role]||entry.member.role:'Sin permiso';return p?(
              <article className={`ops-card person-hub-card${teamView==='list'?' is-list':''}`} key={p.id}>
                <header className="person-hub-head">
                  <div className="ops-person">
                    {p.photo_url ? (
                      <PhotoViewer photo={p.photo_url} name={p.full_name}/>
                    ) : (
                      <span className="avatar">{actorInitials(p.full_name)}</span>
                    )}
                    <div>
                      <h3>{p.full_name}{!p.compensation_amount&&p.active?<span className="client-price-missing" title="Sin salario definido: abrí Perfil y completá la remuneración."><CircleDollarSign size={14} aria-label="Sin salario definido"/></span>:null}</h3>
                      <small>{p.job_title||(entry.member?teamRoleLabels[entry.member.role]||entry.member.role:'Sin cargo')}</small>
                    </div>
                  </div>
                  <span className="person-hub-state" data-state={p.active?'active':'inactive'}>{p.active?'Activo':'Inactivo'}</span>
                </header>
                <dl className="person-hub-facts">
                  <div><dt>Correo</dt><dd title={p.email||undefined}>{p.email||'Sin correo'}</dd></div>
                  <div><dt>Acceso</dt><dd title={accessState}>{accessRole} · {accessState}</dd></div>
                  <div><dt>Ingreso</dt><dd>{p.started_on?p.started_on.slice(0,10):'Sin fecha'}</dd></div>
                  <div><dt>Día de pago</dt><dd>{p.payment_day?`Día ${p.payment_day}`:'Sin definir'}</dd></div>
                </dl>
                <div className="person-hub-chips">
                  <span className="person-hub-comp">{types.find(type=>type.value===p.compensation_type)?.label||'Sin modalidad'}{p.compensation_amount?<b>{money(p.compensation_amount,p.currency)}</b>:<em>Sin importe acordado</em>}</span>
                  {p.invoices_company?<span className="hub-chip">Emite factura</span>:null}
                  {p.ended_on?<span className="hub-chip warn">Salió el {p.ended_on.slice(0,10)}</span>:null}
                </div>
                {p.notes&&<p className="ops-note-preview">{p.notes}</p>}
                <TeamAccess member={entry.member} ambiguous={entry.ambiguous} email={p.email} role={role} currentEmail={currentEmail} refresh={load}/>
                {entry.ambiguous&&<p className="form-note">Hay perfiles con el mismo correo. Revisá sus datos antes de vincular accesos; no se combinaron sus pagos.</p>}
                <footer className="person-hub-actions">
                  <div className="person-hub-buttons">
                    <button className="text-button" onClick={() => setEdit(p)}>
                      <Pencil size={14} />
                      Perfil
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setPay({ person: p })}
                    >
                      <Banknote size={14} />
                      Pagar
                    </button>
                  </div>
                  <div className="ops-card-actions"><RemoveRecord kind="collaborators" id={p.id} name={p.full_name} role={role} done={load}/></div>
                </footer>
              </article>
            ):<article className={`ops-card person-hub-card${teamView==='list'?' is-list':''}`} key={entry.key}>
              <header className="person-hub-head">
                <div className="ops-person"><PersonContainer size="lg" name={entry.member!.full_name||'Integrante sin ficha'} photoUrl={entry.member!.photo_url} verified/></div>
                <span className="person-hub-state" data-state={entry.member!.active?'active':'inactive'}>{entry.member!.active?'Acceso activo':'Acceso suspendido'}</span>
              </header>
              <dl className="person-hub-facts">
                <div><dt>Correo</dt><dd>{entry.member!.email}</dd></div>
                <div><dt>Acceso</dt><dd title={accessState}>{accessRole} · {accessState}</dd></div>
              </dl>
              <div className="person-hub-chips"><span className="hub-chip muted">Sin ficha laboral: agregala para registrar remuneración, fechas y pagos.</span></div>
              <TeamAccess member={entry.member} email={entry.member!.email} role={role} currentEmail={currentEmail} refresh={load}/>
              <footer className="person-hub-actions">
                <div className="person-hub-buttons">
                  {entry.archivedProfileId?<button className="text-button positive" onClick={async()=>{try{await api(`/api/agency/collaborators/${entry.archivedProfileId}/restore`,{});await load();}catch(e){setError(message(e));}}}><RotateCcw size={14}/>Restaurar perfil</button>:!entry.ambiguous?<button className="text-button" onClick={()=>{setSeedEmail(entry.member!.email);setEdit('new');}}><Plus size={14}/>Agregar ficha laboral</button>:<p>Hay varios perfiles con este correo. Revisalos en Equipo y Papelera.</p>}
                  <button className="text-button" onClick={()=>{setSeedEmail(entry.member!.email);setEdit('new');}}>
                    <Pencil size={14}/>
                    Editar
                  </button>
                </div>
              </footer>
            </article>;})}
            {!visiblePeople.length && (
              <p className="empty-copy">
                {search?'No hay personas que coincidan con la búsqueda.':'Agregá la primera persona del equipo.'}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="commission-settlement">
              <div className="panel-heading">
                <h3>Comisiones del mes por colaborador</h3>
                <label>
                  Mes
                  <input type="month" value={commissionMonth} min="1900-01" max="9998-12" onChange={event => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value)) setCommissionMonth(event.target.value); }} />
                </label>
              </div>
              <p className="form-note">
                Esperado: acuerdos comerciales vigentes con comisión asignada. Registrado, aprobado, pagado y pendiente: comisiones del mes según la fecha de la factura vinculada.
              </p>
              {monthlyLoading ? <p role="status">Cargando comisiones del mes…</p> : monthlyCommissions.length ? (
                <div className="settlement-table" aria-label="Comisiones del mes por colaborador">
                  <div className="settlement-head" aria-hidden="true"><span>Colaborador</span><span>Esperado</span><span>Registrado</span><span>Aprobado</span><span>Pagado</span><span>Pendiente</span></div>
                  {monthlyCommissions.map(row => (
                    <div className="settlement-row" key={`${row.recipient_id ?? `unlinked-${row.name ?? ""}`}-${row.currency}`}>
                      <div className="settlement-name"><b>{row.name || "Sin colaborador vinculado"}</b><small>{row.currency}</small></div>
                      <strong data-label="Esperado" className="settlement-value">{money(row.expected_amount, row.currency)}</strong>
                      <strong data-label="Registrado" className="settlement-value">{money(row.recorded_amount, row.currency)}</strong>
                      <strong data-label="Aprobado" className="settlement-value">{money(row.approved_amount, row.currency)}</strong>
                      <strong data-label="Pagado" className="settlement-value">{money(row.paid_amount, row.currency)}</strong>
                      <strong data-label="Pendiente" className="settlement-value">{money(row.pending_amount, row.currency)}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="empty-copy">Sin comisiones ni acuerdos comerciales para este mes.</p>}
            </div>
            <div className="choice-list compact">
              {["all", "pending", "approved", "paid", "cancelled"].map((s) => (
                <button
                  className={filter === s ? "choice active" : "choice"}
                  key={s}
                  onClick={() => setFilter(s)}
                >
                  {s === "all" ? "Todas" : states[s]}
                </button>
              ))}
            </div>
            <div className="ops-grid">
              {commissions
                .filter((c) => filter === "all" || c.status === filter)
                .map((c) => (
                  <article className="ops-card commission-hub-card" key={c.id}>
                    <header className="commission-hub-head">
                      <span className="hub-chip">{c.kind === "sales" ? "Venta" : "Referido"}</span>
                      <span className="commission-state" data-status={c.status}>{states[c.status]}</span>
                    </header>
                    <h3>{c.beneficiary_name}</h3>
                    <strong className="commission-hub-amount">{money(c.amount, c.currency)}</strong>
                    <dl className="commission-hub-facts">
                      <div><dt>Factura</dt><dd>{c.invoice_number || "Sin factura vinculada"}</dd></div>
                      <div><dt>Vence</dt><dd>{day(c.due_on)}</dd></div>
                    </dl>
                    <p className="form-note">
                      {c.basis === "fixed"
                        ? "Importe fijo"
                        : `${c.percentage}% sobre ${money(c.base_amount || 0, c.currency)} ${c.basis === "collected" ? "cobrados" : "facturados"} al registrar`}
                    </p>
                    <div className="commission-hub-actions inline-actions">
                      {c.status === "pending" && (
                        <button
                          className="text-button positive"
                          onClick={() => state(c, "approved")}
                        >
                          <Check size={14} />
                          Aprobar
                        </button>
                      )}
                      {c.status === "approved" && (
                        <button
                          className="text-button"
                          onClick={() => setPay({ commission: c })}
                        >
                          <Banknote size={14} />
                          Registrar pago
                        </button>
                      )}
                      {["pending", "approved"].includes(c.status) && (
                        <button
                          className="text-button danger"
                          onClick={() => state(c, "cancelled")}
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                      )}
                    </div>
                  </article>
                ))}
            </div>
            {!commissions.length && (
              <p className="empty-copy">
                Registrá una comisión por venta o por recomendar un cliente.
              </p>
            )}
            <p className="form-note">
              Los porcentajes se calculan al registrar la comisión. Los cobros
              posteriores no modifican acuerdos ya registrados.
            </p>
          </>
        )}
      </section>
      {mode === "commissions" && <ReferralDiscounts />}
      <section className="panel">
        <h2>Pagos registrados</h2>
        <p className="form-note">
          Cada pago descuenta el saldo de la cuenta elegida.
        </p>
        {payouts
          .filter((p) =>
            mode === "people" ? p.collaborator_name : p.beneficiary_name,
          )
          .map((p) => (
            <div className="payment-row" key={p.id}>
              <div>
                <b>{p.collaborator_name || p.beneficiary_name}</b>
                <small>
                  {day(p.paid_on)} · {p.account_name} · {p.reference}
                </small>
              </div>
              <strong>{money(p.amount, p.currency)}</strong>
            </div>
          ))}
        {!payouts.length && (
          <p className="empty-copy">Todavía no hay egresos registrados.</p>
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
            {person&&<ProfilePhoto compact key={person.id} photo={person.photo_url} name={person.full_name} save={async photo=>{
              const result=await api<{collaborator:Person}>(`/api/agency/collaborators/${person.id}`,{photo_url:photo},'PATCH');
              await load();setEdit(result.collaborator);
            }}/>}
            {!person&&dialogMember&&<ProfilePhoto compact key={dialogMember.id} photo={dialogMember.photo_url||null} name={dialogMember.full_name||dialogMember.email} save={async photo=>{
              await api<{member:{photo_url:string}}>(`/api/agency/members/${dialogMember.id}/photo`,{photo_url:photo},'PATCH');
              await load();
            }}/>}
            {dialogMember&&!dialogMember.removed_at?<section className="ops-profile-section person-access-panel" aria-label="Acceso al panel">
              <h3>Acceso al panel</h3>
              <div className="person-access-body">
                <p className="form-note"><span className={`team-access-status ${dialogMember.active?'is-active':'is-suspended'}`}>{dialogMember.active?'Acceso habilitado':'Acceso suspendido'}</span></p>
                {accessDraft?<>
                  <div className="ops-form-grid">
                    <SelectCustom label="Permiso" choices={[...(role==='owner'?['owner']:[]),'admin','management','finance','sales','production','editor','viewer'].map(v=>({value:v,label:teamRoleLabels[v]||v}))} value={accessDraft.role} onChange={value=>setAccessDraft(draft=>({...draft!,role:value}))}/>
                    <SelectCustom label="Acceso" choices={[{value:'true',label:'Activo'},{value:'false',label:'Suspendido'}]} value={accessDraft.active} onChange={value=>setAccessDraft(draft=>({...draft!,active:value}))}/>
                  </div>
                  <p className="form-note">El permiso y el acceso se guardan junto con el perfil. Cambiar permisos o suspender cierra las sesiones de esta persona en esta empresa.</p>
                  {dialogMember.active!==false&&<button type="button" className="secondary" disabled={accessBusy} onClick={async()=>{setAccessBusy(true);try{const d=await api<{emailSent:boolean}>(`/api/agency/members/${dialogMember.id}/resend`,{});setNotice(d.emailSent?'Invitación enviada.':'El proveedor no pudo enviar el correo.');}catch(e){setError(message(e));}finally{setAccessBusy(false);}}}>Reenviar invitación</button>}
                </>:<p className="form-note">Tu propio acceso se administra desde Mi perfil; el de otros dueños, desde Equipo.</p>}
              </div>
            </section>:person?<TeamAccess member={dialogMember} ambiguous={directory.find(entry=>entry.profile?.id===person.id)?.ambiguous} email={person.email} role={role} currentEmail={currentEmail} refresh={load}/>:null}
          </div>}
          <Editor
            columns
            fields={personFields}
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
      {newCommission && (
        <Dialog
          title="Nueva comisión o referido"
          close={() => setNewCommission(false)}
        >
          <Editor
            fields={[
              { key: "beneficiary_name", label: "Beneficiario" },
              {
                key: "kind",
                label: "Origen",
                section: 'Qué se comisiona',
                choices: [
                  { value: "sales", label: "Venta" },
                  { value: "referral", label: "Referido" },
                ],
              },
              {
                key: "basis",
                label: "Cálculo",
                section: 'Qué se comisiona',
                choices: [
                  { value: "fixed", label: "Importe fijo" },
                  { value: "invoiced", label: "% facturado" },
                  { value: "collected", label: "% cobrado" },
                ],
              },
              {
                key: "amount",
                label: "Importe (para importe fijo)",
                type: "money",
                section: 'Qué se comisiona',
              },
              {
                key: "percentage",
                label: "Porcentaje (para cálculo %)",
                type: "number",
                optional: true,
                section: 'Qué se comisiona',
              },
              {
                key: "currency",
                label: "Moneda (se usa la de la factura si se vincula)",
                choices: currencies,
                section: 'Qué se comisiona',
              },
              {
                key: "collaborator_id",
                label: "Vincular colaborador",
                optional: true,
                section: 'Referencia',
                choices: [
                  empty,
                  ...people.map((p) => ({ value: p.id, label: p.full_name })),
                ],
              },
              {
                key: "invoice_id",
                label: "Factura de referencia",
                optional: true,
                section: 'Referencia',
                choices: [
                  empty,
                  ...invoices.map((i) => ({
                    value: i.id,
                    label: `${i.number} · ${i.client_name}`,
                  })),
                ],
              },
              {
                key: "due_on",
                label: "Vencimiento",
                type: "date",
                optional: true,
                section: 'Referencia',
              },
              {
                key: "notes",
                label: "Cliente referido / condiciones",
                type: "textarea",
                optional: true,
                section: 'Referencia',
              },
            ]}
            defaults={{
              beneficiary_name: "",
              kind: "sales",
              collaborator_id: "",
              invoice_id: "",
              basis: "fixed",
              amount: "0",
              percentage: "",
              currency: defaultCurrency,
              due_on: "",
              notes: "",
            }}
            save={async (v) => {
              await api("/api/agency/commissions", v);
              await done();
            }}
          />
        </Dialog>
      )}
      {pay && (
        <Dialog
          title={`Registrar pago · ${pay.person?.full_name || pay.commission?.beneficiary_name}`}
          close={() => setPay(null)}
        >
          <Editor
            fields={[
              {
                key: "account_id",
                label: "Cuenta de salida",
                choices: accounts
                  .filter(
                    (a) =>
                      a.active &&
                      a.currency ===
                        (pay.person?.currency || pay.commission?.currency),
                  )
                  .map((a) => ({
                    value: a.id,
                    label: `${a.name} · ${money(a.balance, a.currency)}`,
                  })),
              },
              {
                key: "amount",
                label: pay.commission
                  ? "Importe de la comisión (se conserva el aprobado)"
                  : "Importe pagado",
                type: "money",
                currency: pay.person?.currency || pay.commission?.currency || "PYG",
              },
              { key: "paid_on", label: "Fecha", type: "date" },
              { key: "reference", label: "Comprobante / período / referencia" },
            ]}
            defaults={{
              account_id: "",
              amount:
                pay.person?.compensation_amount ||
                pay.commission?.amount ||
                "0",
              paid_on: new Date().toISOString().slice(0, 10),
              reference: "",
            }}
            label="Confirmar pago"
            save={async (v) => {
              await api("/api/agency/payouts", {
                ...v,
                collaborator_id: pay.person?.id,
                commission_id: pay.commission?.id,
              });
              await done();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}


type ReferralDiscount = {
  id: string; referrer: string; amount: string; currency: string;
  reason: string; status: string; invoice_number: string; client_name: string;
};
function ReferralDiscounts() {
  const [items, setItems] = useState<ReferralDiscount[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  async function load() {
    const [discounts, bills] = await Promise.all([
      api<{ discounts: ReferralDiscount[] }>("/api/agency/referral-discounts"),
      api<{ invoices: Invoice[] }>("/api/agency/invoices"),
    ]);
    setItems(discounts.discounts); setInvoices(bills.invoices);
  }
  useEffect(() => { void load().catch(e => setError(message(e))); }, []);
  return <section className="panel">
    <div className="panel-heading"><h2>Descuentos por referido</h2>
      <button className="primary" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo descuento</button>
    </div>
    <p className="form-note">Se descuenta del saldo pendiente de la factura. Conservamos el motivo y el historial de reversiones.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {!items.length && <p className="empty-copy">Todavía no hay descuentos registrados.</p>}
    {items.map(item => <article className="payment-row" key={item.id}>
      <div><b>{item.referrer} · {money(item.amount, item.currency)}</b>
        <small>{item.invoice_number} · {item.client_name}</small><small>{item.reason}</small>
        <small>{item.status === "applied" ? "Aplicado" : "Revertido"}</small>
      </div>
      {item.status === "applied" && <button className="secondary" disabled={busy !== null} onClick={async () => {
        setBusy(item.id); setError("");
        try { await api(`/api/agency/referral-discounts/${item.id}`, {}, "PATCH"); await load(); }
        catch(e) { setError(message(e)); } finally { setBusy(null); }
      }}>{busy === item.id ? "Revirtiendo…" : "Revertir descuento"}</button>}
    </article>)}
    {open && <Dialog title="Descuento por referido" close={() => setOpen(false)}>
      <Editor fields={[
        { key: "invoice_id", label: "Factura", choices: invoices.filter(i => Number(i.total) > Number(i.paid_amount)).map(i => ({ value: i.id, label: `${i.number} · ${i.client_name} · pendiente ${money(Number(i.total)-Number(i.paid_amount), i.currency)}` })) },
        { key: "referrer", label: "Quién refirió al cliente" },
        { key: "amount", label: "Descuento en la moneda de la factura", type: "money", currencyFrom: values => invoices.find(i => String(i.id) === values.invoice_id)?.currency || "PYG" },
        { key: "reason", label: "Motivo o acuerdo", type: "textarea" },
      ]} defaults={{invoice_id: "", referrer: "", amount: "", reason: ""}} label="Aplicar descuento" save={async values => {
        await api("/api/agency/referral-discounts", values); await load(); setOpen(false);
      }} />
    </Dialog>}
  </section>;
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
          {error && <p className="error">{error}</p>}
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
          {error && <p className="error">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
