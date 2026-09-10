"use client";
import {usePathname,useRouter} from 'next/navigation';
import {sectionLabel,sectionPath,parentSection,childSections,tabLabels} from './navigation';
import Link from 'next/link';
import {ControlCenter} from './control-center';
import {WorkspaceSearch} from './workspace-search';
import {WorkspaceBrand} from './workspace-brand';
import {MobileNavigation} from './mobile-navigation';
import dynamic from 'next/dynamic';
import {ClientIdentity,identityColor} from './client-identity';
const MyProfile=dynamic(()=>import('./my-profile').then(m=>m.MyProfile));
const WorkDetail=dynamic(()=>import('./productivity-ui').then(m=>m.WorkDetail));
const ClientDetail=dynamic(()=>import('./productivity-ui').then(m=>m.ClientDetail));
const WorkPlanner=dynamic(()=>import('./productivity-ui').then(m=>m.WorkPlanner));
const WorkHistory=dynamic(()=>import('./work-history').then(m=>m.WorkHistory));
const InternalTasks=dynamic(()=>import('./work-history').then(m=>m.InternalTasks));
import {dataFetch,setDataScope,clearDataCache} from './data-cache';
import './control-center.css';
import './mobile-navigation.css';
import {Dialog,FormActions} from './dialog';
import {OperationsWorkspace, ProjectComments, CompanySelector} from './operations';
import './operations.css';
import './suite.css';
import {CatalogWorkspace,RecordEditor,BudgetActions,ActivityWorkspace,SettingsWorkspace} from './suite';
import {QuoteComposer} from './quote-composer';
import {PasswordPanel} from './password-panel';
import {WorkspaceGuide,visibleModule,NewCompany} from './workspace-guide';
import {FXTransferForm,ReceiptReversal,ReconciliationWorkspace} from './daily-controls';
import {SelectCustom} from './profile-controls';
import {filterProductionOrders} from './production-filter';
import {RemoveRecord,TrashWorkspace} from './archive-controls';
import {notify,notifyMutation} from './feedback';

import {
  DndContext,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const core = "/core-api";
const statuses = [
  { id: "blocked", label: "Bloqueado", tone: "red" },
  { id: "to_record", label: "Por grabar", tone: "yellow" },
  { id: "recorded", label: "Grabado", tone: "teal" },
  { id: "editing", label: "Editando", tone: "purple" },
  { id: "review", label: "Revisión", tone: "blue" },
  { id: "approved", label: "Aprobado", tone: "green" },
  { id: "published", label: "Publicado", tone: "green" },
] as const;
type Status = (typeof statuses)[number]["id"];
const nav = [
  ["Resumen", LayoutDashboard],
  ["Clientes", Users],
  ["Proyectos", FolderKanban],
  ["Presupuestos", FileText],
  ["Pagos", WalletCards],
  ["Métricas", BarChart3],
  ["Equipo", BriefcaseBusiness],
  ["Pipeline", FolderKanban],
  ["Inventario", BriefcaseBusiness],
  ["Actividad", CalendarDays],
  ["Configuración", Settings],
] as const;
type Client = {
  logo_url?:string|null;
  color_key?:string;
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
};
type Project = {
  id: string;
  name: string;
  client_id: string;
  client_name: string;
  drive_url: string | null;
  status: string;
  work_order_count: number;
};
type WorkOrder = {
  assigned_user_id?:string|null;
  updated_at?:string;
  client_logo_url?:string|null;
  client_color_key?:string;
  id: string;
  title: string;
  project_id: string;
  project_name: string;
  client_name: string;
  status: Status;
  description: string | null;
  drive_url: string | null;
  due_date?: string | null;
};
type Budget = {
  id: string;
  number: string;
  title: string;
  client_name: string;
  currency: "PYG" | "USD";
  status: string;
  subtotal: string;
  total: string;
  item_count: number;
  valid_until: string | null;
};
type Account = {
  id: string;
  name: string;
  account_type: "bank" | "cash" | "digital" | "investment";
  currency: "PYG" | "USD";
  balance: string;
  active: boolean;
  institution: string | null;
  account_number: string | null;
  holder_name: string | null;
  custodian_user_id: string | null;
  custodian_email?: string | null;
};
type AccountTransfer = {
  id: string;
  from_account_id: string;
  to_account_id: string;
  from_account_name: string;
  to_account_name: string;
  amount: string;
  received_amount?: string;
  from_currency?: string;
  to_currency?: string;
  transferred_on: string;
  reference: string | null;
  created_by_email: string | null;
};
type PaymentRecord = {
  id: string;
  invoice_number: string;
  client_name: string;
  account_name: string;
  account_type: string;
  currency: "PYG" | "USD";
  amount: string;
  received_on: string;
  reference: string | null;
  received_by_email: string | null;
  reversal_id?: string | null;
  reversal_reason?: string | null;
};
type Invoice = {
  id: string;
  number: string;
  client_id: string;
  client_name: string;
  status: string;
  currency: "PYG" | "USD";
  total: string;
  paid_amount: string;
  due_on: string | null;
};
type MetricEvent = { name: string; event_date: string; count: number };
type ClientPaymentStatus = {
  client_id: string;
  client_name: string;
  currency: "PYG" | "USD" | null;
  outstanding_amount: string;
  next_due_on: string | null;
  days_overdue: number;
  payment_status: "up_to_date" | "due_soon" | "late" | "severe";
};
type User = {
  id:string;
  organization_id:string;
  full_name?:string|null;
  photo_url?:string|null;
  email: string;
  role: string;
  organization_name: string;
  organization_slug: string;
};
type Member = { id: string; email: string; role: string; active?:boolean; created_at: string };
type Summary = {
  active_clients: number;
  active_projects: number;
  open_orders: number;
};
type ModalKind =
  | "client"
  | "project"
  | "order"
  | "budget"
  | "account"
  | "invoice"
  | "payment"
  | "transfer"
  | null;
const assignableRoles = [
  { id: "owner", label: "Dueño" },
  { id: "admin", label: "Administrador" },
  { id: "management", label: "Gerencia" },
  { id: "finance", label: "Finanzas" },
  { id: "sales", label: "Ventas" },
  { id: "production", label: "Producción" },
  { id: "editor", label: "Edición" },
  { id: "viewer", label: "Solo lectura" },
] as const;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await dataFetch(`${core}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la acción.");
  let payload:unknown;
  if(typeof init.body==='string'){try{payload=JSON.parse(init.body);}catch{payload=undefined;}}
  notifyMutation(path,init.method||'GET',payload,data);
  return data;
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return <Dialog title={title} close={onClose}>{children}</Dialog>;
}
function DraggableOrder({ order,role,refresh,openOrder }: { order: WorkOrder;role:string;refresh:()=>Promise<void>;openOrder:(id:string)=>void }) {
  const canMove=['owner','admin','management','production','editor'].includes(role);
  const draggable = useDraggable({ id: order.id,disabled:!canMove });
  const style = draggable.transform
    ? {
        transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
      }
    : undefined;
  return (
    <article
      ref={draggable.setNodeRef}
      style={style}
      className={`work-card identity-card identity-${identityColor(order.client_color_key)} ${draggable.isDragging ? "dragging" : ""}`}
    >
      <div className="card-top">
        <button className="text-button" onClick={()=>openOrder(order.id)}>{order.title}</button>
        {canMove&&<button className="icon-button" aria-label={`Mover ${order.title}`} {...draggable.listeners} {...draggable.attributes}>⋮⋮</button>}
      </div>
      <p>
        <ClientIdentity compact name={order.client_name} logo={order.client_logo_url} color={order.client_color_key}/> · {order.project_name}
      </p>
      <div className="card-meta">
        {order.drive_url ? (
          <a
            href={order.drive_url}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <LinkIcon size={12} /> Drive
          </a>
        ) : (
          <span>Sin enlace</span>
        )}
        {order.description&&<span className="order-description">{order.description}</span>}
      </div>
      {['owner','admin','management','production','editor'].includes(role)&&<details className="card-actions"><summary>Detalles y acciones</summary><RecordEditor kind="work-orders" recordId={order.id} name={order.title} refresh={refresh} role={role}/></details>}
    </article>
  );
}
function KanbanColumn({
  status,
  orders,
  role,
  refresh,
  openOrder,
}: {
  status: (typeof statuses)[number];
  orders: WorkOrder[];
  role:string;
  refresh:()=>Promise<void>;
  openOrder:(id:string)=>void;
}) {
  const droppable = useDroppable({ id: `status-${status.id}` });
  return (
    <section
      ref={droppable.setNodeRef}
      className={`column ${droppable.isOver ? "drop-over" : ""}`}
    >
      <div className="column-title">
        <span className={`dot ${status.tone}`} />
        <b>{status.label}</b>
        <em>{orders.length}</em>
      </div>
      {orders.map((order) => (
        <DraggableOrder key={order.id} order={order} role={role} refresh={refresh} openOrder={openOrder}/>
      ))}
    </section>
  );
}

const clientSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del cliente."),
  email: z.string().email("Email inválido.").or(z.literal("")),
  phone: z.string().max(40).optional(),
});
type ClientValues = z.infer<typeof clientSchema>;
function ClientForm({ done }: { done: (client: Client) => void }) {
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });
  const [error, setError] = useState("");
  async function submit(values: ClientValues) {
    try {
      const data = await request<{ client: Client }>("/api/agency/clients", {
        method: "POST",
        body: JSON.stringify(values),
      });
      done(data.client);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
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
        Teléfono
        <input {...form.register("phone")} />
      </label>
      {error && <p className="error">{error}</p>}
      <FormActions><button className="primary" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Guardando…" : "Crear cliente"}
      </button></FormActions>
    </form>
  );
}
const driveLinkSchema=z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}},'Pegá un enlace HTTPS válido de archivo o carpeta.');
const projectSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del proyecto."),
  clientId: z.string().min(1, "Elegí un cliente."),
  driveUrl: driveLinkSchema,
});
type ProjectValues = z.infer<typeof projectSchema>;
function ProjectForm({
  clients,
  done,
  initialClientId='',
}: {
  clients: Client[];
  initialClientId?:string;
  done: (project: Project) => void;
}) {
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", clientId: initialClientId, driveUrl: "" },
  });
  const [error, setError] = useState("");
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
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
    >
      <label>
        Nombre del proyecto
        <input {...form.register("name")} autoFocus />
        {form.formState.errors.name && (
          <small className="error">{form.formState.errors.name.message}</small>
        )}
      </label>
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
      <FormActions><button
        className="primary"
        disabled={!clients.length || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Guardando…" : "Crear proyecto"}
      </button></FormActions>
      {!clients.length && <p className="form-note">Primero creá un cliente.</p>}
    </form>
  );
}
const orderSchema = z.object({
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
});
type OrderValues = z.infer<typeof orderSchema>;
function OrderForm({
  projects,
  done,
}: {
  projects: Project[];
  done: (order: WorkOrder) => void;
}) {
  const form = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      title: "",
      projectId: "",
      status: "to_record",
      driveUrl: "",
      description: "",
    },
  });
  const [error, setError] = useState("");
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
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
    >
      <label>
        Orden de trabajo
        <input {...form.register("title")} autoFocus />
        {form.formState.errors.title && (
          <small className="error">{form.formState.errors.title.message}</small>
        )}
      </label>
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
      <FormActions><button
        className="primary"
        disabled={!projects.length || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Guardando…" : "Crear orden"}
      </button></FormActions>
      {!projects.length && (
        <p className="form-note">Primero creá un proyecto.</p>
      )}
    </form>
  );
}
const budgetSchema = z.object({
  title: z.string().trim().min(2, "Describí el presupuesto."),
  clientId: z.string().min(1, "Elegí un cliente."),
  description: z.string().trim().min(2, "Describí el servicio."),
  quantity: z.number().positive("La cantidad debe ser mayor a cero."),
  unitPrice: z.number().min(0, "El importe no puede ser negativo."),
  currency: z.enum(["PYG", "USD"]),
  validUntil: z.string().optional(),
});
type BudgetValues = z.infer<typeof budgetSchema>;
function BudgetForm({
  clients,
  done,
}: {
  clients: Client[];
  done: (budget: Budget) => void;
}) {
  const form = useForm<BudgetValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      title: "",
      clientId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      currency: "PYG",
      validUntil: "",
    },
  });
  const [error, setError] = useState("");
  async function submit(values: BudgetValues) {
    try {
      const data = await request<{ budget: Budget }>("/api/agency/budgets", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          items: [
            {
              description: values.description,
              quantity: values.quantity,
              unitPrice: values.unitPrice,
            },
          ],
        }),
      });
      done(data.budget);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo crear el presupuesto.",
      );
    }
  }
  return (
    <form
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
    >
      <label>
        Nombre del presupuesto
        <input
          {...form.register("title")}
          autoFocus
          placeholder="Plan Gold mensual"
        />
        {form.formState.errors.title && (
          <small className="error">{form.formState.errors.title.message}</small>
        )}
      </label>
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
        Servicio o alcance
        <input
          {...form.register("description")}
          placeholder="Plan Gold — 12 contenidos"
        />
      </label>
      <div className="two-fields">
        <label>
          Cantidad
          <input
            type="number"
            min="1"
            step="1"
            {...form.register("quantity", { valueAsNumber: true })}
          />
        </label>
        <label>
          Importe sin IVA
          <input
            type="number"
            min="0"
            step="1000"
            {...form.register("unitPrice", { valueAsNumber: true })}
          />
        </label>
      </div>
      <fieldset>
        <legend>Moneda</legend>
        <div className="choice-list compact">
          {(["PYG", "USD"] as const).map((currency) => (
            <button
              type="button"
              className={
                form.watch("currency") === currency ? "choice active" : "choice"
              }
              onClick={() => form.setValue("currency", currency)}
              key={currency}
            >
              {currency === "PYG" ? "Guaraníes" : "Dólares"}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Válido hasta
        <input type="date" {...form.register("validUntil")} />
      </label>
      {error && <p className="error">{error}</p>}
      <FormActions><button
        className="primary"
        disabled={!clients.length || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creando…" : "Crear presupuesto"}
      </button></FormActions>
    </form>
  );
}
const accountSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre de la cuenta."),
  accountType: z.enum(["bank", "cash", "digital", "investment"]),
  currency: z.enum(["PYG", "USD"]),
  institution: z.string().max(100).optional(),
  accountNumber: z.string().max(80).optional(),
  holderName: z.string().max(120).optional(),
  custodianUserId: z.string().optional(),
});
type AccountValues = z.infer<typeof accountSchema>;
function AccountForm({
  custodians,
  done,
}: {
  custodians: Member[];
  done: (account: Account) => void;
}) {
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: "",
      accountType: "bank",
      currency: "PYG",
      institution: "",
      accountNumber: "",
      holderName: "",
      custodianUserId: "",
    },
  });
  const [error, setError] = useState("");
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
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
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
          {(["PYG", "USD"] as const).map((currency) => (
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
      <FormActions><button className="primary" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creando…" : "Crear cuenta"}
      </button></FormActions>
    </form>
  );
}
const invoiceSchema = z.object({
  clientId: z.string().min(1, "Elegí un cliente."),
  total: z.number().min(0, "El importe no puede ser negativo."),
  currency: z.enum(["PYG", "USD"]),
  dueOn: z.string().optional(),
});
type InvoiceValues = z.infer<typeof invoiceSchema>;
function InvoiceForm({
  clients,
  done,
}: {
  clients: Client[];
  done: (invoice: Invoice) => void;
}) {
  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { clientId: "", total: 0, currency: "PYG", dueOn: "" },
  });
  const [error, setError] = useState("");
  async function submit(values: InvoiceValues) {
    try {
      const data = await request<{ invoice: Invoice }>("/api/agency/invoices", {
        method: "POST",
        body: JSON.stringify(values),
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
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
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
        <input
          type="number"
          min="0"
          step="1000"
          {...form.register("total", { valueAsNumber: true })}
        />
      </label>
      <fieldset>
        <legend>Moneda</legend>
        <div className="choice-list compact">
          {(["PYG", "USD"] as const).map((currency) => (
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
      <FormActions><button
        className="primary"
        disabled={!clients.length || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creando…" : "Crear factura"}
      </button></FormActions>
    </form>
  );
}
const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Elegí una factura."),
  accountId: z.string().min(1, "Elegí una cuenta."),
  amount: z.number().positive("El cobro debe ser mayor a cero."),
  receivedOn: z.string().optional(),
  reference: z.string().max(120).optional(),
  receivedByUserId: z.string().optional(),
});
type PaymentValues = z.infer<typeof paymentSchema>;
function PaymentForm({
  invoices,
  accounts,
  custodians,
  done,
}: {
  invoices: Invoice[];
  accounts: Account[];
  custodians: Member[];
  done: () => void;
}) {
  const [requestId]=useState(()=>crypto.randomUUID());
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: "",
      accountId: "",
      amount: 0,
      receivedOn: new Date().toISOString().slice(0, 10),
      reference: "",
      receivedByUserId: "",
    },
  });
  const [error, setError] = useState("");
  async function submit(values: PaymentValues) {
    try {
      await request("/api/agency/payments", {
        method: "POST",
        body: JSON.stringify({...values,requestId}),
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
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
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
        <input
          type="number"
          min="1"
          step="1000"
          {...form.register("amount", { valueAsNumber: true })}
        />
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
      <FormActions><button
        className="primary"
        disabled={!accounts.length || form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Guardando…" : "Registrar cobro"}
      </button></FormActions>
    </form>
  );
}

const transferSchema = z.object({
  fromAccountId: z.string().min(1, "Elegí la cuenta de origen."),
  toAccountId: z.string().min(1, "Elegí la cuenta de destino."),
  amount: z.number().positive("El importe debe ser mayor a cero."),
  transferredOn: z.string().optional(),
  reference: z.string().max(120).optional(),
});
type TransferValues = z.infer<typeof transferSchema>;
function TransferForm({
  accounts,
  done,
}: {
  accounts: Account[];
  done: () => void;
}) {
  const form = useForm<TransferValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      fromAccountId: "",
      toAccountId: "",
      amount: 0,
      transferredOn: new Date().toISOString().slice(0, 10),
      reference: "",
    },
  });
  const [error, setError] = useState("");
  async function submit(values: TransferValues) {
    try {
      await request("/api/agency/transfers", {
        method: "POST",
        body: JSON.stringify(values),
      });
      done();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar la transferencia.",
      );
    }
  }
  return (
    <form
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(submit)}
    >
      <fieldset>
        <legend>Sale de</legend>
        <div className="choice-list">
          {accounts.map((account) => (
            <button
              type="button"
              className={
                form.watch("fromAccountId") === account.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("fromAccountId", account.id, {
                  shouldValidate: true,
                })
              }
              key={account.id}
            >
              {account.name} · {account.currency}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Entra a</legend>
        <div className="choice-list">
          {accounts.map((account) => (
            <button
              type="button"
              className={
                form.watch("toAccountId") === account.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("toAccountId", account.id, {
                  shouldValidate: true,
                })
              }
              key={account.id}
            >
              {account.name} · {account.currency}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Importe
        <input
          type="number"
          min="1"
          step="1000"
          {...form.register("amount", { valueAsNumber: true })}
        />
      </label>
      <label>
        Fecha
        <input type="date" {...form.register("transferredOn")} />
      </label>
      <label>
        Referencia
        <input
          {...form.register("reference")}
          placeholder="Comprobante o motivo"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <FormActions><button className="primary" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Guardando…" : "Registrar transferencia"}
      </button></FormActions>
    </form>
  );
}

export default function Home() {
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const pathname=usePathname(),router=useRouter();
  const lastDataPath=useRef(pathname);
  const requestedSection=sectionLabel(pathname);
  function setActive(label:string){router.push(sectionPath(label));}
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [myProfile,setMyProfile]=useState(false);
  const [detail,setDetail]=useState<{kind:'client'|'order';id:string}|null>(null);
  const [projectClient,setProjectClient]=useState('');
  const [user, setUser] = useState<User | null>(null);
  const active=signedIn&&!visibleModule(requestedSection,user?.role||'viewer')?'Sin acceso':requestedSection;
  const activeParent=parentSection(active);
  const allowedChildren=(label:string)=>childSections(label).filter(child=>visibleModule(child,user?.role||'viewer'));
  const visibleNav=nav.filter(([label])=>allowedChildren(label).length>0);
  useEffect(()=>{setModal(null);setProjectClient('');setDetail(null);setProductionClientId('');},[pathname]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [productionClientId, setProductionClientId] = useState("");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [custodians, setCustodians] = useState<Member[]>([]);
  const [metrics, setMetrics] = useState<MetricEvent[]>([]);
  const [paymentStatuses, setPaymentStatuses] = useState<ClientPaymentStatus[]>(
    [],
  );
  const [moraFilter, setMoraFilter] = useState("");
  const [summary, setSummary] = useState<Summary>({
    active_clients: 0,
    active_projects: 0,
    open_orders: 0,
  });
  async function load() {
    const [clientData, projectData, orderData, summaryData] = await Promise.all(
      [
        request<{ clients: Client[] }>("/api/agency/clients"),
        request<{ projects: Project[] }>("/api/agency/projects"),
        request<{ workOrders: WorkOrder[] }>("/api/agency/work-orders"),
        request<{ summary: Summary }>("/api/agency/summary"),
      ],
    );
    setClients(clientData.clients);
    setProjects(projectData.projects);
    setOrders(orderData.workOrders);
    setSummary(summaryData.summary);
  }
  useEffect(()=>{
    if(lastDataPath.current===pathname)return;
    lastDataPath.current=pathname;
    // Keep the mounted shell and session. Refresh records quietly after another module may have changed them.
    if(signedIn)void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron actualizar los datos.'));
  },[pathname,signedIn]);
  useEffect(()=>{if(signedIn&&toast){notify({tone:'error',message:toast});setToast('');}},[signedIn,toast]);
  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get("authError");
    if (authError) {
      setAuthNotice(authError);
      window.history.replaceState({}, "", window.location.pathname);
    }
    request<{ google: boolean }>("/api/auth/providers")
      .then((data) => setGoogleAvailable(data.google))
      .catch(() => setGoogleAvailable(false));
    request<{ user: User }>("/api/auth/me")
      .then((data) => {
        setDataScope(`${data.user.id}:${data.user.organization_id}:${data.user.role}`);
        setUser(data.user);
        setSignedIn(true);
        return load();
      })
      .catch(() => setSignedIn(false))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (signedIn && active === "Mora")
      request<{ clients: ClientPaymentStatus[] }>(
        `/api/agency/client-payment-status${moraFilter ? `?status=${moraFilter}` : ""}`,
      )
        .then((data) => setPaymentStatuses(data.clients))
        .catch((cause) =>
          setToast(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar la mora.",
          ),
        );
  }, [active, signedIn, moraFilter]);
  useEffect(() => {
    if (signedIn && active === "Presupuestos")
      request<{ budgets: Budget[] }>("/api/agency/budgets")
        .then((data) => setBudgets(data.budgets))
        .catch((cause) =>
          setToast(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los presupuestos.",
          ),
        );
  }, [active, signedIn]);
  async function loadFinance() {
    const [accountData, invoiceData, transferData, paymentData, custodianData] =
      await Promise.all([
        request<{ accounts: Account[] }>("/api/agency/accounts"),
        request<{ invoices: Invoice[] }>("/api/agency/invoices"),
        request<{ transfers: AccountTransfer[] }>("/api/agency/transfers"),
        request<{ payments: PaymentRecord[] }>("/api/agency/payments"),
        request<{ members: Member[] }>("/api/agency/custodians"),
      ]);
    setAccounts(accountData.accounts);
    setInvoices(invoiceData.invoices);
    setTransfers(transferData.transfers);
    setPayments(paymentData.payments);
    setCustodians(custodianData.members);
  }
  useEffect(() => {
    if (signedIn && active === "Pagos")
      loadFinance().catch((cause) =>
        setToast(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar las finanzas.",
        ),
      );
  }, [active, signedIn]);
  useEffect(() => {
    if (
      signedIn &&
      active === "Métricas" &&
      ["owner", "admin"].includes(user?.role || "")
    )
      request<{ events: MetricEvent[] }>("/api/metrics")
        .then((data) => setMetrics(data.events))
        .catch((cause) =>
          setToast(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las métricas.",
          ),
        );
  }, [active, signedIn, user?.role]);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    setToast("");
    try {
      await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await request<{ user: User }>("/api/auth/me");
      setDataScope(`${data.user.id}:${data.user.organization_id}:${data.user.role}`);
      setUser(data.user);
      setSignedIn(true);
      await load();
    } catch (cause) {
      setToast(
        cause instanceof Error ? cause.message : "No se pudo iniciar sesión.",
      );
    }
  }
  async function logout() {
    setMyProfile(false);setDetail(null);
    setDataScope('');
    setProductionClientId("");
    sessionStorage.removeItem("scale_company_selected");
    await request("/api/auth/logout", { method: "POST" }).catch(
      () => undefined,
    );
    setSignedIn(false);
    setUser(null);
  }
  async function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const target = String(event.over?.id || "");
    if (!target.startsWith("status-")) return;
    const status = target.replace("status-", "") as Status;
    const current = orders.find((order) => order.id === id);
    if (!current || current.status === status) return;
    const previous = orders;
    setOrders((items) =>
      items.map((order) => (order.id === id ? { ...order, status } : order)),
    );
    try {
      await request(`/api/agency/work-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (cause) {
      setOrders(previous);
      setToast(
        cause instanceof Error ? cause.message : "No se pudo mover la orden.",
      );
    }
  }
  const close = () => {setModal(null);setProjectClient('');};
  const selectedProductionClient = clients.some(client => String(client.id) === productionClientId) ? productionClientId : "";
  const productionOrders = filterProductionOrders(orders, projects, selectedProductionClient);
  if (loading) return <div className="loading-page">Cargando Scale OS…</div>;
  if (!signedIn)
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand login-brand">
            <span className="brand-mark">S</span>
            <div>
              scale<span>OS</span>
              <small>OPERACIONES</small>
            </div>
          </div>
          <p className="eyebrow">PANEL INTERNO</p>
          <h1>Entrá a Scale OS</h1>
          <p className="login-copy">
            Clientes, proyectos y operación en un solo lugar.
          </p>
          {authNotice && (
            <div className="auth-notice" role="status">
              <b>Acceso pendiente</b>
              <p>{authNotice}</p>
            </div>
          )}
          <form noValidate onSubmit={login}>
            <label>
              Email
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="Tu email"
                required
              />
            </label>
            <label>
              Contraseña
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="••••••••"
                required
              />
            </label>
            <button className="primary login-button">Iniciar sesión</button>
            {toast && <p className="error">{toast}</p>}
          </form>
          <div className="login-divider"><span>o</span></div>
          <button
            type="button"
            className="google-login-button"
            disabled={!googleAvailable}
            onClick={() => {
              window.location.href = 'https://admin.scaleparaguay.com/api/auth/google/start';
            }}
          >
            <span className="google-g">G</span>
            {googleAvailable ? "Continuar con Google" : "Google aún no está configurado"}
          </button>
          <PasswordPanel/>
        </div>
      </div>
    );
  const firstName = user?.email.split("@")[0] || "U";
  const metricTotals = metrics.reduce<Record<string, number>>(
    (totals, event) => ({
      ...totals,
      [event.name]: (totals[event.name] || 0) + event.count,
    }),
    {},
  );
  const sidebarContent=<>
        <p className="nav-caption">Espacio de trabajo</p>
        <nav aria-label="Menú principal">
          {visibleNav.map(([label, Icon]) => (
            <Link
              key={label}
              className={activeParent === label ? "active" : ""}
              aria-current={activeParent===label?'page':undefined}
              href={sectionPath(allowedChildren(label)[0])}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-footer"><button className="user" aria-label="Abrir mi perfil" onClick={()=>setMyProfile(true)}>
            {user?.photo_url?<img src={user.photo_url} alt="" width={36} height={36}/>:<div className="avatar">{(user?.full_name||firstName)[0].toUpperCase()}</div>}
            <div>
              <b>{user?.full_name||firstName}</b>
              <small>{assignableRoles.find(role=>role.id===user?.role)?.label||user?.role}</small>
            </div>
          </button>
          <button className="logout-only" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18}/></button></div>
        </div>
      </>;
  return (
    <main className="shell control-shell">
      <aside>
        <div className="sidebar-brand"><WorkspaceBrand/></div>
        {sidebarContent}
      </aside>
      <section className="content">
        <div className="workspace-topbar"><div className="topbar-identity"><MobileNavigation>{sidebarContent}</MobileNavigation><Link href={sectionPath('Resumen')} className="topbar-logo" aria-label="Scale OS · Ir al resumen"><WorkspaceBrand/></Link></div><CompanySelector name={user?.organization_name || 'Organización'}/><WorkspaceSearch role={user?.role||'viewer'} refresh={load} navigate={setActive} records={[
          ...clients.map(c=>({id:c.id,name:c.name,context:`Cliente · ${c.email||''}`,kind:'clients' as const})),
          ...projects.map(p=>({id:p.id,name:p.name,context:`Proyecto · ${p.client_name}`,kind:'projects' as const})),
          ...orders.map(o=>({id:o.id,name:o.title,context:`Orden · ${o.client_name} · ${o.project_name}`,kind:'work-orders' as const})),
        ]}/></div>
        <header>
          <div>
            <p className="eyebrow">{active==='Resumen'?'TU AGENCIA, EN UN VISTAZO':'ESPACIO DE TRABAJO'}</p>
            <h1>{active==='Resumen'?'Centro de control':activeParent}</h1>
          </div>
          <div className="header-actions">
            <WorkspaceGuide navigate={setActive} role={user?.role||'viewer'}/>
            {((active==='Clientes'&&['owner','admin','management','sales'].includes(user?.role||''))||(['Proyectos','Resumen'].includes(active)&&['owner','admin','management','production'].includes(user?.role||''))||active==='Presupuestos') && (
              <button
                className="primary"
                onClick={() =>
                  setModal(
                    active === "Clientes"
                      ? "client"
                      : active === "Proyectos"
                        ? "project"
                          : active === "Presupuestos"
                            ? "budget"
                            : "order",
                  )
                }
              >
                <Plus size={18} /> {active==='Clientes'?'Nuevo cliente':active==='Proyectos'?'Nuevo proyecto':active==='Presupuestos'?'Nuevo presupuesto':'Nueva orden'}
              </button>
            )}
          </div>
        </header>
        {active!=='Sin acceso'&&childSections(active).length>1&&<nav className="section-tabs" aria-label={`Apartados de ${activeParent}`}>{allowedChildren(activeParent).map(label=><Link key={label} href={sectionPath(label)} aria-current={active===label?'page':undefined}>{tabLabels[label]||label}</Link>)}</nav>}
        {active==='Sin acceso'&&<section className="panel"><h2>No tenés permiso para esta sección</h2><p>Podés elegir otra sección del menú o pedir al dueño que revise tu acceso.</p><button className="primary" onClick={()=>setActive('Resumen')}>Ir al resumen</button></section>}
        {active==='Equipo'&&<OperationsWorkspace key="people" mode="people" role={user?.role||'viewer'} currentEmail={user?.email||''} organizationName={user?.organization_name||''}/>}
        {active==='Equipo'&&<WorkHistory role={user?.role||'viewer'}/>}
        {active==='Comisiones'&&<OperationsWorkspace key="commissions" mode="commissions" role={user?.role||'viewer'}/>}
        {active==='Pipeline'&&<CatalogWorkspace key="leads" kind="leads" role={user?.role||'viewer'}/>}
        {active==='Planes'&&<CatalogWorkspace key="plans" kind="plans" role={user?.role||'viewer'}/>}
        {active==='Inventario'&&<CatalogWorkspace key="inventory" kind="inventory" role={user?.role||'viewer'}/>}
        {active==='Actividad'&&<ActivityWorkspace/>}
        {active==='Configuración'&&<div className="ops-stack"><SettingsWorkspace/><NewCompany/></div>}
        {active==='Papelera'&&<TrashWorkspace refresh={load}/>}
        {active === "Resumen" && (
          <>
            <ControlCenter role={user?.role||'viewer'} orders={orders} refresh={load} navigate={setActive}/>
            <WorkPlanner orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>
            <InternalTasks role={user?.role||'viewer'}/>
            <section className="metrics operational-metrics" aria-label="Métricas operativas">
              <article className="metric gold">
                <span>Clientes activos</span>
                <strong>{summary.active_clients}</strong>
                <small>Base actual de la agencia</small>
              </article>
              <article className="metric violet">
                <span>Proyectos activos</span>
                <strong>{summary.active_projects}</strong>
                <small>Con trabajo en curso</small>
              </article>
              <article className="metric blue">
                <span>Órdenes abiertas</span>
                <strong>{summary.open_orders}</strong>
                <small>Seguimiento diario</small>
              </article>
              <article className="metric green">
                <span>En revisión</span>
                <strong>{orders.filter(order=>order.status==='review').length}</strong>
                <small>Piezas para aprobar</small>
              </article>
            </section>
            <section className="panel production-panel" id="produccion">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">OPERACIÓN DIARIA</p>
                  <h2>Tablero de producción</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => setActive("Proyectos")}
                >
                  Ver proyectos →
                </button>
              </div>
              <div className="production-filters">
                <SelectCustom
                  label="Filtrar por cliente"
                  value={selectedProductionClient}
                  choices={[
                    {value: "", label: "Todos los clientes"},
                    ...[...clients].sort((a,b) => a.name.localeCompare(b.name, 'es')).map(client => ({value: String(client.id), label: client.name})),
                  ]}
                  onChange={setProductionClientId}
                />
                <p className="production-filter-summary" role="status" aria-live="polite">
                  {productionOrders.length} de {orders.length} órdenes
                </p>
                {selectedProductionClient && <button className="text-button" onClick={() => setProductionClientId("")}>Ver todos</button>}
              </div>
              {selectedProductionClient && productionOrders.length === 0 && <p className="empty-copy">Este cliente todavía no tiene órdenes de producción.</p>}
              <DndContext onDragEnd={onDragEnd}>
                <div className="kanban">
                  {statuses.map((status) => (
                    <KanbanColumn
                      openOrder={id=>setDetail({kind:'order',id})}
                      role={user?.role||'viewer'}
                      refresh={load}
                      key={status.id}
                      status={status}
                      orders={productionOrders.map(order=>{const project=projects.find(p=>String(p.id)===String(order.project_id));const client=clients.find(c=>String(c.id)===String(project?.client_id));return {...order,client_logo_url:client?.logo_url,client_color_key:client?.color_key};}).filter(
                        (order) => order.status === status.id,
                      )}
                    />
                  ))}
                </div>
              </DndContext>
              <p className="board-note">
                Arrastrá una orden de una columna a otra para actualizar su
                estado.
              </p>
            </section>
          </>
        )}
        {active === "Métricas" && (
          <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">SITIO PÚBLICO</p>
                <h2>Conversión de Scale</h2>
              </div>
              <span>Últimos 12 meses</span>
            </div>
            {["owner", "admin"].includes(user?.role || "") ? (
              <div className="client-list">
                {Object.entries(metricTotals).length ? (
                  Object.entries(metricTotals).map(([name, count]) => (
                    <div className="payment-row" key={name}>
                      <div>
                        <b>{name.replaceAll("_", " ")}</b>
                        <small>Eventos registrados</small>
                      </div>
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <p className="empty-copy">
                    Aún no hay conversiones registradas en este período.
                  </p>
                )}
              </div>
            ) : (
              <p className="empty-copy">
                Tu permiso no permite ver métricas comerciales.
              </p>
            )}
          </section>
        )}
        {active === "Mora" && (
          <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">CRM · COBRANZAS</p>
                <h2>Estado de pagos</h2>
              </div>
              <span>Actualizado hoy</span>
            </div>
            <div
              className="choice-list compact"
              aria-label="Filtrar estado de cobro"
            >
              {[
                ["", "Todos"],
                ["up_to_date", "Al día"],
                ["due_soon", "Por vencer"],
                ["late", "Mora 1–30"],
                ["severe", "Mora grave"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  className={moraFilter === value ? "choice active" : "choice"}
                  onClick={() => setMoraFilter(value)}
                  key={value || "all"}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="client-list">
              {paymentStatuses.length ? (
                paymentStatuses.map((client, index) => (
                  <div
                    className="client-row"
                    key={`${client.client_id}-${client.currency || "none"}`}
                  >
                    <div
                      className={`client-avatar ${["green", "yellow", "purple", "blue"][index % 4]}`}
                    >
                      {client.client_name[0]}
                    </div>
                    <div>
                      <b>{client.client_name}</b>
                      <small>
                        {client.payment_status === "up_to_date"
                          ? "Al día"
                          : client.payment_status === "due_soon"
                            ? `Vence ${client.next_due_on || "próximamente"}`
                            : `${client.days_overdue} días de mora`}
                      </small>
                    </div>
                    <span>
                      {client.currency
                        ? new Intl.NumberFormat("es-PY", {
                            style: "currency",
                            currency: client.currency,
                            maximumFractionDigits: 0,
                          }).format(Number(client.outstanding_amount))
                        : "Sin saldo pendiente"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No hay clientes en esta categoría.</p>
              )}
            </div>
          </section>
        )}
        {active === "Clientes" && (
          <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">BASE COMERCIAL</p>
                <h2>Clientes de {user?.organization_name}</h2>
              </div>
              <button className="primary" onClick={() => setModal("client")}>
                <Plus size={16} /> Cliente
              </button>
            </div>
            <div className="client-list">
              {clients.length ? (
                clients.map((client) => (
                  <div className="client-row" key={client.id}>
                    <div>
                      <button className="text-button" onClick={()=>setDetail({kind:'client',id:client.id})}><ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/></button>
                      <small>{client.email || "Sin email registrado"}</small>
                    </div>
                    <span>{client.phone || "Sin teléfono"}</span>
                    <RecordEditor kind="clients" recordId={client.id} name={client.name} role={user?.role||'viewer'} refresh={load}/>
                  </div>
                ))
              ) : (
                <p className="empty-copy">
                  Todavía no hay clientes. Creá el primero para empezar.
                </p>
              )}
            </div>
          </section>
        )}
        {active === "Proyectos" && (
          <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">OPERACIÓN</p>
                <h2>Proyectos y enlaces</h2>
              </div>
              <button className="primary" onClick={() => setModal("project")}>
                <Plus size={16} /> Proyecto
              </button>
            </div>
            <div className="project-grid">
              {projects.length ? (
                projects.map((project) => (
                  <article className={`project-card identity-card identity-${identityColor(clients.find(c=>String(c.id)===String(project.client_id))?.color_key)}`} key={project.id}>
                    <ClientIdentity name={project.client_name} logo={clients.find(c=>String(c.id)===String(project.client_id))?.logo_url} color={clients.find(c=>String(c.id)===String(project.client_id))?.color_key}/>
                    <h3>{project.name}</h3>
                    <p>{project.work_order_count} órdenes de trabajo</p>
                    {project.drive_url ? (
                      <a
                        href={project.drive_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkIcon size={14} /> Abrir Drive
                      </a>
                    ) : (
                      <span>Sin enlace de Drive</span>
                    )}
                    <ProjectComments projectId={project.id} name={project.name} role={user?.role||'viewer'}/>
                    <RecordEditor kind="projects" recordId={project.id} name={project.name} role={user?.role||'viewer'} refresh={load}/>
                  </article>
                ))
              ) : (
                <p className="empty-copy">
                  Creá un proyecto después de cargar un cliente.
                </p>
              )}
            </div>
          </section>
        )}
        {active === "Presupuestos" && (
          <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">COMERCIAL</p>
                <h2>Presupuestos</h2>
              </div>
              <button className="primary" onClick={() => setModal("budget")}>
                <Plus size={16} /> Presupuesto
              </button>
            </div>
            <div className="project-grid">
              {budgets.length ? (
                budgets.map((budget) => (
                  <article className="project-card" key={budget.id}>
                    <p className="eyebrow">
                      {budget.number} · {budget.client_name}
                    </p>
                    <h3>{budget.title}</h3>
                    <p>
                      {budget.item_count} ítem ·{" "}
                      {budget.status === "draft" ? "Borrador" : budget.status}
                    </p>
                    <strong>
                      {new Intl.NumberFormat("es-PY", {
                        style: "currency",
                        currency: budget.currency,
                        maximumFractionDigits: 0,
                      }).format(Number(budget.total))}{" "}
                      IVA incl.
                    </strong>
                    <BudgetActions id={budget.id} refresh={async()=>setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets)}/>
                    <RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={async()=>setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets)}/>
                  </article>
                ))
              ) : (
                <p className="empty-copy">
                  Todavía no hay presupuestos. Creá el primero con un valor sin
                  IVA.
                </p>
              )}
            </div>
          </section>
        )}
        {active === "Pagos" && (
          <section className="finance-grid">
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">DISPONIBILIDAD</p>
                  <h2>Cuentas</h2>
                </div>
                <div className="inline-actions">
                  <button
                    className="text-button"
                    onClick={() => setModal("account")}
                  >
                    + Cuenta
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setModal("transfer")}
                  >
                    Transferir
                  </button>
                </div>
              </div>
              {accounts.length ? (
                <div className="client-list">
                  {accounts.map((account) => (
                    <div className="payment-row" key={account.id}>
                      <div>
                        <b>{account.name}</b>
                        <small>
                          {account.account_type} · {account.currency}
                          {account.custodian_email
                            ? ` · Custodia: ${account.custodian_email}`
                            : ""}
                        </small>
                        <RemoveRecord kind="accounts" id={account.id} name={account.name} role={user?.role||'viewer'} done={loadFinance}/>
                      </div>
                      <strong>
                        {new Intl.NumberFormat("es-PY", {
                          style: "currency",
                          currency: account.currency,
                          maximumFractionDigits: 0,
                        }).format(Number(account.balance))}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  Creá la primera cuenta para registrar cobros.
                </p>
              )}
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">TRAZABILIDAD</p>
                  <h3>Transferencias recientes</h3>
                </div>
              </div>
              {transfers.length ? (
                <div className="client-list">
                  {transfers.slice(0, 5).map((transfer) => (
                    <div className="payment-row" key={transfer.id}>
                      <div>
                        <b>
                          {transfer.from_account_name} →{" "}
                          {transfer.to_account_name}
                        </b>
                        <small>
                          {transfer.transferred_on} ·{" "}
                          {transfer.created_by_email || "Sistema"}
                          {transfer.reference ? ` · ${transfer.reference}` : ""}
                        </small>
                        {transfer.to_currency&&<small>Recibido: {new Intl.NumberFormat('es-PY',{style:'currency',currency:transfer.to_currency,maximumFractionDigits:transfer.to_currency==='PYG'?0:2}).format(Number(transfer.received_amount||transfer.amount))}</small>}
                      </div>
                      <strong>
                        {new Intl.NumberFormat("es-PY", {
                          style: "currency",
                          currency:
                            accounts.find(
                              (account) =>
                                account.id === transfer.from_account_id,
                            )?.currency || "PYG",
                          maximumFractionDigits: 0,
                        }).format(Number(transfer.amount))}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  Aún no hay transferencias entre cuentas.
                </p>
              )}
            </section>
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">FACTURACIÓN</p>
                  <h2>Cobros pendientes</h2>
                </div>
                <div className="inline-actions">
                  <button
                    className="text-button"
                    onClick={() => setModal("invoice")}
                  >
                    + Factura
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setModal("payment")}
                  >
                    Registrar cobro
                  </button>
                </div>
              </div>
              {invoices.length ? (
                <div className="client-list">
                  {invoices.map((invoice) => (
                    <div className="payment-row" key={invoice.id}>
                      <div>
                        <b>
                          {invoice.number} · {invoice.client_name}
                        </b>
                        <small>
                          {invoice.status} · pendiente{" "}
                          {new Intl.NumberFormat("es-PY", {
                            style: "currency",
                            currency: invoice.currency,
                            maximumFractionDigits: 0,
                          }).format(
                            Number(invoice.total) - Number(invoice.paid_amount),
                          )}
                        </small>
                      </div>
                      <strong>
                        {new Intl.NumberFormat("es-PY", {
                          style: "currency",
                          currency: invoice.currency,
                          maximumFractionDigits: 0,
                        }).format(Number(invoice.total))}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  Todavía no hay facturas registradas.
                </p>
              )}
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">COBROS REGISTRADOS</p>
                  <h3>Quién cobró y dónde quedó</h3>
                </div>
              </div>
              {payments.length ? (
                <div className="client-list">
                  {payments.map((payment) => (
                    <div className="payment-row" key={payment.id}>
                      <div>
                        <b>
                          {payment.client_name} · {payment.invoice_number}
                        </b>
                        <small>
                          {payment.received_on} · {payment.account_name} (
                          {payment.account_type}) · recibió{" "}
                          {payment.received_by_email || "Sin asignar"}
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </small>
                        <ReceiptReversal payment={payment} refresh={loadFinance}/>
                      </div>
                      <strong>
                        {new Intl.NumberFormat("es-PY", {
                          style: "currency",
                          currency: payment.currency,
                          maximumFractionDigits: 0,
                        }).format(Number(payment.amount))}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">Aún no hay cobros registrados.</p>
              )}
            </section>
            <ReconciliationWorkspace accounts={accounts}/>
          </section>
        )}
      </section>
      {myProfile&&user&&<MyProfile profile={user} close={()=>setMyProfile(false)} refresh={async()=>{clearDataCache();const d=await request<{user:User}>('/api/auth/me');setUser(d.user);}}/>}
      {detail?.kind==='order'&&<WorkDetail key={detail.id} id={detail.id} role={user?.role||'viewer'} close={()=>setDetail(null)} refresh={load}/>}
      {detail?.kind==='client'&&<ClientDetail key={detail.id} id={detail.id} role={user?.role||'viewer'} close={()=>setDetail(null)} refresh={load} createProject={id=>{setProjectClient(id);setDetail(null);setModal('project');}} openOrder={id=>setDetail({kind:'order',id})}/>}
      {modal === "client" && (
        <Modal title="Nuevo cliente" onClose={close}>
          <ClientForm
            done={(client) => {
              setClients((current) => [client, ...current]);
              setSummary((current) => ({
                ...current,
                active_clients: current.active_clients + 1,
              }));
              close();
            }}
          />
        </Modal>
      )}
      {modal === "project" && (
        <Modal title="Nuevo proyecto" onClose={close}>
          <ProjectForm
            clients={clients}
            initialClientId={projectClient}
            done={async () => {
              await load();
              close();
            }}
          />
        </Modal>
      )}
      {modal === "order" && (
        <Modal title="Nueva orden de trabajo" onClose={close}>
          <OrderForm
            projects={projects}
            done={async () => {
              await load();
              close();
            }}
          />
        </Modal>
      )}
      {modal === "budget" && (
        <Modal title="Nuevo presupuesto" onClose={close}>
          <QuoteComposer mode="create" done={async()=>{setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets);close();}}/>
        </Modal>
      )}
      {modal === "account" && (
        <Modal title="Nueva cuenta" onClose={close}>
          <AccountForm
            custodians={custodians}
            done={(account) => {
              setAccounts((current) => [...current, account]);
              close();
            }}
          />
        </Modal>
      )}
      {modal === "invoice" && (
        <Modal title="Nueva factura" onClose={close}>
          <InvoiceForm
            clients={clients}
            done={(invoice) => {
              setInvoices((current) => [invoice, ...current]);
              close();
            }}
          />
        </Modal>
      )}
      {modal === "payment" && (
        <Modal title="Registrar cobro" onClose={close}>
          <PaymentForm
            invoices={invoices}
            accounts={accounts}
            custodians={custodians}
            done={async () => {
              await loadFinance();
              close();
            }}
          />
        </Modal>
      )}
      {modal === "transfer" && (
        <Modal title="Transferir entre cuentas" onClose={close}>
          <FXTransferForm
            accounts={accounts}
            done={async () => {
              await loadFinance();
              close();
            }}
          />
        </Modal>
      )}
    </main>
  );
}
