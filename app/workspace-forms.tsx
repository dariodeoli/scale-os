"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {useCompanyCurrency} from './currency-provider';
import {statuses} from './production-board';
import {SaveActions} from './save-actions';
import type {Account,Client,Invoice,Member,Project,WorkOrder} from './workspace-types';
import {currencyCodes} from './currencies';
import {AmountInput} from './profile-controls';
import {UrgencySelect} from './urgency';


export const clientSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del cliente."),
  email: z.string().email("Email inválido.").or(z.literal("")),
  phone: z.string().max(40).optional(),
});
type ClientValues = z.infer<typeof clientSchema>;
type SavedClient = { id: string; name: string; email: string | null; phone: string | null; active: boolean; [key: string]: unknown };
type WorkspaceRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
export function ClientForm({ request, done }: { request: WorkspaceRequest; done: (client: SavedClient) => void }) {
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });
  const [error, setError] = useState("");
  const [dialCode,setDialCode]=useState('+595');
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: ClientValues) {
    try {
      const digits=values.phone?.replace(/\D/g,'')||'';
      const data = await request<{ client: SavedClient }>("/api/agency/clients", {
        method: "POST",
        body: JSON.stringify({...values,phone:digits?`${dialCode}${digits}`:''}),
      });
      done(data.client);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <label>
        Nombre
        <input {...form.register("name")} autoFocus />
        {form.formState.errors.name && (
          <small className="error">{form.formState.errors.name.message}</small>
        )}
      </label>
      <label>
        Email
        <input type="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <small className="error">{form.formState.errors.email.message}</small>
        )}
      </label>
      <label>
        Teléfono / WhatsApp · Opcional
        <span className="phone-input"><select aria-label="Código de país" value={dialCode} onChange={event=>setDialCode(event.target.value)}><option value="+595">🇵🇾 +595</option><option value="+55">🇧🇷 +55</option><option value="+54">🇦🇷 +54</option><option value="+1">🇺🇸 +1</option><option value="+34">🇪🇸 +34</option></select><input inputMode="tel" autoComplete="tel-national" placeholder="981 123 456" {...form.register("phone")} /></span>
        <small className="field-help">Elegí el país; al guardar se conserva el código internacional y se habilita el acceso directo a WhatsApp.</small>
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>
        {submission.pending ? "Guardando…" : "Crear cliente"}
      </button></SaveActions>
    </form>
  );
}
export const driveLinkSchema=z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}},'Pegá un enlace HTTPS válido de archivo o carpeta.');
const projectSchema = z.object({
  urgency:z.enum(["","1","2","3","4","5"]),
  name: z.string().trim().min(2, "Escribí el nombre del proyecto."),
  clientId: z.string().min(1, "Elegí un cliente."),
  driveUrl: driveLinkSchema,
});
type ProjectValues = z.infer<typeof projectSchema>;
export function ProjectForm({
  clients,
  request,
  done,
  initialClientId='',
}: {
  clients: Client[];
  request: WorkspaceRequest;
  initialClientId?:string;
  done: (project: Project) => void;
}) {
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", clientId: initialClientId, driveUrl: "", urgency:"" },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: ProjectValues) {
    try {
      const data = await request<{ project: Project }>("/api/agency/projects", {
        method: "POST",
        body: JSON.stringify(values),
      });
      done(data.project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <label>
        Nombre del proyecto
        <input {...form.register("name")} autoFocus />
        {form.formState.errors.name && (
          <small className="error">{form.formState.errors.name.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as ProjectValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
      <fieldset>
        <legend>Cliente</legend>
        <div className="choice-list">
          {clients.map((client) => (
            <button
              type="button"
              className={
                form.watch("clientId") === client.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("clientId", client.id, { shouldValidate: true })
              }
              key={client.id}
            >
              {client.name}
            </button>
          ))}
        </div>
        {form.formState.errors.clientId && (
          <small className="error">
            {form.formState.errors.clientId.message}
          </small>
        )}
      </fieldset>
      <label>
        Enlace de archivo o carpeta de Google Drive
        <input
          placeholder="https://drive.google.com/..."
          {...form.register("driveUrl")}
        />
        {form.formState.errors.driveUrl && (
          <small className="error">
            {form.formState.errors.driveUrl.message}
          </small>
        )}
        <small>Solo guardamos el enlace, no el archivo. Compartí el acceso con tu equipo desde Drive.</small>
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!clients.length || submission.pending}
      >
        {submission.pending ? "Guardando…" : "Crear proyecto"}
      </button></SaveActions>
      {!clients.length && <p className="form-note">Primero creá un cliente.</p>}
    </form>
  );
}
const orderSchema = z.object({
  urgency:z.enum(["","1","2","3","4","5"]),
  title: z.string().trim().min(2, "Escribí qué hay que hacer."),
  projectId: z.string().min(1, "Elegí un proyecto."),
  status: z.enum([
    "blocked",
    "to_record",
    "recorded",
    "editing",
    "review",
    "approved",
    "published",
  ]),
  driveUrl: driveLinkSchema,
  description: z.string().max(500).optional(),
  work_type: z.enum(["", "video", "reedicion", "foto", "produccion", "entregable"]),
  due_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida").or(z.literal("")),
});
type OrderValues = z.infer<typeof orderSchema>;
export function OrderForm({
  projects,
  request,
  done,
}: {
  projects: Project[];
  request: WorkspaceRequest;
  done: (order: WorkOrder) => void;
}) {
  const form = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      title: "",
      projectId: "",
      urgency:"",
      status: "to_record",
      driveUrl: "",
      description: "",
      work_type: "",
      due_time: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: OrderValues) {
    try {
      const data = await request<{ workOrder: WorkOrder }>(
        "/api/agency/work-orders",
        { method: "POST", body: JSON.stringify(values) },
      );
      done(data.workOrder);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <label>
        Orden de trabajo
        <input {...form.register("title")} autoFocus />
        {form.formState.errors.title && (
          <small className="error">{form.formState.errors.title.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as OrderValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
      <fieldset>
        <legend>Proyecto</legend>
        <div className="choice-list">
          {projects.map((project) => (
            <button
              type="button"
              className={
                form.watch("projectId") === project.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("projectId", project.id, { shouldValidate: true })
              }
              key={project.id}
            >
              {project.client_name} · {project.name}
            </button>
          ))}
        </div>
        {form.formState.errors.projectId && (
          <small className="error">
            {form.formState.errors.projectId.message}
          </small>
        )}
      </fieldset>
      <fieldset>
        <legend>Estado inicial</legend>
        <div className="choice-list compact">
          {statuses.filter(status=>!['approved','published'].includes(status.id)).map((status) => (
            <button
              type="button"
              className={
                form.watch("status") === status.id ? "choice active" : "choice"
              }
              onClick={() => form.setValue("status", status.id)}
              key={status.id}
            >
              {status.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Tipo de trabajo
        <select {...form.register("work_type")}>
          <option value="">Sin clasificar</option>
          <option value="video">Video</option>
          <option value="reedicion">Reedición</option>
          <option value="foto">Foto</option>
          <option value="produccion">Producción</option>
          <option value="entregable">Entregable</option>
        </select>
        <small>Se usa para los conteos automáticos del resumen semanal.</small>
      </label>
      <label>
        Hora de entrega
        <input type="time" {...form.register("due_time")} />
        <small>Opcional, junto con la fecha de entrega.</small>
      </label>
      <label>
        Enlace de archivo o carpeta de Drive
        <input
          placeholder="https://drive.google.com/..."
          {...form.register("driveUrl")}
        />
        <small>Solo guardamos el enlace, no el archivo. Los permisos se gestionan en Drive.</small>
      </label>
      <label>
        Notas
        <textarea {...form.register("description")} />
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!projects.length || submission.pending}
      >
        {submission.pending ? "Guardando…" : "Crear orden"}
      </button></SaveActions>
      {!projects.length && (
        <p className="form-note">Primero creá un proyecto.</p>
      )}
    </form>
  );
}
const accountSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre de la cuenta."),
  accountType: z.enum(["bank", "cash", "digital", "investment"]),
  currency: z.enum(currencyCodes),
  institution: z.string().max(100).optional(),
  accountNumber: z.string().max(80).optional(),
  holderName: z.string().max(120).optional(),
  custodianUserId: z.string().optional(),
});
type AccountValues = z.infer<typeof accountSchema>;
export function AccountForm({
  custodians,
  request,
  done,
}: {
  custodians: Member[];
  request: WorkspaceRequest;
  done: (account: Account) => void;
}) {
  const {currency:defaultCurrency}=useCompanyCurrency();
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      accountType: "bank",
      currency: defaultCurrency,
      institution: "",
      accountNumber: "",
      holderName: "",
      custodianUserId: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: AccountValues) {
    try {
      const data = await request<{ account: Account }>("/api/agency/accounts", {
        method: "POST",
        body: JSON.stringify(values),
      });
      done(data.account);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear la cuenta.",
      );
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <label>
        Nombre de la cuenta
        <input
          {...form.register("name")}
          autoFocus
          placeholder="Banco Regional — Operativa"
        />
      </label>
      <fieldset>
        <legend>Tipo</legend>
        <div className="choice-list compact">
          {(
            [
              { id: "bank", label: "Banco" },
              { id: "cash", label: "Caja" },
              { id: "digital", label: "Digital" },
              { id: "investment", label: "Inversión" },
            ] as const
          ).map((type) => (
            <button
              type="button"
              className={
                form.watch("accountType") === type.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() => form.setValue("accountType", type.id)}
              key={type.id}
            >
              {type.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Banco, billetera o institución
        <input
          {...form.register("institution")}
          placeholder="Ej. Banco Regional / Efectivo"
        />
      </label>
      <label>
        Número de cuenta o referencia
        <input {...form.register("accountNumber")} placeholder="Opcional" />
      </label>
      <label>
        Titular de la cuenta
        <input
          {...form.register("holderName")}
          placeholder="Empresa, socio o familiar"
        />
      </label>
      <fieldset>
        <legend>Quién custodia este dinero</legend>
        <div className="choice-list compact">
          <button
            type="button"
            className={
              !form.watch("custodianUserId") ? "choice active" : "choice"
            }
            onClick={() => form.setValue("custodianUserId", "")}
          >
            Sin asignar
          </button>
          {custodians.map((member) => (
            <button
              type="button"
              className={
                form.watch("custodianUserId") === member.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() => form.setValue("custodianUserId", member.id)}
              key={member.id}
            >
              {member.email}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Moneda</legend>
        <div className="choice-list compact">
          {currencyCodes.map((currency) => (
            <button
              type="button"
              className={
                form.watch("currency") === currency ? "choice active" : "choice"
              }
              onClick={() => form.setValue("currency", currency)}
              key={currency}
            >
              {currency}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>
        {submission.pending ? "Creando…" : "Crear cuenta"}
      </button></SaveActions>
    </form>
  );
}
const invoiceSchema = z.object({
  clientId: z.string().min(1, "Elegí un cliente."),
  total: z.string().min(1, "Ingresá el importe.").refine(value=>Number.isFinite(Number(value))&&Number(value)>=0, "El importe no puede ser negativo."),
  currency: z.enum(currencyCodes),
  dueOn: z.string().optional(),
});
type InvoiceValues = z.infer<typeof invoiceSchema>;
export function InvoiceForm({
  clients,
  request,
  done,
}: {
  clients: Client[];
  request: WorkspaceRequest;
  done: (invoice: Invoice) => void;
}) {
  const {currency:defaultCurrency}=useCompanyCurrency();
  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { clientId: "", total: "0", currency: defaultCurrency, dueOn: "" },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: InvoiceValues) {
    try {
      const data = await request<{ invoice: Invoice }>("/api/agency/invoices", {
        method: "POST",
        body: JSON.stringify({...values,total:Number(values.total)}),
      });
      done(data.invoice);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear la factura.",
      );
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <fieldset>
        <legend>Cliente</legend>
        <div className="choice-list">
          {clients.map((client) => (
            <button
              type="button"
              className={
                form.watch("clientId") === client.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("clientId", client.id, { shouldValidate: true })
              }
              key={client.id}
            >
              {client.name}
            </button>
          ))}
        </div>
        {form.formState.errors.clientId && (
          <small className="error">
            {form.formState.errors.clientId.message}
          </small>
        )}
      </fieldset>
      <label>
        Total sin IVA
        <AmountInput value={form.watch('total')||''} currency={form.watch('currency')} invalid={!!form.formState.errors.total} onChange={value=>form.setValue('total',value,{shouldValidate:true,shouldDirty:true})}/>
      </label>
      <fieldset>
        <legend>Moneda</legend>
        <div className="choice-list compact">
          {currencyCodes.map((currency) => (
            <button
              type="button"
              className={
                form.watch("currency") === currency ? "choice active" : "choice"
              }
              onClick={() => form.setValue("currency", currency)}
              key={currency}
            >
              {currency}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Vencimiento
        <input type="date" {...form.register("dueOn")} />
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!clients.length || submission.pending}
      >
        {submission.pending ? "Creando…" : "Crear factura"}
      </button></SaveActions>
    </form>
  );
}
const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Elegí una factura."),
  accountId: z.string().min(1, "Elegí una cuenta."),
  amount: z.string().min(1, "Ingresá el importe cobrado.").refine(value=>Number.isFinite(Number(value))&&Number(value)>0, "El cobro debe ser mayor a cero."),
  receivedOn: z.string().optional(),
  reference: z.string().max(120).optional(),
  receivedByUserId: z.string().optional(),
});
type PaymentValues = z.infer<typeof paymentSchema>;
export function PaymentForm({
  invoices,
  accounts,
  custodians,
  request,
  done,
}: {
  invoices: Invoice[];
  accounts: Account[];
  custodians: Member[];
  request: WorkspaceRequest;
  done: () => void;
}) {
  const [requestId]=useState(()=>crypto.randomUUID());
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: "",
      accountId: "",
      amount: "0",
      receivedOn: new Date().toISOString().slice(0, 10),
      reference: "",
      receivedByUserId: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: PaymentValues) {
    try {
      await request("/api/agency/payments", {
        method: "POST",
        body: JSON.stringify({...values,amount:Number(values.amount),requestId}),
      });
      done();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar el cobro.",
      );
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <fieldset>
        <legend>Factura</legend>
        <div className="choice-list">
          {invoices
            .filter((invoice) => invoice.status !== "paid")
            .map((invoice) => (
              <button
                type="button"
                className={
                  form.watch("invoiceId") === invoice.id
                    ? "choice active"
                    : "choice"
                }
                onClick={() =>
                  form.setValue("invoiceId", invoice.id, {
                    shouldValidate: true,
                  })
                }
                key={invoice.id}
              >
                {invoice.number} · {invoice.client_name}
              </button>
            ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Quién recibió el cobro</legend>
        <div className="choice-list">
          {custodians.map((member) => (
            <button
              type="button"
              className={
                form.watch("receivedByUserId") === member.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() => form.setValue("receivedByUserId", member.id)}
              key={member.id}
            >
              {member.email}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Cuenta de ingreso</legend>
        <div className="choice-list">
          {accounts.map((account) => (
            <button
              type="button"
              className={
                form.watch("accountId") === account.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("accountId", account.id, { shouldValidate: true })
              }
              key={account.id}
            >
              {account.name} · {account.currency}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Importe cobrado
        <AmountInput value={form.watch('amount')||''} currency={accounts.find(account=>account.id===form.watch('accountId'))?.currency||'PYG'} invalid={!!form.formState.errors.amount} onChange={value=>form.setValue('amount',value,{shouldValidate:true,shouldDirty:true})}/>
      </label>
      <label>
        Fecha
        <input type="date" {...form.register("receivedOn")} />
      </label>
      <label>
        Referencia
        <input
          {...form.register("reference")}
          placeholder="Transferencia / comprobante"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!accounts.length || submission.pending}
      >
        {submission.pending ? "Guardando…" : "Registrar cobro"}
      </button></SaveActions>
    </form>
  );
}

