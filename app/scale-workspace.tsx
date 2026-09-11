"use client";
import {formatMoney} from './amount-format';
import {currencyCodes,currencyLabels,Currency} from "./currencies";
import {usePathname,useRouter} from 'next/navigation';
import {sectionLabel,sectionPath,parentSection,childSections,tabLabels} from './navigation';
import Link from 'next/link';
import {ControlCenter} from './control-center';
import {WorkspaceSearch} from './workspace-search';
import {WorkspaceBrand} from './workspace-brand';
import {MobileNavigation} from './mobile-navigation';
import {DesktopSidebar} from './desktop-sidebar';
import {clientStatuses,clientState} from './client-status';
import './client-directory.css';
import dynamic from 'next/dynamic';
import {ClientIdentity,identityColor} from './client-identity';
import {NotificationBell} from './notifications-ui';
import {WorkspaceFooter} from './workspace-footer';
const InviteLinks=dynamic(()=>import('./invite-links').then(m=>m.InviteLinks));
const GrowthDashboard=dynamic(()=>import('./growth-dashboard').then(m=>m.GrowthDashboard));
const ReportsWorkspace=dynamic(()=>import('./reports-workspace').then(m=>m.ReportsWorkspace));
const DemoToolbar=dynamic(()=>import('./demo-toolbar').then(m=>m.DemoToolbar));
const MyProfile=dynamic(()=>import('./my-profile').then(m=>m.MyProfile));
const ClientRuc=dynamic(()=>import('./client-ruc').then(m=>m.ClientRuc));
const PresenceTracker=dynamic(()=>import('./presence').then(m=>m.PresenceTracker),{ssr:false});
import {BoardPresence,ProjectCardPresence} from './presence';
import {CompanyCurrencyProvider,useCompanyCurrency} from './currency-provider';
import {FinancialForecast} from './financial-forecast';
import {LiveVisitors} from './live-visitors';
const UsagePanel=dynamic(()=>import('./presence').then(m=>m.UsagePanel));
const InventoryWorkspace=dynamic(()=>import('./inventory-workspace').then(m=>m.InventoryWorkspace));
const WorkDetail=dynamic(()=>import('./productivity-ui').then(m=>m.WorkDetail));
const ClientDetail=dynamic(()=>import('./productivity-ui').then(m=>m.ClientDetail));
const WorkPlanner=dynamic(()=>import('./productivity-ui').then(m=>m.WorkPlanner));
const WorkHistory=dynamic(()=>import('./work-history').then(m=>m.WorkHistory));
const InternalTasks=dynamic(()=>import('./work-history').then(m=>m.InternalTasks));
import {dataFetch,setDataScope,clearDataCache} from './data-cache';
import './control-center.css';
import './production-focus.css';
import './mobile-navigation.css';
import './workspace-density.css';
import {Dialog} from './dialog';
import {SaveActions} from './save-actions';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {completeSave} from './save-completion';
import {OperationsWorkspace, ProjectComments, CompanySelector} from './operations';
import './operations.css';
import './suite.css';
import {CatalogWorkspace,RecordEditor,BudgetActions,ActivityWorkspace,SettingsWorkspace} from './suite';
import {QuoteComposer} from './quote-composer';
import {PasswordPanel} from './password-panel';
import {WorkspaceGuide,workspaceGuideScope,visibleModule,NewCompany,type WorkspaceGuideData} from './workspace-guide';
import {FXTransferForm,ReceiptReversal,ReconciliationWorkspace} from './daily-controls';
import {SelectCustom} from './profile-controls';
import {filterProductionOrders} from './production-filter';
import {defaultWorkspacePreferences,startupChoices,workspacePreferenceKey,type StartupPreference} from './workspace-preferences';
import {useWorkspacePreferences,useStartupPreference,useLocalCalendarDay} from './use-workspace-preferences';
import {RemoveRecord,TrashWorkspace} from './archive-controls';
import {notify,notifyMutation} from './feedback';
import {SubscriptionPanel,SubscriptionNotice,type SubscriptionState} from './subscription-panel';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ViewToggle } from "./view-toggle";
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
  ["Producción", FolderKanban],
  ["Clientes", Users],
  ["Proyectos", FolderKanban],
  ["Presupuestos", FileText],
  ["Finanzas", WalletCards],
  ["Informes", BarChart3],
  ["Equipo", BriefcaseBusiness],
  ["Pipeline", FolderKanban],
  ["Inventario", BriefcaseBusiness],
  ["Configuración", Settings],
] as const;
type Client = {
  lifecycle_status?:string;
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
  assigned_user_ids?:string[];
  checklist_total?:number;
  checklist_completed?:number;
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
  currency: Currency;
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
  currency: Currency;
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
  currency: Currency;
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
  currency: Currency;
  total: string;
  paid_amount: string;
  due_on: string | null;
};
type MetricEvent = { name: string; event_date: string; count: number };
type ClientPaymentStatus = {
  client_id: string;
  client_name: string;
  currency: Currency | null;
  outstanding_amount: string;
  next_due_on: string | null;
  days_overdue: number;
  payment_status: "up_to_date" | "due_soon" | "late" | "severe";
};
type User = {
  subscription?:SubscriptionState;
  id:string;
  organization_id:string;
  full_name?:string|null;
  photo_url?:string|null;
  email: string;
  role: string;
  organization_name: string;
  organization_slug: string;
  demo_owner_user_id?:string|null;
  default_currency?:Currency;
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
        <button className="text-button order-open" aria-label={`Abrir ${order.title}`} onClick={()=>openOrder(order.id)}>{order.title}</button>
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
      <ProjectCardPresence projectId={String(order.project_id)}/>
      {!!order.checklist_total&&<small className="card-checklist" aria-label={`${order.checklist_completed||0} de ${order.checklist_total} pasos completados`}>☑ {order.checklist_completed||0}/{order.checklist_total} pasos</small>}
      <div className="order-actions"><button className="text-button" onClick={()=>openOrder(order.id)}>Ver detalle completo</button>{canMove&&<RecordEditor kind="work-orders" recordId={order.id} name={order.title} refresh={refresh} role={role}/>}</div>
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
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
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
        Teléfono
        <input {...form.register("phone")} />
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>
        {submission.pending ? "Guardando…" : "Crear cliente"}
      </button></SaveActions>
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
const budgetSchema = z.object({
  title: z.string().trim().min(2, "Describí el presupuesto."),
  clientId: z.string().min(1, "Elegí un cliente."),
  description: z.string().trim().min(2, "Describí el servicio."),
  quantity: z.number().positive("La cantidad debe ser mayor a cero."),
  unitPrice: z.number().min(0, "El importe no puede ser negativo."),
  currency: z.enum(currencyCodes),
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
  const {currency:defaultCurrency}=useCompanyCurrency();
  const form = useForm<BudgetValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      title: "",
      clientId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      currency: defaultCurrency,
      validUntil: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
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
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
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
          {currencyCodes.map((currency) => (
            <button
              type="button"
              className={
                form.watch("currency") === currency ? "choice active" : "choice"
              }
              onClick={() => form.setValue("currency", currency)}
              key={currency}
            >
              {currencyLabels[currency]}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Válido hasta
        <input type="date" {...form.register("validUntil")} />
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!clients.length || submission.pending}
      >
        {submission.pending ? "Creando…" : "Crear presupuesto"}
      </button></SaveActions>
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
function AccountForm({
  custodians,
  done,
}: {
  custodians: Member[];
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
  total: z.number().min(0, "El importe no puede ser negativo."),
  currency: z.enum(currencyCodes),
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
  const {currency:defaultCurrency}=useCompanyCurrency();
  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { clientId: "", total: 0, currency: defaultCurrency, dueOn: "" },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
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
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
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
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!accounts.length || submission.pending}
      >
        {submission.pending ? "Guardando…" : "Registrar cobro"}
      </button></SaveActions>
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
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
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
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
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
      <SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>
        {submission.pending ? "Guardando…" : "Registrar transferencia"}
      </button></SaveActions>
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
  const [clientView,setClientView]=useState('list'),[clientStatusFilter,setClientStatusFilter]=useState('');
  const [projectView,setProjectView]=useState('grid');
  useEffect(()=>{try{setClientView(localStorage.getItem('scale:client-view')==='grid'?'grid':'list');}catch{/* Optional UI preference. */}},[]);
  useEffect(()=>{try{setProjectView(localStorage.getItem('scale:project-view')==='list'?'list':'grid');}catch{/* Optional UI preference. */}},[]);
  function changeClientView(value:string){setClientView(value);try{localStorage.setItem('scale:client-view',value);}catch{/* Optional UI preference. */}}
  function changeProjectView(value:string){setProjectView(value);try{localStorage.setItem('scale:project-view',value);}catch{/* Optional UI preference. */}}
  const [user, setUser] = useState<User | null>(null);
  const [guideData,setGuideData]=useState<WorkspaceGuideData>({scope:null,status:'unknown'});
  const dataLoadSequence=useRef(0);
  const guideProps={userId:user?.id,organizationId:user?.organization_id,role:user?.role||'viewer',demo:!!user?.demo_owner_user_id,data:guideData,navigate:setActive};
  const {key:preferenceScope,ready:preferencesReady,preferences,warning:preferenceWarning,update:updatePreferences}=useWorkspacePreferences(signedIn?String(user?.id||''):'',signedIn?String(user?.organization_id||''):'');
  const [productionFiltersDialogScope,setProductionFiltersDialogScope]=useState('');
  const [startupDataScope,setStartupDataScope]=useState('');
  const productionToday=useLocalCalendarDay();
  const [subscriptionOpen,setSubscriptionOpen]=useState(false),[subscriptionError,setSubscriptionError]=useState('');
  const previousBillingAccess=useRef<boolean|null>(null);
  const operationalAccess=signedIn&&user?.subscription?.hasAccess!==false;
  useStartupPreference({scope:preferenceScope,ready:preferencesReady&&!loading&&(user?.subscription?.hasAccess===false||startupDataScope===preferenceScope),enabled:operationalAccess,pathname,role:user?.role||'',startup:preferences.startup,replace:path=>router.replace(path)});
  async function refreshSubscription(){
    const d=await request<{user:User}>('/api/auth/me');
    if(user&&String(d.user.organization_id)!==String(user.organization_id)){window.location.reload();return;}
    clearDataCache();setUser(d.user);setSubscriptionError('');
  }
  useEffect(()=>{
    if(!signedIn||!user)return;
    let disposed=false,running=false;let controller:AbortController|null=null;
    const check=async()=>{
      if(running||document.visibilityState==='hidden')return;
      running=true;controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),10000);
      try{
        const r=await fetch('/core-api/api/auth/me',{credentials:'include',cache:'no-store',signal:controller.signal});
        if(r.status===401){if(!disposed)clearSessionState();return;}
        if(!r.ok)throw Error('No se pudo comprobar la suscripción. Intentá actualizar.');
        const d=await r.json() as {user:User};if(disposed)return;
        if(String(d.user.organization_id)!==String(user.organization_id)||String(d.user.id)!==String(user.id)){window.location.reload();return;}
        if(d.user.subscription?.hasAccess===false)clearDataCache();
        setUser(d.user);setSubscriptionError('');
      }catch{if(!disposed)setSubscriptionError('No se pudo actualizar el estado de la suscripción.');}
      finally{clearTimeout(timeout);running=false;}
    };
    const refresh=()=>{void check();};
    const timer=setInterval(refresh,60000);
    window.addEventListener('scale:billing-refresh',refresh);document.addEventListener('visibilitychange',refresh);
    return()=>{disposed=true;clearInterval(timer);controller?.abort();window.removeEventListener('scale:billing-refresh',refresh);document.removeEventListener('visibilitychange',refresh);};
  },[signedIn,user?.id,user?.organization_id]);
  useEffect(()=>{
    let active=true;
    const refreshIdentity=()=>{void request<{user:User}>('/api/auth/me').then(d=>{if(active)setUser(d.user);}).catch(()=>{});};
    window.addEventListener('scale:identity-changed',refreshIdentity);
    return()=>{active=false;window.removeEventListener('scale:identity-changed',refreshIdentity);};
  },[]);
  const active=signedIn&&!visibleModule(requestedSection,user?.role||'viewer')?'Sin acceso':requestedSection;
  const activeParent=parentSection(active);
  const allowedChildren=(label:string)=>childSections(label).filter(child=>visibleModule(child,user?.role||'viewer'));
  const visibleNav=nav.filter(([label])=>allowedChildren(label).length>0);
  useEffect(()=>{setModal(null);setProjectClient('');setDetail(null);},[pathname]);
  useEffect(()=>{if(signedIn){const id=new URLSearchParams(window.location.search).get('order');if(id&&/^\d+$/.test(id))setDetail({kind:'order',id});}},[signedIn,pathname]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const productionClientId=preferences.production.clientId;
  function setProductionClientId(clientId:string){updatePreferences({production:{...preferences.production,clientId}});}
  const [draggedOrderId,setDraggedOrderId]=useState<string|null>(null);
  const [productionView,setProductionView]=useState("Tablero");
  useEffect(()=>{const read=()=>{const v=new URLSearchParams(window.location.search).get("vista");setProductionView(["Mi día","Calendario","Lista y lotes"].includes(v||"")?v!:"Tablero");};read();window.addEventListener("popstate",read);return()=>window.removeEventListener("popstate",read);},[pathname]);
  const changeProductionView=(v:string)=>{setProductionView(v);const url=new URL(window.location.href);if(v==="Tablero")url.searchParams.delete("vista");else url.searchParams.set("vista",v);window.history.replaceState(window.history.state,"",url);};
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
  const [invoiceHasMore, setInvoiceHasMore] = useState(false);
  const [allInvoicesLoaded, setAllInvoicesLoaded] = useState(false);
  const [loadingAllInvoices, setLoadingAllInvoices] = useState(false);
  const invoiceRequestPending = useRef(false);
  const [moraFilter, setMoraFilter] = useState("");
  const [summary, setSummary] = useState<Summary>({
    active_clients: 0,
    active_projects: 0,
    open_orders: 0,
  });
  async function load(identity:User|null=user) {
    if(!identity||identity.subscription?.hasAccess===false)return;
    const sequence=++dataLoadSequence.current;
    const guideScope=workspaceGuideScope({userId:String(identity.id),organizationId:String(identity.organization_id),role:identity.role,demo:!!identity.demo_owner_user_id});
    setGuideData({scope:guideScope,status:'loading'});
    const loadedScope=workspacePreferenceKey(String(identity?.id||''),String(identity?.organization_id||''));
    try{
    const [clientData, projectData, orderData, summaryData] = await Promise.all(
      [
        request<{ clients: Client[] }>("/api/agency/clients"),
        request<{ projects: Project[] }>("/api/agency/projects"),
        request<{ workOrders: WorkOrder[] }>("/api/agency/work-orders"),
        request<{ summary: Summary }>("/api/agency/summary"),
      ],
    );
    if(sequence!==dataLoadSequence.current)return;
    setClients(clientData.clients);
    setProjects(projectData.projects);
    setOrders(orderData.workOrders);
    setSummary(summaryData.summary);
    setStartupDataScope(loadedScope);
    setGuideData({scope:guideScope,status:'ready',counts:{clients:clientData.clients.length,projects:projectData.projects.length,orders:orderData.workOrders.length}});
    }catch(cause){
      if(sequence!==dataLoadSequence.current)return;
      setGuideData({scope:guideScope,status:'error'});
      throw cause;
    }
  }
  useEffect(()=>{
    const next=user?.subscription?.hasAccess??null;
    if(next===false){
      dataLoadSequence.current++;setGuideData({scope:null,status:'unknown'});
      clearDataCache();setClients([]);setProjects([]);setOrders([]);setBudgets([]);setAccounts([]);setInvoices([]);setInvoiceHasMore(false);setAllInvoicesLoaded(false);setTransfers([]);setPayments([]);setCustodians([]);setMetrics([]);setPaymentStatuses([]);
      setModal(null);setDetail(null);setMyProfile(false);setSubscriptionOpen(false);
    }else if(previousBillingAccess.current===false&&next===true){void load().catch(()=>setToast('No se pudieron actualizar los datos. Intentá nuevamente.'));}
    previousBillingAccess.current=next;
  },[user?.subscription?.hasAccess]);
  useEffect(()=>{
    if(lastDataPath.current===pathname)return;
    lastDataPath.current=pathname;
    // Keep the mounted shell and session. Refresh records quietly after another module may have changed them.
    if(signedIn&&user?.subscription?.hasAccess!==false)void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron actualizar los datos.'));
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
        if(data.user.subscription?.hasAccess!==false)return load(data.user).catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los datos.'));
      })
      .catch(() => setSignedIn(false))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (operationalAccess && active === "Mora")
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
  }, [active, operationalAccess, moraFilter]);
  useEffect(() => {
    if (operationalAccess && active === "Presupuestos")
      request<{ budgets: Budget[] }>("/api/agency/budgets")
        .then((data) => setBudgets(data.budgets))
        .catch((cause) =>
          setToast(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los presupuestos.",
          ),
        );
  }, [active, operationalAccess]);
  async function loadFinance() {
    const [accountData, invoiceData, transferData, paymentData, custodianData] =
      await Promise.all([
        request<{ accounts: Account[] }>("/api/agency/accounts"),
        request<{ invoices: Invoice[]; hasMore?: boolean }>(`/api/agency/invoices${allInvoicesLoaded ? "?limit=all" : ""}`),
        request<{ transfers: AccountTransfer[] }>("/api/agency/transfers"),
        request<{ payments: PaymentRecord[] }>("/api/agency/payments"),
        request<{ members: Member[] }>("/api/agency/custodians"),
      ]);
    setAccounts(accountData.accounts);
    setInvoices(invoiceData.invoices);
    setInvoiceHasMore(invoiceData.hasMore===true);
    setTransfers(transferData.transfers);
    setPayments(paymentData.payments);
    setCustodians(custodianData.members);
  }
  useEffect(() => {
    if (operationalAccess && active === "Finanzas")
      loadFinance().catch((cause) =>
        setToast(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar las finanzas.",
        ),
      );
  }, [active, operationalAccess]);
  async function loadAllInvoices(){
    if(invoiceRequestPending.current || !operationalAccess)return;
    invoiceRequestPending.current=true;
    setLoadingAllInvoices(true);
    const sequence=dataLoadSequence.current;
    try{
      const data=await request<{invoices:Invoice[];hasMore?:boolean}>("/api/agency/invoices?limit=all");
      if(sequence!==dataLoadSequence.current)return;
      setInvoices(data.invoices);setInvoiceHasMore(data.hasMore===true);setAllInvoicesLoaded(true);
    }catch{
      if(sequence===dataLoadSequence.current)setToast("No se pudieron cargar todas las facturas. Tus datos siguen disponibles; podés reintentar.");
    }finally{
      invoiceRequestPending.current=false;
      setLoadingAllInvoices(false);
    }
  }
  useEffect(() => {
    if (
      operationalAccess &&
      active === "Pipeline" &&
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
  }, [active, operationalAccess, user?.role]);
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
      if(data.user.subscription?.hasAccess!==false)await load(data.user);
    } catch (cause) {
      setToast(
        cause instanceof Error ? cause.message : "No se pudo iniciar sesión.",
      );
    }
  }
  function clearSessionState() {
    dataLoadSequence.current++;setGuideData({scope:null,status:'unknown'});
    setClients([]);setProjects([]);setOrders([]);setBudgets([]);setAccounts([]);setInvoices([]);setInvoiceHasMore(false);setAllInvoicesLoaded(false);setTransfers([]);setPayments([]);setCustodians([]);setMetrics([]);setPaymentStatuses([]);
    setMyProfile(false);setDetail(null);setProductionFiltersDialogScope('');setStartupDataScope('');
    setDataScope('');
    setSignedIn(false);
    setUser(null);
  }
  async function logout() {
    clearSessionState();
    sessionStorage.removeItem("scale_company_selected");
    await request("/api/auth/logout", { method: "POST" }).catch(
      () => undefined,
    );
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
  const productionOrders = filterProductionOrders(orders, projects, selectedProductionClient,{...preferences.production,userId:String(user?.id||''),today:productionToday});
  const hasProductionFilters=!!productionClientId||preferences.production.mine||preferences.production.week;
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
          <WorkspaceFooter/>
        </div>
      </div>
    );
  const firstName = user?.email.split("@")[0] || "U";
  if(user?.subscription?.hasAccess===false)return <main className="login-page"><div className="login-card"><WorkspaceBrand/><CompanySelector name={user.organization_name}/><SubscriptionPanel key={user.organization_id} state={user.subscription} error={subscriptionError} onRefresh={refreshSubscription}/><button className="secondary" onClick={logout}>Cerrar sesión</button><WorkspaceFooter/></div></main>;

  const sidebarContent=<>
        <p className="nav-caption">Espacio de trabajo</p>
        <nav aria-label="Menú principal">
          {visibleNav.map(([label, Icon]) => (
            <Link
              key={label}
              className={activeParent === label ? "active" : ""}
              aria-current={activeParent===label?'page':undefined}
              title={label}
              aria-label={label}
              href={sectionPath(allowedChildren(label)[0])}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
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
    <CompanyCurrencyProvider organizationId={user?.organization_id||''} defaultCurrency={user?.default_currency}><main className={`shell control-shell ${active==='Producción'?'production-mode':''} ${active==='Producción'&&productionView==='Tablero'?'production-board-mode':''}`}>
      <PresenceTracker key={`${user?.id}:${user?.organization_id}`}/>
      <DesktopSidebar>
        <div className="sidebar-brand"><WorkspaceBrand/></div>
        {sidebarContent}
      </DesktopSidebar>
      <section className="content">
        {active==='Producción'&&productionView==='Tablero'&&productionFiltersDialogScope===preferenceScope&&productionFiltersDialogScope&&preferencesReady&&<Dialog title="Filtros guardados del tablero" close={()=>setProductionFiltersDialogScope('')}><div className="ops-stack">
          <SelectCustom label="Responsable" value={preferences.production.mine?'mine':'all'} choices={[{value:'all',label:'Todas las asignaciones'},{value:'mine',label:'Asignadas a mí'}]} onChange={value=>updatePreferences({production:{...preferences.production,mine:value==='mine'}})}/>
          <SelectCustom label="Fecha de entrega" value={preferences.production.week?'week':'all'} choices={[{value:'all',label:'Todas las fechas'},{value:'week',label:'Vencen esta semana (hora local)'}]} onChange={value=>updatePreferences({production:{...preferences.production,week:value==='week'}})}/>
          <p className="form-note">De lunes a domingo según el calendario local de tu dispositivo. Incluye todos los estados; las órdenes sin fecha quedan fuera del filtro semanal. Se combina con el cliente elegido y se guarda para vos en esta empresa y navegador.</p>
          <button className="text-button" onClick={()=>updatePreferences({production:defaultWorkspacePreferences().production})}>Restablecer filtros</button>
          {preferenceWarning&&<p className="form-note" role="status">{preferenceWarning}</p>}
        </div></Dialog>}
        {user?.subscription&&<SubscriptionNotice state={user.subscription} onOpen={()=>setSubscriptionOpen(true)}/>}
        {subscriptionOpen&&user&&<Dialog title="Suscripción de tu agencia" close={()=>setSubscriptionOpen(false)}><SubscriptionPanel embedded key={user.organization_id} state={user.subscription||null} error={subscriptionError} onRefresh={refreshSubscription}/></Dialog>}
        <div className="workspace-topbar"><div className="topbar-identity"><MobileNavigation>{sidebarContent}</MobileNavigation><Link href={sectionPath('Resumen')} className="topbar-logo" aria-label="Scale OS · Ir al resumen"><WorkspaceBrand/></Link></div><div className="workspace-context"><CompanySelector name={user?.demo_owner_user_id&&/^Demo\b/i.test(user.organization_name||'')?'Mi agencia':user?.organization_name || 'Organización'}/>{user?.demo_owner_user_id&&<DemoToolbar role={user.role}/>}</div><WorkspaceSearch role={user?.role||'viewer'} refresh={load} navigate={setActive} records={[
          ...clients.map(c=>({id:c.id,name:c.name,context:`Cliente · ${c.email||''}`,kind:'clients' as const})),
          ...projects.map(p=>({id:p.id,name:p.name,context:`Proyecto · ${p.client_name}`,kind:'projects' as const})),
          ...orders.map(o=>({id:o.id,name:o.title,context:`Orden · ${o.client_name} · ${o.project_name}`,kind:'work-orders' as const})),
        ]}/><NotificationBell key={`${user?.id}:${user?.organization_id}`} openOrder={id=>setDetail({kind:'order',id})}/></div>
        <header>
          <div>
            {active==='Resumen'&&<p className="eyebrow">TU AGENCIA, EN UN VISTAZO</p>}
            <h1>{active==='Resumen'?'Centro de control':activeParent}</h1>
          </div>
          <div className="header-actions">
            {active==='Clientes'&&['owner','admin','management','sales'].includes(user?.role||'')&&<ClientRuc refresh={load}/>}
            <WorkspaceGuide {...guideProps}/>
            {((active==='Clientes'&&['owner','admin','management','sales'].includes(user?.role||''))||(['Proyectos','Resumen','Producción'].includes(active)&&['owner','admin','management','production'].includes(user?.role||''))||active==='Presupuestos') && (
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
        {active==='Historial de trabajo'&&<WorkHistory role={user?.role||'viewer'}/>}
        {active==='Actividad'&&user?.role==='owner'&&<UsagePanel/>}
        {active==='Invitaciones'&&(user?.demo_owner_user_id?<section className="panel"><h2>Invitaciones y solicitudes</h2><p>En tu empresa real podés generar enlaces de un uso o enlaces con aprobación. El Demo no crea accesos externos. Probá los permisos desde la barra superior.</p></section>:<InviteLinks role={user?.role||'viewer'}/>)}
        {active==='Comisiones'&&<OperationsWorkspace key="commissions" mode="commissions" role={user?.role||'viewer'}/>}
        {active==='Pipeline'&&<div className="ops-stack"><CatalogWorkspace key="leads" kind="leads" role={user?.role||'viewer'}/>{user&&<LiveVisitors organizationId={String(user.organization_id)} role={user.role} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'}/>} {['owner','admin'].includes(user?.role||'')&&<GrowthDashboard events={metrics}/>}</div>}
        {active==='Planes'&&<CatalogWorkspace key="plans" kind="plans" role={user?.role||'viewer'}/>}
        {active==='Inventario'&&<InventoryWorkspace key={String(user?.organization_id)} role={user?.role||'viewer'}/>}
        {active==='Actividad'&&<ActivityWorkspace/>}
        {active==='Configuración'&&<div className="ops-stack"><SettingsWorkspace/>{!user?.demo_owner_user_id&&<NewCompany/>}</div>}
        {active==='Preferencias'&&<section className="panel ops-stack"><h2>Preferencias de este espacio</h2>
          <p className="form-note">Se guardan para vos en {user?.organization_name||'esta empresa'}, en este navegador.</p>
          {preferencesReady?<SelectCustom label="Al entrar a Scale OS" value={startupChoices(user?.role||'').some(choice=>choice.value===preferences.startup)?preferences.startup:'summary'} choices={startupChoices(user?.role||'')} onChange={startup=>updatePreferences({startup:startup as StartupPreference})}/>:<p role="status">Cargando preferencias…</p>}
          <p className="form-note">Se aplica en tu próxima entrada al inicio. Los enlaces a secciones, piezas y otros destinos conservan su destino.</p>
          {preferenceWarning&&<p role="status" className="form-note">{preferenceWarning}</p>}
        </section>}
        {active==='Papelera'&&<TrashWorkspace refresh={load}/>}
        {active === "Resumen" && (
          <>
            <WorkspaceGuide {...guideProps} variant="card"/>
            <ControlCenter role={user?.role||'viewer'} orders={orders} refresh={load} navigate={setActive}/>
            {user&&<FinancialForecast role={user.role} organizationId={user.organization_id}/>}
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
            <Link className="secondary" href="/produccion">Abrir Producción →</Link>
          </>
        )}
        {active==='Producción'&&<>
            <div className="production-view-menu production-toolbar"><SelectCustom label="Vista de Producción" value={productionView} choices={[{value:"Tablero",label:"Tablero por etapas"},{value:"Mi día",label:"Trabajo diario"},{value:"Calendario",label:"Calendario"},{value:"Lista y lotes",label:"Lista y lotes"}]} onChange={changeProductionView}/>{productionView==="Tablero"&&<div className="production-filters">
                <SelectCustom
                  label="Filtrar por cliente"
                  value={selectedProductionClient}
                  choices={[
                    {value: "", label: "Todos los clientes"},
                    ...[...clients].sort((a,b) => a.name.localeCompare(b.name, 'es')).map(client => ({value: String(client.id), label: client.name})),
                  ]}
                  onChange={setProductionClientId}
                  disabled={!preferencesReady}
                />
                <button type="button" className="text-button" disabled={!preferencesReady} onClick={()=>setProductionFiltersDialogScope(preferenceScope)}>Filtros{hasProductionFilters?` · ${Number(!!productionClientId)+Number(preferences.production.mine)+Number(preferences.production.week)}`:''}</button>
                <p className="production-filter-summary" role="status" aria-live="polite">
                  {productionOrders.length} de {orders.length} órdenes
                </p>
                {hasProductionFilters && <button className="text-button" onClick={() => updatePreferences({production:defaultWorkspacePreferences().production})}>Restablecer filtros</button>}
              </div>}<button className="text-button production-project-link" onClick={()=>setActive("Proyectos")}>Ver proyectos →</button></div>
            {productionView==='Tablero'&&hasProductionFilters&&<p className="form-note">Filtros guardados del tablero · Todos los estados. La semana va de lunes a domingo según la hora local de tu dispositivo.{productionClientId&&!selectedProductionClient?' El cliente guardado ya no está disponible; se muestran todos los clientes.':''}</p>}
            {productionView==='Tablero'&&preferenceWarning&&<p className="form-note" role="status">{preferenceWarning}</p>}
            {productionView!=="Tablero"&&<WorkPlanner key={productionView} initialView={productionView} orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>}
            {productionView==="Tablero"&&
            <section className="panel production-panel production-focus" id="produccion">
              {hasProductionFilters && productionOrders.length === 0 && <p className="empty-copy">No hay órdenes que coincidan con estos filtros.</p>}
              <BoardPresence key={String(user?.organization_id)} projectIds={productionOrders.map(order=>String(order.project_id))}><DndContext onDragStart={event=>setDraggedOrderId(String(event.active.id))} onDragCancel={()=>setDraggedOrderId(null)} onDragEnd={event=>{setDraggedOrderId(null);void onDragEnd(event);}}>
                <div className="kanban" tabIndex={0} role="region" aria-label="Tablero de Producción, desplazable horizontalmente">
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
                <DragOverlay>{draggedOrderId&&<article className="work-card" style={{width:280,padding:16,boxShadow:"0 12px 30px #0003"}}><strong>{orders.find(o=>String(o.id)===draggedOrderId)?.title}</strong><p>{orders.find(o=>String(o.id)===draggedOrderId)?.client_name}</p></article>}</DragOverlay>
              </DndContext></BoardPresence>
              <p className="board-note">
                Arrastrá una orden de una columna a otra para actualizar su
                estado.
              </p>
            </section>}
          </>}
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
                        ? formatMoney(client.outstanding_amount, client.currency)
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
            <p className="directory-summary">{clients.length} clientes registrados</p>
            <div className="client-directory-toolbar"><SelectCustom label="Estado del cliente" value={clientStatusFilter} onChange={setClientStatusFilter} choices={[{value:'',label:'Todos los estados'},...clientStatuses]}/><ViewToggle label="Vista de clientes" value={clientView as 'grid'|'list'} onChange={changeClientView}/></div>
            <div className={clientView==='grid'?'client-directory-grid':'client-list'}>
              {clients.length ? (
                clients.filter(client=>!clientStatusFilter||clientState(client).value===clientStatusFilter).map((client) => (
                  <div className="client-row" key={client.id}>
                    <div>
                      <button className="text-button" onClick={()=>setDetail({kind:'client',id:client.id})}><ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/></button>
                      <small>{client.email || "Sin email registrado"}</small>
                    </div>
                    <span>{client.phone || "Sin teléfono"}</span>
                    <span className="client-status" data-status={clientState(client).value}>{clientState(client).label}</span>
                    <div className="client-record-actions"><RecordEditor kind="clients" recordId={client.id} name={client.name} role={user?.role||'viewer'} refresh={load}/></div>
                  </div>
                ))
              ) : (
                <p className="empty-copy">
                  Todavía no hay clientes. Creá el primero para empezar.
                </p>
              )}
            </div>
            {clients.length>0&&clientStatusFilter&&!clients.some(c=>clientState(c).value===clientStatusFilter)&&<p className="empty-copy">No hay clientes con este estado.</p>}
          </section>
        )}
        {active === "Proyectos" && (
          <section className="panel directory">
            <div className="directory-toolbar-row"><p className="directory-summary">{projects.length} proyectos · Carpetas, responsables y piezas</p><ViewToggle label="Vista de proyectos" value={projectView as 'grid'|'list'} onChange={changeProjectView}/></div>
            <div className={projectView==='grid'?'project-grid':'project-list'}>
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
            <p className="directory-summary">{budgets.length} presupuestos · Propuestas y aprobaciones</p>
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
                      {formatMoney(budget.total, budget.currency)}{" "}
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
        {active === "Informes" && <ReportsWorkspace key={user?.organization_id} role={user?.role||'viewer'}/>}
        {active === "Finanzas" && (
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
                          {{bank:'Cuenta bancaria',cash:'Caja en efectivo',digital:'Billetera digital',investment:'Inversión'}[account.account_type]} · {account.currency}
                          {account.custodian_email
                            ? ` · Custodia: ${account.custodian_email}`
                            : ""}
                        </small>
                        {account.account_number&&<small>N.º {account.account_number}</small>}
                        {account.holder_name&&<small>Titular: {account.holder_name}</small>}
                        <RemoveRecord kind="accounts" id={account.id} name={account.name} role={user?.role||'viewer'} done={loadFinance}/>
                      </div>
                      <strong>
                        {formatMoney(account.balance, account.currency)}
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
                        {transfer.to_currency&&<small>Recibido: {formatMoney(transfer.received_amount||transfer.amount,transfer.to_currency)}</small>}
                      </div>
                      <strong>
                        {formatMoney(transfer.amount,
                            accounts.find(
                              (account) =>
                                account.id === transfer.from_account_id,
                            )?.currency || "PYG")}
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
                          {formatMoney(
                            Number(invoice.total) - Number(invoice.paid_amount),
                            invoice.currency,
                          )}
                        </small>
                      </div>
                      <strong>
                        {formatMoney(invoice.total, invoice.currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  Todavía no hay facturas registradas.
                </p>
              )}
              {invoiceHasMore&&<div className="inline-actions"><button className="secondary" type="button" disabled={loadingAllInvoices} aria-busy={loadingAllInvoices} onClick={()=>void loadAllInvoices()}>{loadingAllInvoices ? "Cargando facturas…" : "Ver todas las facturas"}</button></div>}
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
                        {formatMoney(payment.amount, payment.currency)}
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
        <WorkspaceFooter/>
      </section>
      {myProfile&&user&&<MyProfile profile={user} close={()=>setMyProfile(false)} refresh={async()=>{clearDataCache();const d=await request<{user:User}>('/api/auth/me');setUser(d.user);}}/>}
      {detail?.kind==='order'&&<WorkDetail key={`${user?.organization_id}:${detail.id}`} id={detail.id} organizationId={String(user?.organization_id||'')} role={user?.role||'viewer'} close={()=>setDetail(null)} refresh={load}/>}
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
              await completeSave(close,load);
            }}
          />
        </Modal>
      )}
      {modal === "order" && (
        <Modal title="Nueva orden de trabajo" onClose={close}>
          <OrderForm
            projects={projects}
            done={async () => {
              await completeSave(close,load);
            }}
          />
        </Modal>
      )}
      {modal === "budget" && (
        <Modal title="Nuevo presupuesto" onClose={close}>
          <QuoteComposer mode="create" done={()=>completeSave(close,async()=>{setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets);})}/>
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
              await completeSave(close,loadFinance);
            }}
          />
        </Modal>
      )}
      {modal === "transfer" && (
        <Modal title="Transferir entre cuentas" onClose={close}>
          <FXTransferForm
            accounts={accounts}
            done={async () => {
              await completeSave(close,loadFinance);
            }}
          />
        </Modal>
      )}
    </main></CompanyCurrencyProvider>
  );
}
