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
import {financeNoticeHref,financePurposeNotice} from './finance-privacy';
import {AmountInput,SelectCustom} from './profile-controls';
import {UrgencySelect} from './urgency';
import {EntityPicker,type EntityOption} from './entity-picker';
import {isPositiveInput} from './forecast-data';
import {todayAsuncion} from './client-format';
import {listDateShort} from './list-format';
import {money} from './money-format';
import {teamRoleLabels} from './team-directory';
import {paymentCurrency} from './treasury-data';


type WorkspaceRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
export const driveLinkSchema=z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}},'Pegá un enlace HTTPS válido de archivo o carpeta.');
const projectSchema = z.object({
  urgency:z.enum(["","1","2","3","4","5"]),
  name: z.string().trim().min(2, "Escribí el nombre del proyecto.").max(120, "El nombre no puede superar los 120 caracteres."),
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
        <input {...form.register("name")} autoFocus maxLength={120} aria-invalid={form.formState.errors.name?true:undefined} aria-describedby={form.formState.errors.name?"project-name-error":undefined}/>
        {form.formState.errors.name && (
          <small className="error" role="alert" id="project-name-error">{form.formState.errors.name.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as ProjectValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
      {/* Un desplegable con buscador (no un botón por cliente): con cientos de
          clientes la lista de botones empujaba el resto del formulario fuera de vista. */}
      <div className="grid gap-1.5">
        <SelectCustom label="Cliente" value={form.watch("clientId")} choices={clients.map(client=>({value:String(client.id),label:client.name}))} disabled={submission.pending} invalid={Boolean(form.formState.errors.clientId)} describedBy={form.formState.errors.clientId?"project-client-error":undefined} onChange={value=>form.setValue("clientId",value,{shouldValidate:true,shouldDirty:true})}/>
        {form.formState.errors.clientId && (
          <small className="error" role="alert" id="project-client-error">
            {form.formState.errors.clientId.message}
          </small>
        )}
      </div>
      <label>
        Enlace de archivo o carpeta de Google Drive
        <input
          placeholder="https://drive.google.com/..."
          {...form.register("driveUrl")}
          aria-invalid={form.formState.errors.driveUrl?true:undefined}
          aria-describedby={form.formState.errors.driveUrl?"project-drive-error":undefined}
        />
        {form.formState.errors.driveUrl && (
          <small className="error" role="alert" id="project-drive-error">
            {form.formState.errors.driveUrl.message}
          </small>
        )}
        <small>Solo guardamos el enlace, no el archivo. Compartí el acceso con tu equipo desde Drive.</small>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><button
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
  title: z.string().trim().min(2, "Escribí qué hay que hacer.").max(120, "El título no puede superar los 120 caracteres."),
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
  // Paso 1 del alta (#137): primero el proyecto con buscador; el resto del
  // formulario aparece recién al elegirlo (antes se listaban ~20 botones).
  const projectId=form.watch("projectId");
  const selectedProject=projects.find(project=>String(project.id)===projectId);
  const projectChoices=projects.map(project=>({value:String(project.id),label:`${project.client_name} · ${project.name}`}));
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
      {selectedProject ? (
        <div className="ops-wide flex min-w-0 items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2">
          <span className="min-w-0">
            <small className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Proyecto</small>
            <b className="block truncate text-[13.5px] font-semibold text-fore" title={`${selectedProject.client_name} · ${selectedProject.name}`}>{selectedProject.client_name} · {selectedProject.name}</b>
          </span>
          <button type="button" className="text-button shrink-0" onClick={()=>form.setValue("projectId","",{shouldValidate:false,shouldDirty:true})}>Cambiar</button>
        </div>
      ) : (
        <div className="ops-wide grid gap-1.5">
          <SelectCustom label="Proyecto" value={projectId} choices={projectChoices} onChange={value=>form.setValue("projectId",value,{shouldValidate:true,shouldDirty:true})} invalid={Boolean(form.formState.errors.projectId)} describedBy={form.formState.errors.projectId?"order-project-error":undefined}/>
          {form.formState.errors.projectId && (
            <small className="error" role="alert" id="order-project-error">
              {form.formState.errors.projectId.message}
            </small>
          )}
          {!projects.length && (
            <p className="form-note">Primero creá un proyecto.</p>
          )}
        </div>
      )}
      {selectedProject ? <>
      <label>
        Orden de trabajo
        <input {...form.register("title")} autoFocus maxLength={120} aria-invalid={form.formState.errors.title?true:undefined} aria-describedby={form.formState.errors.title?"order-title-error":undefined}/>
        {form.formState.errors.title && (
          <small className="error" role="alert" id="order-title-error">{form.formState.errors.title.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as OrderValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
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
        <SelectCustom label="Tipo de trabajo" choices={[{value:'',label:'Sin clasificar'},{value:'video',label:'Video'},{value:'reedicion',label:'Reedición'},{value:'foto',label:'Foto'},{value:'produccion',label:'Producción'},{value:'entregable',label:'Entregable'}]} value={form.watch('work_type')??''} onChange={value=>form.setValue('work_type',value as OrderValues['work_type'],{shouldDirty:true,shouldValidate:true})}/>
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
          aria-invalid={form.formState.errors.driveUrl?true:undefined}
          aria-describedby={form.formState.errors.driveUrl?"order-drive-error":undefined}
        />
        {/* Sin este aviso un enlace inválido bloqueaba el guardado en silencio. */}
        {form.formState.errors.driveUrl && (
          <small className="error" role="alert" id="order-drive-error">{form.formState.errors.driveUrl.message}</small>
        )}
        <small>Solo guardamos el enlace, no el archivo. Los permisos se gestionan en Drive.</small>
      </label>
      <label>
        Notas
        <textarea {...form.register("description")} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><button
        className="primary"
        disabled={submission.pending}
      >
        {submission.pending ? "Guardando…" : "Crear orden"}
      </button></SaveActions>
      </> : null}
    </form>
  );
}
const accountSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre de la cuenta.").max(120, "El nombre no puede superar los 120 caracteres."),
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
  const custodianOptions:EntityOption[]=custodians.map(member=>({id:String(member.id),name:member.full_name?.trim()||member.email,secondary:teamRoleLabels[member.role]||member.role,photoUrl:member.photo_url,person:true,searchText:member.email}));
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
      <EntityPicker
        legend="Quién custodia este dinero"
        options={custodianOptions}
        value={form.watch("custodianUserId")||""}
        onChange={value=>form.setValue("custodianUserId",value,{shouldValidate:true,shouldDirty:true})}
        placeholder="Buscar persona…"
        searchLabel="Buscar persona"
        allowEmpty
        emptyLabel="Sin asignar"
      />
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
      {error && <p className="error" role="alert">{error}</p>}
      <p className="field-help">{financePurposeNotice('treasury')} · <a href={financeNoticeHref('treasury')} target="_blank" rel="noreferrer">Aviso de Privacidad</a></p>
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><button className="primary" disabled={submission.pending}>
        {submission.pending ? "Creando…" : "Crear cuenta"}
      </button></SaveActions>
    </form>
  );
}
const invoiceSchema = z.object({
  clientId: z.string().min(1, "Elegí un cliente."),
  total: z.string().min(1, "Ingresá el importe.").refine(value=>Number.isFinite(Number(value))&&Number(value)>0, "El importe debe ser mayor a cero."),
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
    mode: "onChange",
    defaultValues: { clientId: "", total: "", currency: defaultCurrency, dueOn: "" },
  });
  const clientId=form.watch("clientId"),total=form.watch("total");
  const clientOptions:EntityOption[]=clients.map(client=>({id:client.id,name:client.name,secondary:client.legal_name?.trim()||client.tax_id?.trim()||undefined,photoUrl:client.logo_url,logo:true,searchText:`${client.legal_name||''} ${client.tax_id||''}`}));
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  const canSubmit=Boolean(clientId)&&isPositiveInput(total)&&!submission.pending;
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
      <EntityPicker
        legend="Cliente"
        options={clientOptions}
        value={clientId}
        onChange={value=>form.setValue("clientId",value,{shouldValidate:true,shouldDirty:true})}
        error={form.formState.errors.clientId?.message}
        placeholder="Buscar cliente…"
        searchLabel="Buscar cliente"
      />
      <label>
        Total sin IVA
        <AmountInput value={form.watch('total')||''} currency={form.watch('currency')} invalid={!!form.formState.errors.total} onChange={value=>form.setValue('total',value,{shouldValidate:true,shouldDirty:true})}/>
      </label>
      {form.formState.errors.total?<small className="error" role="alert">{form.formState.errors.total.message}</small>:null}
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
      {error && <p className="error" role="alert">{error}</p>}
      {!canSubmit&&!submission.pending?<p className="field-help">Completá el cliente y un importe mayor a cero para crear la factura.</p>:null}
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><button
        className="primary"
        disabled={!canSubmit}
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
  preselectInvoiceId = "",
}: {
  invoices: Invoice[];
  accounts: Account[];
  custodians: Member[];
  request: WorkspaceRequest;
  done: () => void;
  /** Factura elegida desde la lista: el modal abre con esa factura marcada. */
  preselectInvoiceId?: string;
}) {
  const [requestId]=useState(()=>crypto.randomUUID());
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    mode: "onChange",
    defaultValues: {
      invoiceId: preselectInvoiceId,
      accountId: "",
      amount: "",
      receivedOn: todayAsuncion(),
      reference: "",
      receivedByUserId: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  const invoiceId=form.watch("invoiceId"),accountId=form.watch("accountId"),amount=form.watch("amount");
  const canSubmit=Boolean(invoiceId)&&Boolean(accountId)&&isPositiveInput(amount)&&!submission.pending;
  const invoiceOptions:EntityOption[]=invoices
    .filter((invoice) => invoice.status !== "paid")
    .map((invoice) => {
      const pending=Number(invoice.total)-Number(invoice.paid_amount);
      return {id:invoice.id,name:`${invoice.number} · ${invoice.client_name}`,secondary:`Vence ${listDateShort(invoice.due_on)||'sin fecha'}`,context:`${money(pending,invoice.currency)} pendiente`,searchText:`${invoice.number} ${invoice.client_name}`};
    });
  const custodianOptions:EntityOption[]=custodians.map(member=>({id:String(member.id),name:member.full_name?.trim()||member.email,secondary:teamRoleLabels[member.role]||member.role,photoUrl:member.photo_url,person:true,searchText:member.email}));
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
      <EntityPicker
        legend="Factura"
        options={invoiceOptions}
        value={invoiceId}
        onChange={value=>form.setValue("invoiceId",value,{shouldValidate:true,shouldDirty:true})}
        error={form.formState.errors.invoiceId?.message}
        placeholder="Buscar factura o cliente…"
        searchLabel="Buscar factura"
      />
      {custodianOptions.length?<EntityPicker
        legend="Quién recibió el cobro"
        options={custodianOptions}
        value={form.watch("receivedByUserId")||""}
        onChange={value=>form.setValue("receivedByUserId",value,{shouldValidate:true,shouldDirty:true})}
        placeholder="Buscar persona…"
        searchLabel="Buscar persona"
      />:null}
      <fieldset>
        <legend>Cuenta de ingreso</legend>
        <div className="choice-list">
          {accounts.map((account) => (
            <button
              type="button"
              className={
                form.watch("accountId") === account.id
                  ? "choice active max-w-full !whitespace-normal break-words text-left"
                  : "choice max-w-full !whitespace-normal break-words text-left"
              }
              onClick={() =>
                form.setValue("accountId", account.id, { shouldValidate: true })
              }
              key={account.id}
              title={`${account.name} · ${account.currency}`}
            >
              {account.name} · {account.currency}
            </button>
          ))}
        </div>
      </fieldset>
      {form.formState.errors.accountId?<small className="error" role="alert">{form.formState.errors.accountId.message}</small>:null}
      <label>
        Importe cobrado
        <AmountInput value={form.watch('amount')||''} currency={paymentCurrency(accounts,invoices,form.watch('accountId'),invoiceId)} invalid={!!form.formState.errors.amount} onChange={value=>form.setValue('amount',value,{shouldValidate:true,shouldDirty:true})}/>
      </label>
      {form.formState.errors.amount?<small className="error" role="alert">{form.formState.errors.amount.message}</small>:null}
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
      {error && <p className="error" role="alert">{error}</p>}
      {!canSubmit&&!submission.pending?<p className="field-help">Elegí la factura, la cuenta y un importe mayor a cero para registrar el cobro.</p>:null}
      <p className="field-help">{financePurposeNotice('payments')} · <a href={financeNoticeHref('payments')} target="_blank" rel="noreferrer">Aviso de Privacidad</a></p>
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><button
        className="primary"
        disabled={!canSubmit}
      >
        {submission.pending ? "Guardando…" : "Registrar cobro"}
      </button></SaveActions>
    </form>
  );
}

