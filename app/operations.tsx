"use client";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, MessageSquare, Building2 } from "lucide-react";

async function api<T>(
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
  return data as T;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación";
const money = (value: string | number, currency = "PYG") =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "PYG" ? 0 : 2,
  }).format(Number(value));
const day = (v: string | null) => (v ? v.slice(0, 10) : "—");
function Dialog({
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
type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "email" | "url" | "textarea";
  choices?: Choice[];
  optional?: boolean;
};
const currencies = [
  { value: "PYG", label: "Guaraníes" },
  { value: "USD", label: "Dólares" },
];
function Editor({
  fields,
  defaults,
  save,
  label = "Guardar",
}: {
  fields: Field[];
  defaults: Record<string, string>;
  save: (v: Record<string, string>) => Promise<void>;
  label?: string;
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
  return (
    <form
      className="form-stack"
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
      {fields.map((f) => (
        <div key={f.key}>
          {f.choices ? (
            <fieldset>
              <legend>{f.label}</legend>
              <div className="choice-list compact">
                {f.choices.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={form.watch(f.key) === c.value}
                    className={
                      form.watch(f.key) === c.value ? "choice active" : "choice"
                    }
                    onClick={() =>
                      form.setValue(f.key, c.value, { shouldValidate: true })
                    }
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <label>
              {f.label}
              {f.type === "textarea" ? (
                <textarea {...form.register(f.key)} />
              ) : (
                <input
                  type={f.type || "text"}
                  step={f.type === "number" ? "0.01" : undefined}
                  {...form.register(f.key)}
                />
              )}
            </label>
          )}
          {form.formState.errors[f.key] && (
            <small className="error">
              {String(form.formState.errors[f.key]?.message)}
            </small>
          )}
        </div>
      ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={form.formState.isSubmitting}>
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
    [access, setAccess] = useState<Choice[]>([]);
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
    const [p, c, a, i, x, m] = await Promise.all([
      api<{ collaborators: Person[] }>("/api/agency/collaborators"),
      api<{ commissions: Commission[] }>("/api/agency/commissions"),
      api<{ accounts: Account[] }>("/api/agency/accounts"),
      api<{ invoices: Invoice[] }>("/api/agency/invoices"),
      api<{ payouts: Payout[] }>("/api/agency/payouts"),
      api<{ members: { id: string; email: string }[] }>(
        "/api/agency/custodians",
      ),
    ]);
    setPeople(p.collaborators);
    setCommissions(c.commissions);
    setAccounts(a.accounts);
    setInvoices(i.invoices);
    setPayouts(x.payouts);
    setAccess(m.members.map((u) => ({ value: u.id, label: u.email })));
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
    { key: "job_title", label: "Cargo o servicio", optional: true },
    {
      key: "photo_url",
      label: "Enlace HTTPS a la foto",
      type: "url",
      optional: true,
    },
    {
      key: "user_id",
      label: "Acceso al panel",
      optional: true,
      choices: [empty, ...access],
    },
    { key: "compensation_type", label: "Modalidad", choices: types },
    { key: "compensation_amount", label: "Importe acordado", type: "number" },
    { key: "currency", label: "Moneda", choices: currencies },
    {
      key: "invoices_company",
      label: "¿Emite factura?",
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
    },
    { key: "ended_on", label: "Fecha de salida", type: "date", optional: true },
    {
      key: "payment_day",
      label: "Día de pago (1–31)",
      type: "number",
      optional: true,
    },
    {
      key: "active",
      label: "Estado",
      choices: [
        { value: "true", label: "Activo" },
        { value: "false", label: "Inactivo" },
      ],
    },
    {
      key: "notes",
      label: "Condiciones y notas",
      type: "textarea",
      optional: true,
    },
  ];
  const personDefaults: Record<string, string> = {
    full_name: person?.full_name || "",
    email: person?.email || "",
    job_title: person?.job_title || "",
    photo_url: person?.photo_url || "",
    user_id: person?.user_id || "",
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
              {mode === "people" ? "Colaboradores" : "Comisiones y referidos"}
            </h2>
          </div>
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
              <article className="ops-card" key={p.id}>
                <div className="ops-person">
                  {p.photo_url ? (
                    <img
                      src={p.photo_url}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
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
                <strong>{money(p.compensation_amount, p.currency)}</strong>
                <p>
                  {types.find((t) => t.value === p.compensation_type)?.label} ·{" "}
                  {p.invoices_company ? "Emite factura" : "No emite factura"}
                </p>
                <p>
                  Ingreso: {day(p.started_on)} · Pago: día{" "}
                  {p.payment_day || "—"}
                </p>
                <p>
                  {p.access_email
                    ? `Acceso: ${p.access_email}`
                    : "Sin acceso vinculado al panel"}
                </p>
                <div className="inline-actions">
                  <button className="text-button" onClick={() => setEdit(p)}>
                    Editar perfil
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setPay({ person: p })}
                  >
                    Registrar pago
                  </button>
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
          title={person ? "Editar colaborador" : "Nuevo colaborador"}
          close={() => setEdit(null)}
        >
          <p className="form-note">
            Vincular un acceso no envía una invitación. Las invitaciones se
            administran en Equipo.
          </p>
          <Editor
            fields={personFields}
            defaults={personDefaults}
            save={async (v) => {
              await api(
                `/api/agency/collaborators${person ? `/${person.id}` : ""}`,
                {
                  ...v,
                  invoices_company: v.invoices_company === "true",
                  active: v.active === "true",
                },
                person ? "PATCH" : "POST",
              );
              await done();
            }}
          />
        </Dialog>
      )}
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
