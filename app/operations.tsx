"use client";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, MessageSquare, Building2 } from "lucide-react";
import { AmountInput, SelectCustom } from './profile-controls';
import {ProfilePhoto} from './profile-photo';
import {DriveLinkNote} from './drive-link';
import {RemoveRecord} from './archive-controls';
import {PhotoViewer} from './photo-viewer';
import {notifyMutation} from './feedback';

export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const r = await fetch(`/core-api${path}`, {
    credentials: "include",
    method: body === undefined ? "GET" : method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "No se pudo completar la operación");
  notifyMutation(path,body===undefined?'GET':method,body,data);
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
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    panel.current?.querySelector<HTMLElement>('button,input,textarea')?.focus();
    const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea,a[href]')||[]);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
    document.addEventListener('keydown',trap);return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',trap);previous?.focus();};
  },[]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [close]);
  return createPortal(
    <div className="ops-overlay">
      <section
        ref={panel}
        className="ops-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="panel-heading">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
type Choice = { value: string; label: string };
export type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "email" | "url" | "textarea" | "money" | "password";
  choices?: Choice[];
  optional?: boolean;
  section?: string;
  wide?: boolean;
};
const currencies = [
  { value: "PYG", label: "Guaraníes" },
  { value: "USD", label: "Dólares" },
];
export function Editor({
  fields,
  defaults,
  save,
  label = "Guardar",
  columns = false,
}: {
  fields: Field[];
  defaults: Record<string, string>;
  save: (v: Record<string, string>) => Promise<void>;
  label?: string;
  columns?: boolean;
}) {
  const shape: Record<string, z.ZodString> = {};
  for (const f of fields) {
    let s = z.string();
    if (!f.optional) s = s.min(1, `Completá ${f.label.toLowerCase()}`);
    shape[f.key] = s;
  }
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(z.object(shape)),
    defaultValues: defaults,
  });
  const [error, setError] = useState("");
  const renderField = (f: Field) => <div key={f.key} className={f.wide || f.type === 'textarea' ? 'ops-wide' : undefined}>
    {f.choices ? <SelectCustom label={f.label} choices={f.choices} value={form.watch(f.key)||''} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <label>{f.key==='drive_url'?'Enlace de archivo o carpeta de Drive':f.label}
      {f.type === 'textarea' ? <textarea {...form.register(f.key)}/> : f.type === 'money' ? <AmountInput value={form.watch(f.key)||''} currency={form.watch('currency')||'PYG'} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <input type={f.type||'text'} step={f.type === 'number' ? '0.01' : undefined} {...form.register(f.key)}/>}
    </label>}
    {form.formState.errors[f.key]&&<small className="error" role="alert">{String(form.formState.errors[f.key]?.message)}</small>}
  </div>;
  return (
    <form
      className={columns ? "form-stack ops-form-grid" : "form-stack"}
      noValidate
      onSubmit={form.handleSubmit(async (v) => {
        setError("");
        try {
          await save(v);
        } catch (e) {
          setError(message(e));
        }
      })}
    >
      {fields.some(f=>f.key==='drive_url')&&<div className="ops-wide"><DriveLinkNote/></div>}
      {fields.filter(f=>!f.section).map(renderField)}
      {Array.from(new Set(fields.map(f=>f.section).filter((s):s is string=>Boolean(s)))).map(section=><details className="ops-profile-section ops-wide" key={section} open={fields.some(f=>f.section===section&&form.formState.errors[f.key])||undefined}>
        <summary>{section}</summary><div className="ops-form-grid">{fields.filter(f=>f.section===section).map(renderField)}</div>
      </details>)}
      {error && (
        <p className="error ops-wide" role="alert">
          {error}
        </p>
      )}
      <button className="primary ops-wide" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Guardando…" : label}
      </button>
    </form>
  );
}
type Person = {
  id: string;
  full_name: string;
  email: string | null;
  photo_url: string | null;
  job_title: string | null;
  job_role_id: string | null;
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
type JobRole = { id: string; name: string; active: boolean };
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
export function OperationsWorkspace({
  mode,
  role,
}: {
  mode: "people" | "commissions";
  role: string;
}) {
  const [people, setPeople] = useState<Person[]>([]),
    [commissions, setCommissions] = useState<Commission[]>([]),
    [accounts, setAccounts] = useState<Account[]>([]),
    [invoices, setInvoices] = useState<Invoice[]>([]),
    [payouts, setPayouts] = useState<Payout[]>([]),
    [jobs, setJobs] = useState<JobRole[]>([]);
  const [manageJobs, setManageJobs] = useState(false);
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
  const allowed = ["owner", "admin", "finance"].includes(role);
  async function load() {
    const [p, c, a, i, x, j] = await Promise.all([
      api<{ collaborators: Person[] }>("/api/agency/collaborators"),
      api<{ commissions: Commission[] }>("/api/agency/commissions"),
      api<{ accounts: Account[] }>("/api/agency/accounts"),
      api<{ invoices: Invoice[] }>("/api/agency/invoices"),
      api<{ payouts: Payout[] }>("/api/agency/payouts"),
      api<{ roles: JobRole[] }>("/api/agency/job-roles"),
    ]);
    setPeople(p.collaborators);
    setCommissions(c.commissions);
    setAccounts(a.accounts);
    setInvoices(i.invoices);
    setPayouts(x.payouts);
    setJobs(j.roles);
  }
  useEffect(() => {
    if (allowed)
      load()
        .catch((e) => setError(message(e)))
        .finally(() => setLoading(false));
  }, [allowed]);
  async function done() {
    await load();
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
    { key: "full_name", label: "Nombre completo" },
    {
      key: "email",
      label: "Correo de contacto",
      type: "email",
      optional: true,
    },
    { key: "job_role_id", label: "Cargo o servicio", optional: true, choices: [{value:'',label:'Sin definir'},...jobs.filter(j=>j.active||String(j.id)===String(person?.job_role_id)).map(j=>({value:String(j.id),label:j.name+(j.active?'':' (archivado)')}))] },
    {
      key: "active", label: "Estado", choices: [
        { value: "true", label: "Activo" }, { value: "false", label: "Inactivo" },
      ],
    },
    { key: "notes", label: "Condiciones y notas", type: "textarea", optional: true },
    { key: "compensation_type", label: "Modalidad", choices: types, section: 'Remuneración y pagos' },
    { key: "currency", label: "Moneda", choices: currencies, section: 'Remuneración y pagos' },
    { key: "compensation_amount", label: "Importe acordado", type: "money", section: 'Remuneración y pagos' },
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
      key: "started_on",
      label: "Fecha de ingreso",
      type: "date",
      optional: true,
      section: 'Imagen y fechas',
    },
    { key: "ended_on", label: "Fecha de salida", type: "date", optional: true, section: 'Imagen y fechas' },
    {
      key: "payment_day",
      label: "Día de pago (1–31)",
      type: "number",
      optional: true,
      section: 'Remuneración y pagos',
    },
  ];
  const personDefaults: Record<string, string> = {
    full_name: person?.full_name || "",
    email: person?.email || "",
    job_role_id: person?.job_role_id ? String(person.job_role_id) : "",
    compensation_type: person?.compensation_type || "fixed",
    compensation_amount: person?.compensation_amount || "0",
    currency: person?.currency || "PYG",
    invoices_company: String(person?.invoices_company || false),
    started_on: person?.started_on?.slice(0, 10) || "",
    ended_on: person?.ended_on?.slice(0, 10) || "",
    payment_day: String(person?.payment_day || ""),
    active: String(person?.active ?? true),
    notes: person?.notes || "",
  };
  return (
    <div className="ops-stack">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">
              {mode === "people"
                ? "PERSONAS Y REMUNERACIONES"
                : "VENTAS Y RECOMENDACIONES"}
            </p>
            <h2>
              {mode === "people" ? "Tu equipo" : "Comisiones y referidos"}
            </h2>
          </div>
          <div className="inline-actions">
          {mode==='people'&&['owner','admin'].includes(role)&&<button className="secondary" onClick={()=>setManageJobs(true)}>Gestionar cargos</button>}
          <button
            className="primary"
            onClick={() =>
              mode === "people" ? setEdit("new") : setNewCommission(true)
            }
          >
            <Plus size={16} />
            {mode === "people" ? "Colaborador" : "Comisión"}
          </button>
          </div>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {loading ? (
          <p>Cargando…</p>
        ) : mode === "people" ? (
          <div className="ops-grid">
            {people.map((p) => (
              <article className="ops-card ops-person-card" key={p.id}>
                <div className="ops-person">
                  {p.photo_url ? (
                    <PhotoViewer photo={p.photo_url} name={p.full_name}/>
                  ) : (
                    <span className="avatar">{p.full_name[0]}</span>
                  )}
                  <div>
                    <h3>{p.full_name}</h3>
                    <small>
                      {p.job_title || "Sin cargo"} ·{" "}
                      {p.active ? "Activo" : "Inactivo"}
                    </small>
                  </div>
                </div>
                <p>{p.email || "Sin correo de contacto"}</p>
                {p.notes&&<p className="ops-note-preview">{p.notes}</p>}
                <p>
                  {p.access_email
                    ? "Acceso al panel vinculado"
                    : "Sin acceso vinculado al panel"}
                </p>
                <div className="inline-actions">
                  <button className="text-button" onClick={() => setEdit(p)}>
                    Ver perfil
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setPay({ person: p })}
                  >
                    Registrar pago
                  </button>
                  <RemoveRecord kind="collaborators" id={p.id} name={p.full_name} role={role} done={load}/>
                </div>
              </article>
            ))}
            {!people.length && (
              <p className="empty-copy">
                Agregá el primer colaborador y sus condiciones de pago.
              </p>
            )}
          </div>
        ) : (
          <>
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
                  <article className="ops-card" key={c.id}>
                    <p className="eyebrow">
                      {c.kind === "sales" ? "Venta" : "Referido"} ·{" "}
                      {states[c.status]}
                    </p>
                    <h3>{c.beneficiary_name}</h3>
                    <strong>{money(c.amount, c.currency)}</strong>
                    <p>
                      {c.invoice_number || "Sin factura vinculada"} · Vence{" "}
                      {day(c.due_on)}
                    </p>
                    <p>
                      {c.basis === "fixed"
                        ? "Importe fijo"
                        : `${c.percentage}% sobre ${money(c.base_amount || 0, c.currency)} ${c.basis === "collected" ? "cobrados" : "facturados"} al registrar`}
                    </p>
                    <div className="inline-actions">
                      {c.status === "pending" && (
                        <button
                          className="text-button"
                          onClick={() => state(c, "approved")}
                        >
                          Aprobar
                        </button>
                      )}
                      {c.status === "approved" && (
                        <button
                          className="text-button"
                          onClick={() => setPay({ commission: c })}
                        >
                          Registrar pago
                        </button>
                      )}
                      {["pending", "approved"].includes(c.status) && (
                        <button
                          className="text-button"
                          onClick={() => state(c, "cancelled")}
                        >
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
          title={person ? person.full_name : "Nuevo colaborador"}
          close={() => setEdit(null)}
        >
          <p className="form-note">
            {['owner','admin'].includes(role) ? 'Al guardar un colaborador activo con correo, vinculamos su acceso automáticamente. Si es nuevo, recibe una invitación con permiso de lectura; los accesos existentes conservan sus permisos.' : 'Administración debe autorizar el acceso al panel de los nuevos colaboradores.'}
            {person&&' El estado laboral no revoca accesos existentes.'}
          </p>
          {person&&<ProfilePhoto key={person.id} photo={person.photo_url} name={person.full_name} save={async photo=>{
            const result=await api<{collaborator:Person}>(`/api/agency/collaborators/${person.id}`,{photo_url:photo},'PATCH');
            await load();setEdit(result.collaborator);
          }}/>}
          <Editor
            columns
            fields={person ? personFields : personFields.filter(f=>!f.section)}
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
              await done();
              if(result.access?.status==='suspended'){setNotice('Perfil guardado. Su acceso sigue suspendido; se administra desde Equipo.');return;}
              setNotice(result.access?.status==='invited' ? result.access.emailSent ? 'Colaborador guardado. Acceso habilitado e invitación enviada.' : 'Colaborador guardado y acceso habilitado. No se pudo enviar el correo; puede entrar con Google usando el correo registrado.' : result.access?.status==='linked' ? 'Perfil guardado y acceso vinculado.' : result.access?.status==='needs_admin' ? 'Perfil guardado. Administración debe habilitar el acceso.' : 'Perfil guardado.');
            }}
          />
        </Dialog>
      )}
      {manageJobs&&<JobCatalog jobs={jobs} close={()=>setManageJobs(false)} refresh={load}/>}
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
                choices: [
                  { value: "sales", label: "Venta" },
                  { value: "referral", label: "Referido" },
                ],
              },
              {
                key: "collaborator_id",
                label: "Vincular colaborador",
                optional: true,
                choices: [
                  empty,
                  ...people.map((p) => ({ value: p.id, label: p.full_name })),
                ],
              },
              {
                key: "invoice_id",
                label: "Factura de referencia",
                optional: true,
                choices: [
                  empty,
                  ...invoices.map((i) => ({
                    value: i.id,
                    label: `${i.number} · ${i.client_name}`,
                  })),
                ],
              },
              {
                key: "basis",
                label: "Cálculo",
                choices: [
                  { value: "fixed", label: "Importe fijo" },
                  { value: "invoiced", label: "% facturado" },
                  { value: "collected", label: "% cobrado" },
                ],
              },
              {
                key: "amount",
                label: "Importe (para importe fijo)",
                type: "number",
              },
              {
                key: "percentage",
                label: "Porcentaje (para cálculo %)",
                type: "number",
                optional: true,
              },
              {
                key: "currency",
                label: "Moneda (se usa la de la factura si se vincula)",
                choices: currencies,
              },
              {
                key: "due_on",
                label: "Vencimiento",
                type: "date",
                optional: true,
              },
              {
                key: "notes",
                label: "Cliente referido / condiciones",
                type: "textarea",
                optional: true,
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
              currency: "PYG",
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
                type: "number",
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

function JobCatalog({ jobs, close, refresh }: {jobs:JobRole[];close:()=>void;refresh:()=>Promise<void>}) {
  const [selected,setSelected]=useState<JobRole|null>(null);
  const [notice,setNotice]=useState('');
  return <Dialog title="Cargos y servicios" close={close}>
    <p className="form-note">Opciones propias de esta empresa. Archivar un cargo lo retira de nuevas asignaciones y conserva los perfiles existentes. Los cargos no otorgan permisos.</p>
    <div className="ops-job-list">
      {jobs.map(job=><button type="button" className={selected?.id===job.id?'choice active':'choice'} key={job.id} onClick={()=>setSelected(job)}>{job.name}{!job.active?' · Archivado':''}</button>)}
    </div>
    <div className="panel-heading"><h3>{selected?'Editar cargo':'Nuevo cargo'}</h3>{selected&&<button className="text-button" onClick={()=>setSelected(null)}>Agregar otro</button>}</div>
    {notice&&<p role="status" className="form-note">{notice}</p>}
    <Editor key={selected?.id||'new'} columns fields={[{key:'name',label:'Nombre del cargo'},...(selected?[{key:'active',label:'Disponible para asignar',choices:[{value:'true',label:'Sí'},{value:'false',label:'Archivado'}]}]:[])]} defaults={{name:selected?.name||'',active:String(selected?.active??true)}} save={async values=>{
      await api(`/api/agency/job-roles${selected?`/${selected.id}`:''}`,{name:values.name,active:values.active!=='false'},selected?'PATCH':'POST');
      await refresh();setSelected(null);setNotice('Catálogo actualizado.');
    }}/>
  </Dialog>;
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
        { key: "amount", label: "Descuento en la moneda de la factura", type: "number" },
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
      { id: string; body: string; author_email: string; created_at: string }[]
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
          <div className="ops-comments">
            {comments.map((c) => (
              <article className="ops-comment" key={c.id}>
                <b>{c.author_email || "Integrante"}</b>
                <small>{new Date(c.created_at).toLocaleString("es-PY")}</small>
                <p>{c.body}</p>
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
            <Editor
              key={comments.length}
              fields={[{ key: "body", label: "Comentario", type: "textarea" }]}
              defaults={{ body: "" }}
              label="Publicar comentario"
              save={async (v) => {
                await api(`/api/agency/projects/${projectId}/comments`, v);
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
      { id: string; name: string; role: string }[]
    >([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ organizations: typeof companies }>("/api/auth/organizations")
      .then((d) => {
        setCompanies(d.organizations);
        if (
          d.organizations.length > 1 &&
          !sessionStorage.getItem("scale_company_selected")
        )
          setOpen(true);
      })
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <>
      <button className="workspace" onClick={() => setOpen(true)}>
        <Building2 size={16} />
        {name}
      </button>
      {open && (
        <Dialog title="Elegí la empresa" close={() => setOpen(false)}>
          <p className="form-note">
            Solo aparecen las empresas que te dieron acceso.
          </p>
          <div className="ops-stack">
            {companies.map((c) => (
              <button
                className="choice"
                disabled={busy}
                key={c.id}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/api/auth/switch-organization", {
                      organizationId: c.id,
                    });
                    sessionStorage.setItem("scale_company_selected", "1");
                    window.location.assign("/");
                  } catch (e) {
                    setError(message(e));
                    setBusy(false);
                  }
                }}
              >
                {c.name} · {c.role}
              </button>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
