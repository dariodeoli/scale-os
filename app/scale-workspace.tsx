"use client";
import {ProjectCard} from './project-card';
import {SearchField} from './search-field';
import {Currency} from "./currencies";
import {usePathname,useRouter} from 'next/navigation';
import {sectionLabel,sectionPath,parentSection,childSections,tabLabels} from './navigation';
import Link from 'next/link';
import {ControlCenter} from './control-center';
import {normalizeCommercialDashboard, type CommercialDashboard} from './control-center-data';
import {WorkspaceSearch} from './workspace-search';
import {WorkspaceBrand} from './workspace-brand';
import {ThemeToggle} from './theme-toggle';
import {MobileNavigation} from './mobile-navigation';
import {DesktopSidebar} from './desktop-sidebar';
import {clientState} from './client-status';
import {roleCan,BATCH_LIMITS,limitSelection} from './capabilities';
import './client-directory.css';
import dynamic from 'next/dynamic';
import {ClientIdentity} from './client-identity';
import {NotificationBell} from './notifications-ui';
import {WorkspaceFooter} from './workspace-footer';
import {GoogleSignIn} from './google-sign-in';
import {ActorIdentity} from './actor-identity';
import {PersonContainer} from './person-container';
const InviteLinks=dynamic(()=>import('./invite-links').then(m=>m.InviteLinks));
const GrowthDashboard=dynamic(()=>import('./growth-dashboard').then(m=>m.GrowthDashboard));
const ReportsWorkspace=dynamic(()=>import('./reports-workspace').then(m=>m.ReportsWorkspace));
import type {ReportsData} from './reports-workspace';
const DemoToolbar=dynamic(()=>import('./demo-toolbar').then(m=>m.DemoToolbar));
const DemoWelcome=dynamic(()=>import('./demo-toolbar').then(m=>m.DemoWelcome));
const MyProfile=dynamic(()=>import('./my-profile').then(m=>m.MyProfile));
const DeletionDangerZone=dynamic(()=>import('./deletion-danger-zone').then(m=>m.DeletionDangerZone));
const ClientRuc=dynamic(()=>import('./client-ruc').then(m=>m.ClientRuc));
const PresenceTracker=dynamic(()=>import('./presence').then(m=>m.PresenceTracker),{ssr:false});
import {BoardPresence,WorkspacePresence} from './presence';
import {CompanyCurrencyProvider} from './currency-provider';
import {FinancialForecast} from './financial-forecast';
import {LiveVisitors} from './live-visitors';
const UsagePanel=dynamic(()=>import('./presence').then(m=>m.UsagePanel));
const InventoryWorkspace=dynamic(()=>import('./inventory-workspace').then(m=>m.InventoryWorkspace));
const StudioWorkspace=dynamic(()=>import('./studio-workspace').then(m=>m.StudioWorkspace));
const WorkDetail=dynamic(()=>import('./productivity-ui').then(m=>m.WorkDetail));
const ClientDetail=dynamic(()=>import('./productivity-ui').then(m=>m.ClientDetail));
const WorkPlanner=dynamic(()=>import('./productivity-ui').then(m=>m.WorkPlanner));
const WorkHistory=dynamic(()=>import('./work-history').then(m=>m.WorkHistory));
const InternalTasks=dynamic(()=>import('./work-history').then(m=>m.InternalTasks));
import {dataFetch,setDataScope,clearDataCache} from './data-cache';
import {prefetchSectionData} from './data-prefetch';
import './control-center.css';
import './production-focus.css';
import './mobile-navigation.css';
import './workspace-density.css';
import {Dialog} from './dialog';
import {completeSave} from './save-completion';
import {OperationsWorkspace, ProjectComments, CompanySelector, money} from './operations';
import {PermissionsMatrixPanel} from './permissions-matrix';
import './operations.css';
import './suite.css';
import {CatalogWorkspace,RecordEditor,BudgetActions,ActivityWorkspace,SettingsWorkspace,CouponRedeem} from './suite';
import {QuoteComposer} from './quote-composer';
import {PasswordPanel} from './password-panel';
import {PasswordField} from './password-field';
import {EmailField} from './email-field';
import {WorkspaceGuide,workspaceGuideScope,visibleModule,NewCompany,type WorkspaceGuideData} from './workspace-guide';
import {FXTransferForm,ReceiptReversal,ReconciliationWorkspace} from './daily-controls';
import {SelectCustom} from './profile-controls';
import {filterProductionOrders} from './production-filter';
import {defaultWorkspacePreferences,startupChoices,workspacePreferenceKey,type StartupPreference} from './workspace-preferences';
import {useWorkspacePreferences,useStartupPreference,useLocalCalendarDay} from './use-workspace-preferences';
import {RemoveRecord,TrashWorkspace} from './archive-controls';
import {whatsappUrl} from './client-links';
import {clientPortfolioStats,clientSince,moneyKpi} from './client-format';
import {listDateShort} from './list-format';
import {statuses,type Status,KanbanColumn} from './production-board';
import type {Account,Client,Invoice,Member,PaymentRecord,Project,WorkOrder} from './workspace-types';
import {AccountForm,ClientForm,InvoiceForm,OrderForm,PaymentForm,ProjectForm} from './workspace-forms';
import {notify,notifyMutation} from './feedback';
import {SubscriptionPanel,SubscriptionNotice,type SubscriptionState} from './subscription-panel';
import './settings-slice.css';

export function postLoginDestination(search:string){
  return new URLSearchParams(search).get('next')==='/superadmin'?'/superadmin':null;
}

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ViewToggle } from "./view-toggle";
import {WhatsAppButton} from './whatsapp-button';
import {ClientDirectoryToolbar,filterClientDirectory} from "./client-directory-toolbar";
import {
  CircleDollarSign,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Eye,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const core = "/core-api";
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
  ["Estudio", CalendarDays],
  ["Configuración", Settings],
] as const;
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
  actor_name?:string; actor_photo_url?:string; actor_verified?:boolean;
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
  invoice_count: number;
  has_invoice: boolean;
};
function localMonth(){const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).formatToParts(new Date());return `${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;}
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
  platform_role?:string|null;
};
export function identityScope(user:Pick<User,'id'|'organization_id'|'role'>|null){
  return user?`${user.id}:${user.organization_id}:${user.role}`:'';
}
export function identityScopeChanged(previous:Pick<User,'id'|'organization_id'|'role'>|null,next:Pick<User,'id'|'organization_id'|'role'>){
  return identityScope(previous)!==identityScope(next);
}
export function shouldRollbackOrderMutation(failingVersion:number,latestVersion:number){
  return failingVersion===latestVersion;
}
type Summary = {
  active_clients: number;
  active_projects: number;
  open_orders: number;
  unanswered_budgets: number | null;
  unverified_inventory: number | null;
  upcoming_deliveries: number | null;
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

const listOf=<T,>(value:unknown):T[]=>Array.isArray(value)?value as T[]:[];

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await dataFetch(`${core}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  let data: T & { error?: string };
  try {
    data = (await response.json()) as T & { error?: string };
  } catch (parseError) {
    // If response is not JSON, try to get text for error message
    const text = await response.text().catch(() => "");
    const errorMsg = text.slice(0, 100) || "Respuesta inválida del servidor";
    if (!response.ok) {
      throw new Error(`${errorMsg} (HTTP ${response.status})`);
    }
    // A 200 with a non-empty non-JSON body is an error page, never data: it must
    // fail loudly instead of becoming an empty object that corrupts state.
    if (text.trim()) throw new Error("El servidor devolvió una respuesta inválida. Reintentá.");
    data = {} as T & { error?: string };
  }
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
const clientHeadRow=()=> <div className="client-hub-head-row" aria-hidden="true"><span>Cliente</span><span>Datos</span><span>Estado</span><span>Cobros</span><span>Actividad</span><span>Acciones</span></div>;
function ClientHubCard({client,pay,stat,canSeeBilling,canManage,canManageTerms,archiveBusy,onOpen,onToggleArchive,refresh,role,selectable=false,selected=false,onSelect}:{
  client:Client;
  pay:ClientPaymentStatus|undefined;
  stat:{projects:number;pieces:number;nextDue:string|null}|undefined;
  canSeeBilling:boolean;
  canManage:boolean;
  canManageTerms:boolean;
  archiveBusy:boolean;
  onOpen:()=>void;
  onToggleArchive:()=>void;
  refresh:()=>Promise<void>;
  role:string;
  selectable?:boolean;
  selected?:boolean;
  onSelect?:()=>void;
}) {
  const state=clientState(client),tel=whatsappUrl(client.phone||undefined),since=clientSince(client.created_at);
  const portfolio=stat?[
    stat.projects?{key:'projects',text:`${stat.projects} proyecto${stat.projects===1?'':'s'} activo${stat.projects===1?'':'s'}`,node:<><b>{stat.projects}</b> proyecto{stat.projects===1?'':'s'} activo{stat.projects===1?'':'s'}</>}:null,
    stat.pieces?{key:'pieces',text:`${stat.pieces} pieza${stat.pieces===1?'':'s'} en curso`,node:<><b>{stat.pieces}</b> pieza{stat.pieces===1?'':'s'} en curso</>}:null,
    stat.nextDue?{key:'due',text:`Próxima entrega ${listDateShort(stat.nextDue)}`,node:<>Próxima entrega <b>{listDateShort(stat.nextDue)}</b></>}:null,
  ].filter((part):part is {key:string;text:string;node:JSX.Element}=>part!==null):[];
  return (
    <article className="client-hub-card" data-archived={client.active===false||undefined}>
      <header className="client-hub-head">
        <div className="client-hub-identity">
        {selectable?<label className="select-check" title="Seleccionar cliente"><input type="checkbox" aria-label={`Seleccionar ${client.name}`} checked={selected} onChange={()=>onSelect?.()}/></label>:null}
        <button type="button" className="client-hub-open" onClick={onOpen} aria-label={`Abrir ficha de ${client.name}`}>
          <ClientIdentity name={client.name} logo={client.logo_url} color={client.color_key}/>
        </button>
        </div>
        <span className="client-status" data-status={state.value}>{state.label}</span>
      </header>
      <dl className="client-hub-facts">
        <div><dt>Correo</dt><dd title={client.email||undefined}>{client.email || "Sin email registrado"}</dd></div>
        <div><dt>Teléfono</dt><dd title={client.phone||undefined}>{client.phone || "Sin teléfono"}</dd></div>
        <div><dt>RUC</dt><dd title={client.tax_id||undefined}>{client.tax_id || "Sin RUC registrado"}</dd></div>
        <div><dt>Cliente desde</dt><dd>{since || "Sin fecha de alta"}</dd></div>
      </dl>
      <div className="client-hub-stats" aria-label="Cartera del cliente">
        {portfolio.length?<span className="client-hub-stat" title={portfolio.map(part=>part.text).join(' · ')}>{portfolio.map((part,index)=><span className="client-hub-stat-part" key={part.key}>{index?<span className="client-hub-sep" aria-hidden="true"> · </span>:null}{part.node}</span>)}</span>:<span className="client-hub-stat muted">Sin proyectos activos</span>}
      </div>
      {canSeeBilling?<div className="client-hub-chips">
        {pay ? (
          pay.payment_status === "up_to_date" ? (
            <span className="mora-chip mora-clear">Al día</span>
          ) : pay.payment_status === "due_soon" ? (
            <span className="mora-chip mora-early">Vence {listDateShort(pay.next_due_on) || "próximamente"}</span>
          ) : (
            <span className={`mora-chip ${pay.days_overdue > 30 ? "mora-critical" : pay.days_overdue > 15 ? "mora-medium" : "mora-early"}`}>{pay.days_overdue} días de mora</span>
          )
        ) : null}
        {pay&&pay.currency&&Number(pay.outstanding_amount)>0?<span className="client-hub-balance" title={`Pendiente ${money(Number(pay.outstanding_amount),pay.currency)}`}>Pendiente {money(Number(pay.outstanding_amount),pay.currency)}</span>:null}
        {client.has_recurring_price!==true?<span className="client-price-missing" title="Sin precio definido: editá el cliente y completá Plan y pago."><CircleDollarSign size={14} aria-label="Sin precio definido"/></span>:null}
      </div>:null}
      <footer className="client-hub-actions">
        <button className="text-button" onClick={onOpen}><Eye size={14}/>Abrir ficha</button>
        <WhatsAppButton href={tel}/>
        {canManage?<button type="button" className="text-button" disabled={archiveBusy} onClick={onToggleArchive}>{client.active===false?'Reactivar':'Archivar'}</button>:null}
        <div className="client-record-actions"><RecordEditor kind="clients" recordId={client.id} name={client.name} role={role} canManageTerms={canManageTerms} refresh={refresh}/></div>
      </footer>
    </article>
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
  function returnToApprovedLoginDestination(){
    const destination=postLoginDestination(window.location.search);
    if(destination)router.replace(destination);
  }
  const lastDataPath=useRef(pathname);
  const requestedSection=sectionLabel(pathname);
  function setActive(label:string){router.push(sectionPath(label));}
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [myProfile,setMyProfile]=useState(false);
  const [detail,setDetail]=useState<{kind:'client'|'order';id:string;anchor?:string;edit?:boolean}|null>(null);
  const [projectClient,setProjectClient]=useState('');
  const [clientMode,setClientMode]=useState(true);
  const [clientView,setClientView]=useState('list'),[clientStatusFilter,setClientStatusFilter]=useState(''),[clientSearch,setClientSearch]=useState('');
  const [projectView,setProjectView]=useState('grid');
  const [archiveBusy,setArchiveBusy]=useState('');
  const [selectedClients,setSelectedClients]=useState<string[]>([]),[bulkBusy,setBulkBusy]=useState(false);
  const [selectedProjects,setSelectedProjects]=useState<string[]>([]);
  useEffect(()=>{try{setClientView(localStorage.getItem('scale:client-view')==='grid'?'grid':'list');}catch{/* Optional UI preference. */}},[]);
  useEffect(()=>{try{setProjectView(localStorage.getItem('scale:project-view')==='list'?'list':'grid');}catch{/* Optional UI preference. */}},[]);
  function changeClientView(value:string){setClientView(value);try{localStorage.setItem('scale:client-view',value);}catch{/* Optional UI preference. */}}
  function changeProjectView(value:string){setProjectView(value);try{localStorage.setItem('scale:project-view',value);}catch{/* Optional UI preference. */}}
  const [user, setUser] = useState<User | null>(null);
  const userRef=useRef<User|null>(null);
  const [workspaceScope,setWorkspaceScope]=useState('');
  const [guideData,setGuideData]=useState<WorkspaceGuideData>({scope:null,status:'unknown'});
  const dataLoadSequence=useRef(0);
  const [projectsState,setProjectsState]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{setProjectsState(guideData.status==='error'?'error':guideData.status==='ready'?'ready':'loading');},[guideData.status]);
  const orderMutationVersions=useRef(new Map<string,number>());
  const orderMutationQueue=useRef(new Map<string,Promise<void>>());
  const guideProps={userId:user?.id,organizationId:user?.organization_id,role:user?.role||'viewer',demo:!!user?.demo_owner_user_id,data:guideData,navigate:setActive};
  const {key:preferenceScope,ready:preferencesReady,preferences,warning:preferenceWarning,update:updatePreferences}=useWorkspacePreferences(signedIn?String(user?.id||''):'',signedIn?String(user?.organization_id||''):'');
  const [productionFiltersDialogScope,setProductionFiltersDialogScope]=useState('');
  const [startupDataScope,setStartupDataScope]=useState('');
  const productionToday=useLocalCalendarDay();
  const [subscriptionOpen,setSubscriptionOpen]=useState(false),[subscriptionError,setSubscriptionError]=useState('');
  const [demoWelcome,setDemoWelcome]=useState(false);
  const previousBillingAccess=useRef<boolean|null>(null);
  const operationalAccess=signedIn&&user?.subscription?.hasAccess!==false;
  const canSeeBilling=roleCan(user?.role,'billing.view');
  const canManageClients=roleCan(user?.role,'clients.manage');
  const canManageProjects=roleCan(user?.role,'projects.edit');
  // The header button creates the record of the visible section; each one has its own capability.
  const canCreateRecord=(section:string)=>section==='Proyectos'?roleCan(user?.role,'projects.manage'):section==='Presupuestos'?roleCan(user?.role,'budgets.manage'):roleCan(user?.role,'work-orders.edit');
  useEffect(()=>{userRef.current=user;},[user]);
  // Invalidate before child loading effects can read a previous tenant/role cache.
  useLayoutEffect(()=>{setDataScope(operationalAccess&&user?`${user.id}:${user.organization_id}:${user.role}`:'');},[operationalAccess,user?.id,user?.organization_id,user?.role]);
  function prefetchSection(label:string){
    if(!operationalAccess||!user||!visibleModule(label,user.role))return;
    // Only warm the sections whose module the role can open: the same capability
    // InventoryWorkspace and StudioWorkspace check, so menu visibility alone (which
    // includes Sales) never triggers a denied read.
    if(['Inventario','Estudio'].includes(label)&&!roleCan(user.role,'inventory.view'))return;
    void prefetchSectionData(label,`${user.id}:${user.organization_id}:${user.role}`);
  }
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
    const refreshIdentity=()=>{void request<{user:User}>('/api/auth/me').then(d=>{
      if(!active)return;
      if(!identityScopeChanged(userRef.current,d.user)){setUser(d.user);return;}
      const nextScope=identityScope(d.user);
      clearScopedShellData();
      clearDataCache();setDataScope(nextScope);setWorkspaceScope(nextScope);
      userRef.current=d.user;setUser(d.user);
      if(d.user.subscription?.hasAccess!==false)void load(d.user).catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los datos.'));
    }).catch(()=>{});};
    window.addEventListener('scale:identity-changed',refreshIdentity);
    window.addEventListener('focus',refreshIdentity);
    return()=>{active=false;window.removeEventListener('scale:identity-changed',refreshIdentity);window.removeEventListener('focus',refreshIdentity);};
  },[]);
  const active=signedIn&&!visibleModule(requestedSection,user?.role||'viewer')?'Sin acceso':requestedSection;
  useEffect(()=>{
    if(!signedIn||!user)return;
    const query=new URLSearchParams(window.location.search),billing=query.get('scaleBilling')||query.get('billing');
    if(billing==='success'||billing==='cancelled')setSubscriptionOpen(true);
  },[signedIn,user?.id,user?.organization_id]);
  const activeParent=parentSection(active);
  const allowedChildren=(label:string)=>childSections(label).filter(child=>visibleModule(child,user?.role||'viewer'));
  const visibleNav=nav.filter(([label])=>allowedChildren(label).length>0);
  useEffect(()=>{setModal(null);setProjectClient('');setDetail(null);},[pathname]);
  useEffect(()=>{
    if(!user?.demo_owner_user_id||new URLSearchParams(window.location.search).get('demoWelcome')!=='1')return;
    setDemoWelcome(true);
    const url=new URL(window.location.href);url.searchParams.delete('demoWelcome');window.history.replaceState(window.history.state,'',url);
  },[pathname,user?.demo_owner_user_id]);
  useEffect(()=>{if(signedIn){const id=new URLSearchParams(window.location.search).get('order');if(id&&/^\d+$/.test(id))setDetail({kind:'order',id});}},[signedIn,pathname]);
  const [clients, setClients] = useState<Client[]>([]);
  const displayedClients=filterClientDirectory(clients,clientSearch,clientStatusFilter);
  const liveClients=displayedClients.filter(client=>client.active!==false);
  const archivedClients=displayedClients.filter(client=>client.active===false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const clientHubStats=useMemo(()=>clientPortfolioStats(clients,projects,orders),[clients,projects,orders]);
  const productionClientId=preferences.production.clientId;
  function setProductionClientId(clientId:string){updatePreferences({production:{...preferences.production,clientId}});}
  const [draggedOrderId,setDraggedOrderId]=useState<string|null>(null);
  const [productionView,setProductionView]=useState("Tablero");
  useEffect(()=>{const read=()=>{const v=new URLSearchParams(window.location.search).get("vista");setProductionView(["Mi día","Calendario","Lista y lotes"].includes(v||"")?v!:"Tablero");};read();window.addEventListener("popstate",read);return()=>window.removeEventListener("popstate",read);},[pathname]);
  const changeProductionView=(v:string)=>{setProductionView(v);const url=new URL(window.location.href);if(v==="Tablero")url.searchParams.delete("vista");else url.searchParams.set("vista",v);window.history.replaceState(window.history.state,"",url);};
  const [budgetsState, setBudgetsState] = useState<'loading'|'ready'|'error'>('loading');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financeState, setFinanceState] = useState<'loading'|'ready'|'error'>('loading');
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
  const [moraFilter, setMoraFilter] = useState("");
  const [moraSearch, setMoraSearch] = useState("");
  const [moraUpdated, setMoraUpdated] = useState<Date | null>(null);
  const [projectClientFilter, setProjectClientFilter] = useState("");
  const [commercialSummary, setCommercialSummary] = useState<CommercialDashboard | null>(null);
  const [commercialState, setCommercialState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [moraReports, setMoraReports] = useState<ReportsData | null>(null);
  const [moraReportsError, setMoraReportsError] = useState(false);
  const moraBuckets = useMemo(() => {
    const buckets = [
      { key: "early", label: "Mora 1–15 días", min: 1, max: 15, clients: 0, amounts: new Map<string, number>() },
      { key: "medium", label: "Mora 16–30 días", min: 16, max: 30, clients: 0, amounts: new Map<string, number>() },
      { key: "critical", label: "Mora crítica (+30 días)", min: 31, max: Infinity, clients: 0, amounts: new Map<string, number>() },
    ];
    for (const client of paymentStatuses) {
      if (!client.currency || Number(client.outstanding_amount) <= 0 || client.days_overdue <= 0) continue;
      const bucket = buckets.find(b => client.days_overdue >= b.min && client.days_overdue <= b.max);
      if (!bucket) continue;
      bucket.clients += 1;
      bucket.amounts.set(client.currency, (bucket.amounts.get(client.currency) || 0) + Number(client.outstanding_amount));
    }
    return buckets;
  }, [paymentStatuses]);
  const moraDso = useMemo(() => {
    if (!moraReports) return null;
    const current = moraReports.months.find(month => month.month === moraReports.month) || moraReports.months[0];
    if (!current) return null;
    const outstanding = new Map<string, number>();
    for (const client of paymentStatuses) {
      if (!client.currency || Number(client.outstanding_amount) <= 0) continue;
      outstanding.set(client.currency, (outstanding.get(client.currency) || 0) + Number(client.outstanding_amount));
    }
    const rows: { currency: string; days: number }[] = [];
    for (const financial of current.financial) {
      const invoiced = Number(financial.invoiced);
      const owed = outstanding.get(financial.currency);
      if (!Number.isFinite(invoiced) || invoiced <= 0 || owed === undefined || owed <= 0) continue;
      rows.push({ currency: financial.currency, days: Math.max(0, Math.round((owed / invoiced) * 30)) });
    }
    return rows;
  }, [moraReports, paymentStatuses]);
  const visibleMoraClients = (moraFilter === "no_invoice" ? paymentStatuses.filter(client => !client.has_invoice) : moraFilter ? paymentStatuses.filter(client => client.payment_status === moraFilter) : paymentStatuses).filter(client => !moraSearch || client.client_name.toLowerCase().includes(moraSearch.toLowerCase()));
  const moneyMora = money;
  const budgetKpis = useMemo(() => {
    const totals = new Map<string, number>();
    let drafts = 0, accepted = 0, expiring = 0;
    const today = new Date(), week = new Date(Date.now() + 7 * 86400000);
    for (const budget of budgets) {
      const amount = Number(budget.total);
      if (Number.isFinite(amount) && amount > 0) totals.set(budget.currency, (totals.get(budget.currency) || 0) + amount);
      if (budget.status === "draft") drafts += 1;
      if (budget.status === "accepted") accepted += 1;
      if (budget.valid_until && budget.status !== "accepted") {
        const until = new Date(budget.valid_until);
        if (!Number.isNaN(until.getTime()) && until >= today && until <= week) expiring += 1;
      }
    }
    return { totals, drafts, accepted, expiring };
  }, [budgets]);
  const projectKpis = useMemo(() => {
    let active = 0, paused = 0, completed = 0, pieces = 0;
    for (const project of projects) {
      if (project.active === false) continue;
      if (project.status === "active") active += 1;
      else if (project.status === "paused") paused += 1;
      else if (project.status === "completed") completed += 1;
      pieces += project.work_order_count || 0;
    }
    return { active, paused, completed, pieces };
  }, [projects]);
  const visibleProjects = projectClientFilter ? projects.filter(project => project.client_id === projectClientFilter) : projects;
  const liveProjects = visibleProjects.filter(project => project.active !== false);
  const archivedProjects = visibleProjects.filter(project => project.active === false);
  const financeEmpty = !accounts.length && !invoices.length && !transfers.length && !payments.length;
  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of orders) counts.set(order.status, (counts.get(order.status) || 0) + 1);
    return counts;
  }, [orders]);
  const directoryKpis = useMemo(() => {
    const active = clients.filter(client => client.active).length;
    const paused = clients.length - active;
    const activeProjects = projects.filter(project => project.status === "active").length;
    const today = new Date(), week = new Date(Date.now() + 7 * 86400000);
    const deliveries = orders.filter(order => {
      if (!order.due_date || ["approved", "published"].includes(order.status)) return false;
      const due = new Date(order.due_date);
      return !Number.isNaN(due.getTime()) && due >= today && due <= week;
    }).length;
    return { active, paused, activeProjects, deliveries };
  }, [clients, projects, orders]);
  const cobrosKpis = useMemo(() => {
    let alDia = 0, porVencer = 0, enMora = 0, sinFactura = 0;
    for (const client of paymentStatuses) {
      if (client.payment_status === "up_to_date") alDia += 1;
      else if (client.payment_status === "due_soon") porVencer += 1;
      else if (client.payment_status === "late" || client.payment_status === "severe") enMora += 1;
      if (!client.has_invoice) sinFactura += 1;
    }
    return { alDia, porVencer, enMora, sinFactura };
  }, [paymentStatuses]);
  const [summary, setSummary] = useState<Summary>({
    active_clients: 0,
    active_projects: 0,
    open_orders: 0,
    unanswered_budgets: null,
    unverified_inventory: null,
    upcoming_deliveries: null,
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
    if(!Array.isArray(clientData?.clients)||!Array.isArray(projectData?.projects)||!Array.isArray(orderData?.workOrders)||!summaryData?.summary)throw new Error('El servidor devolvió datos incompletos. Reintentá.');
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
      clearDataCache();setClients([]);setProjects([]);setOrders([]);setBudgets([]);setAccounts([]);setInvoices([]);setInvoiceHasMore(false);setAllInvoicesLoaded(false);setTransfers([]);setPayments([]);setCustodians([]);setMetrics([]);setPaymentStatuses([]);setMoraReports(null);setMoraReportsError(false);
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
        const scope=identityScope(data.user);
        setDataScope(scope);setWorkspaceScope(scope);userRef.current=data.user;
        setUser(data.user);
        setSignedIn(true);
        returnToApprovedLoginDestination();
        if(data.user.subscription?.hasAccess!==false)return load(data.user).catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los datos.'));
      })
      .catch(() => setSignedIn(false))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!canSeeBilling) { setPaymentStatuses([]); return; }
    if (operationalAccess && (active === "Mora" || active === "Clientes")) {
      request<{ clients: ClientPaymentStatus[] }>("/api/agency/client-payment-status")
        .then((data) => {
          setPaymentStatuses(listOf<ClientPaymentStatus>(data?.clients));
          setMoraUpdated(new Date());
        })
        .catch((cause) =>
          setToast(
            cause instanceof Error
              ? cause.message
              : "No se pudo cargar la mora.",
          ),
        );
      if (active === "Mora" && ["owner", "admin", "finance"].includes(user?.role || "")) {
        setMoraReportsError(false);
        request<ReportsData>(`/api/agency/reports?month=${localMonth()}&months=2`)
          .then((data) => setMoraReports(data))
          .catch(() => setMoraReportsError(true));
      }
    }
  }, [active, operationalAccess, user?.role]);
  useEffect(() => {
    if (operationalAccess && active === "Clientes" && ["owner", "admin", "management", "sales", "finance"].includes(user?.role || "")) {
      setCommercialSummary(null);
      setCommercialState('loading');
      request<unknown>("/api/agency/control-center")
        .then((value) => {setCommercialSummary(normalizeCommercialDashboard(value));setCommercialState('ready');})
        .catch(() => {setCommercialSummary(null);setCommercialState('error');});
    }
  }, [active, operationalAccess, user?.role]);
  async function loadBudgets() {
    setBudgetsState('loading');
    try {
      const data = await request<{ budgets: Budget[] }>("/api/agency/budgets");
      setBudgets(listOf<Budget>(data?.budgets));
      setBudgetsState('ready');
    } catch (cause) {
      setBudgetsState('error');
      setToast(cause instanceof Error ? cause.message : "No se pudieron cargar los presupuestos.");
    }
  }
  useEffect(() => {
    if (operationalAccess && active === "Presupuestos") void loadBudgets();
  }, [active, operationalAccess]);
  async function loadFinance() {
    setFinanceState('loading');
    try {
      const [accountData, invoiceData, transferData, paymentData, custodianData] =
        await Promise.all([
          request<{ accounts: Account[] }>("/api/agency/accounts"),
          request<{ invoices: Invoice[]; hasMore?: boolean }>(`/api/agency/invoices${allInvoicesLoaded ? "?limit=all" : ""}`),
          request<{ transfers: AccountTransfer[] }>("/api/agency/transfers"),
          request<{ payments: PaymentRecord[] }>("/api/agency/payments"),
          request<{ members: Member[] }>("/api/agency/custodians"),
        ]);
      setAccounts(listOf<Account>(accountData?.accounts));
      setInvoices(listOf<Invoice>(invoiceData?.invoices));
      setInvoiceHasMore(invoiceData?.hasMore===true);
      setTransfers(listOf<AccountTransfer>(transferData?.transfers));
      setPayments(listOf<PaymentRecord>(paymentData?.payments));
      setCustodians(listOf<Member>(custodianData?.members));
      setFinanceState('ready');
    } catch (cause) {
      setFinanceState('error');
      throw cause;
    }
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
  async function setClientArchive(id:string,archived:boolean){
    if(archiveBusy)return;
    setArchiveBusy(`client:${id}`);
    try{await request(`/api/agency/clients/${id}`,{method:'PATCH',body:JSON.stringify({active:!archived})});await load();}
    catch(cause){setToast(cause instanceof Error?cause.message:'No se pudo archivar el cliente.');}
    finally{setArchiveBusy('');}
  }
  async function setProjectArchive(id:string,archived:boolean){
    if(archiveBusy)return;
    setArchiveBusy(`project:${id}`);
    try{await request(`/api/agency/projects/${id}`,{method:'PATCH',body:JSON.stringify({active:!archived})});await load();}
    catch(cause){setToast(cause instanceof Error?cause.message:'No se pudo archivar el proyecto.');}
    finally{setArchiveBusy('');}
  }
  function toggleClientSelected(id:string){
    if(selectedClients.includes(id)){setSelectedClients(current=>current.filter(value=>value!==id));return;}
    if(selectedClients.length>=BATCH_LIMITS.clients){notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.clients} clientes. Quitá alguno para sumar otro.`});return;}
    setSelectedClients(current=>[...current,id]);
  }
  function toggleProjectSelected(id:string){
    if(selectedProjects.includes(id)){setSelectedProjects(current=>current.filter(value=>value!==id));return;}
    if(selectedProjects.length>=BATCH_LIMITS.projects){notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.projects} proyectos. Quitá alguno para sumar otro.`});return;}
    setSelectedProjects(current=>[...current,id]);
  }
  function selectVisibleClients(){
    const ids=liveClients.map(client=>String(client.id));
    if(ids.length>0&&ids.every(id=>selectedClients.includes(id))){setSelectedClients(current=>current.filter(id=>!ids.includes(id)));return;}
    const {selection,capped}=limitSelection([...selectedClients,...ids],BATCH_LIMITS.clients);
    setSelectedClients(selection);
    if(capped)notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.clients} clientes: se seleccionaron los primeros ${BATCH_LIMITS.clients}.`});
  }
  function selectVisibleProjects(){
    const ids=liveProjects.map(project=>String(project.id));
    if(ids.length>0&&ids.every(id=>selectedProjects.includes(id))){setSelectedProjects(current=>current.filter(id=>!ids.includes(id)));return;}
    const {selection,capped}=limitSelection([...selectedProjects,...ids],BATCH_LIMITS.projects);
    setSelectedProjects(selection);
    if(capped)notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.projects} proyectos: se seleccionaron los primeros ${BATCH_LIMITS.projects}.`});
  }
  async function batchClients(archived:boolean){
    if(bulkBusy||!selectedClients.length)return;
    setBulkBusy(true);
    try{
      const data=await request<{updated:number}>('/api/agency/clients/batch',{method:'POST',body:JSON.stringify({ids:selectedClients,archived})});
      const total=data.updated??selectedClients.length;
      setSelectedClients([]);await load();
      notify({tone:'success',message:archived?`${total} cliente${total===1?'':'s'} archivado${total===1?'':'s'}.`:`${total} cliente${total===1?'':'s'} reactivado${total===1?'':'s'}.`});
    }catch(cause){setToast(cause instanceof Error?cause.message:'No se pudo actualizar el lote de clientes.');}
    finally{setBulkBusy(false);}
  }
  async function batchProjects(archived:boolean){
    if(bulkBusy||!selectedProjects.length)return;
    setBulkBusy(true);
    try{
      const data=await request<{updated:number}>('/api/agency/projects/batch',{method:'POST',body:JSON.stringify({ids:selectedProjects,archived})});
      const total=data.updated??selectedProjects.length;
      setSelectedProjects([]);await load();
      notify({tone:'success',message:archived?`${total} proyecto${total===1?'':'s'} archivado${total===1?'':'s'}.`:`${total} proyecto${total===1?'':'s'} reactivado${total===1?'':'s'}.`});
    }catch(cause){setToast(cause instanceof Error?cause.message:'No se pudo actualizar el lote de proyectos.');}
    finally{setBulkBusy(false);}
  }
  function projectEntry(project:Project){
    return <ProjectCard key={project.id} project={project} client={clients.find(c=>String(c.id)===String(project.client_id))} selectable={canManageProjects} selected={selectedProjects.includes(String(project.id))} onSelect={()=>toggleProjectSelected(String(project.id))}>
      <ProjectComments projectId={project.id} name={project.name} role={user?.role||'viewer'}/>
      {canManageProjects?<button type="button" className="text-button" disabled={archiveBusy===`project:${project.id}`} onClick={()=>void setProjectArchive(project.id,project.active===false)}>{project.active===false?'Reactivar':'Archivar'}</button>:null}
      <RecordEditor kind="projects" recordId={project.id} name={project.name} role={user?.role||'viewer'} refresh={load}/>
    </ProjectCard>;
  }
  async function loadAllInvoices(){
    const data=await request<{invoices:Invoice[];hasMore?:boolean}>("/api/agency/invoices?limit=all");
    setInvoices(listOf<Invoice>(data?.invoices));setInvoiceHasMore(false);setAllInvoicesLoaded(true);
  }
  useEffect(() => {
    if (
      operationalAccess &&
      (active === "Pipeline" || active === "Métricas") &&
      ["owner", "admin"].includes(user?.role || "")
    )
      request<{ events: MetricEvent[] }>("/api/metrics")
        .then((data) => setMetrics(listOf<MetricEvent>(data?.events)))
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
      const scope=identityScope(data.user);
      setDataScope(scope);setWorkspaceScope(scope);userRef.current=data.user;
      setUser(data.user);
      setSignedIn(true);
      returnToApprovedLoginDestination();
      if(data.user.subscription?.hasAccess!==false)await load(data.user);
    } catch (cause) {
      setToast(
        cause instanceof Error ? cause.message : "No se pudo iniciar sesión.",
      );
    }
  }
  function clearScopedShellData(){
    dataLoadSequence.current++;setGuideData({scope:null,status:'unknown'});
    setClients([]);setProjects([]);setOrders([]);setBudgets([]);setAccounts([]);setInvoices([]);setInvoiceHasMore(false);setAllInvoicesLoaded(false);setTransfers([]);setPayments([]);setCustodians([]);setMetrics([]);setPaymentStatuses([]);
    setClientStatusFilter('');setMoraFilter('');setProjectClientFilter('');setProjectClient('');setProductionFiltersDialogScope('');setStartupDataScope('');setWorkspaceScope('');
    setMyProfile(false);setDetail(null);setModal(null);setSubscriptionOpen(false);setDemoWelcome(false);
  }
  function clearSessionState() {
    clearScopedShellData();
    setDataScope('');
    setSignedIn(false);
    userRef.current=null;
    setUser(null);
  }
  async function logout() {
    clearSessionState();
    sessionStorage.removeItem("scale_company_selected");
    await request("/api/auth/logout", { method: "POST" }).catch(
      () => undefined,
    );
  }
  async function exitDemoSimulation(){
    clearSessionState();
    try{sessionStorage.removeItem("scale_company_selected");}catch{/* Optional presentation preference. */}
    await request("/api/auth/logout", { method: "POST" }).catch(()=>undefined);
    window.location.assign('/');
  }
  function deletionSignedOut(){
    clearSessionState();
    try{sessionStorage.removeItem("scale_company_selected");}catch{/* Optional presentation preference. */}
    router.replace('/');
  }
  async function onDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    let target = String(event.over?.id || "");
    if (!target) return;
    if (!target.startsWith("status-")) {
      const overOrder = orders.find((order) => order.id === target);
      if (!overOrder) return;
      target = `status-${overOrder.status}`;
    }
    const status = target.replace("status-", "") as Status;
    const current = orders.find((order) => order.id === id);
    if (!current || current.status === status) return;
    const mutationVersion=(orderMutationVersions.current.get(id)||0)+1;
    orderMutationVersions.current.set(id,mutationVersion);
    setOrders((items) =>
      items.map((order) => (order.id === id ? { ...order, status } : order)),
    );
    const previousMutation=orderMutationQueue.current.get(id)||Promise.resolve();
    const mutation=previousMutation.catch(()=>undefined).then(async()=>{
      await request(`/api/agency/work-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    });
    orderMutationQueue.current.set(id,mutation);
    try {
      await mutation;
    } catch (cause) {
      if(shouldRollbackOrderMutation(mutationVersion,orderMutationVersions.current.get(id)||0)){
        setOrders((items)=>items.map(order=>order.id===id?{...order,status:current.status}:order));
      }
      setToast(
        cause instanceof Error ? cause.message : "No se pudo mover la orden.",
      );
    } finally {
      if(orderMutationQueue.current.get(id)===mutation)orderMutationQueue.current.delete(id);
    }
  }
  const close = () => {setModal(null);setProjectClient('');};
  const selectedProductionClient = clients.some(client => String(client.id) === productionClientId) ? productionClientId : "";
  const productionOrders = filterProductionOrders(orders, projects, selectedProductionClient,{...preferences.production,userId:String(user?.id||''),today:productionToday});
  const hasProductionFilters=!!productionClientId||preferences.production.mine||preferences.production.week;
  if (loading) return (
    <div className="loading-page" role="status" aria-live="polite">
      <div className="loading-frame">
        <div className="loading-orb"><img src="/brand/icon-192.png" width={46} height={46} alt="Scale OS"/></div>
        <span className="workspace-wordmark">scale<span>OS</span></span>
        <p className="loading-caption">Cargando tu espacio…</p>
      </div>
    </div>
  );
  if (!signedIn)
    return (
      <div className="login-page">
        <div className="login-card">
          <ThemeToggle className="login-theme-toggle"/>
          <div className="login-header">
            <div className="login-brand"><WorkspaceBrand/></div>
            <span className="login-badge">30 DÍAS GRATIS</span>
          </div>
          <div className="login-intro">
            <h1>Qué bueno verte de nuevo.</h1>
            <p className="login-copy">
              Clientes, proyectos y operación en un solo lugar.
            </p>
          </div>
          {authNotice && (
            <div className="auth-notice" role="status">
              <b>Acceso pendiente</b>
              <p>{authNotice}</p>
            </div>
          )}
          <GoogleSignIn disabled={!googleAvailable} label={googleAvailable?'Continuar con Google':'Google aún no está configurado'} onClick={()=>{window.location.href='/core-api/api/auth/google/start';}}/>
          <div className="login-divider"><span>o ingresá con correo</span></div>
          <form noValidate onSubmit={login}>
            <label>
              Email
              <EmailField value={email} onChange={setEmail} placeholder="Tu email" required/>
            </label>
            <PasswordField
              label="Contraseña"
              name="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
            <PasswordPanel/>
            {toast && <p className="error">{toast}</p>}
            <button className="primary login-button">Continuar</button>
          </form>
          <p className="login-signup"><Link href="/registro">Crear mi agencia con 30 días gratis</Link></p>
          <WorkspaceFooter/>
        </div>
      </div>
    );
  const firstName = user?.email.split("@")[0] || "U";
  const companyLabel = user?.demo_owner_user_id&&/^Demo\b/i.test(user.organization_name||'')?'Mi agencia':user?.organization_name || 'Organización';
  if(user?.subscription?.hasAccess===false)return <main className="login-page"><div className="login-card"><WorkspaceBrand/><CompanySelector name={user.organization_name}/><SubscriptionPanel key={user.organization_id} state={user.subscription} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user.organization_name}/><button className="secondary" onClick={logout}>Cerrar sesión</button><WorkspaceFooter/></div></main>;

  const sidebarContent=<>
        <div className="mobile-sidebar-brand"><WorkspaceBrand/></div>
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
              onMouseEnter={()=>prefetchSection(allowedChildren(label)[0])}
              onFocus={()=>prefetchSection(allowedChildren(label)[0])}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
          <button type="button" className="nav-logout" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={18}/><span className="nav-label">Cerrar sesión</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-footer"><button className="user" aria-label="Abrir mi perfil" onClick={()=>setMyProfile(true)}><PersonContainer name={user?.full_name||firstName} photoUrl={user?.photo_url} secondary={assignableRoles.find(role=>role.id===user?.role)?.label||user?.role} verified/></button></div>
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
        {demoWelcome&&user?.demo_owner_user_id&&<DemoWelcome close={()=>setDemoWelcome(false)}/>}
        {active==='Producción'&&productionView==='Tablero'&&productionFiltersDialogScope===preferenceScope&&productionFiltersDialogScope&&preferencesReady&&<Dialog title="Filtros guardados del tablero" close={()=>setProductionFiltersDialogScope('')}><div className="ops-stack">
          <SelectCustom label="Responsable" value={preferences.production.mine?'mine':'all'} choices={[{value:'all',label:'Todas las asignaciones'},{value:'mine',label:'Asignadas a mí'}]} onChange={value=>updatePreferences({production:{...preferences.production,mine:value==='mine'}})}/>
          <SelectCustom label="Fecha de entrega" value={preferences.production.week?'week':'all'} choices={[{value:'all',label:'Todas las fechas'},{value:'week',label:'Vencen esta semana (hora local)'}]} onChange={value=>updatePreferences({production:{...preferences.production,week:value==='week'}})}/>
          <p className="form-note">De lunes a domingo según el calendario local de tu dispositivo. Incluye todos los estados; las órdenes sin fecha quedan fuera del filtro semanal. Se combina con el cliente elegido y se guarda para vos en esta empresa y navegador.</p>
          <button className="text-button" onClick={()=>updatePreferences({production:defaultWorkspacePreferences().production})}><RotateCcw size={14}/>Restablecer filtros</button>
          {preferenceWarning&&<p className="form-note" role="status">{preferenceWarning}</p>}
        </div></Dialog>}
        {subscriptionOpen&&user&&active!=='Configuración'&&<Dialog title="Suscripción de tu agencia" close={()=>setSubscriptionOpen(false)}><SubscriptionPanel embedded key={user.organization_id} state={user.subscription||null} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user.organization_name}/></Dialog>}
        <div className="workspace-topbar" role="toolbar" aria-label="Controles del espacio de trabajo">
          <div className="topbar-primary">
            <div className="topbar-identity">
              <MobileNavigation>{sidebarContent}</MobileNavigation>
            </div>
            <div className="topbar-workspace-context">
              <div className="topbar-company">
                <CompanySelector name={companyLabel}/>
              </div>
              <div className="topbar-presence" role="group" aria-label="Personas activas en el espacio">
                <WorkspacePresence compact projectIds={projects.map(project=>String(project.id))} role={user?.role||'viewer'}/>
              </div>
            </div>
          </div>
          <div className="topbar-utilities">
            <div className="topbar-status">
              {user?.subscription&&<SubscriptionNotice state={user.subscription} onOpen={()=>{if(active==='Configuración')document.getElementById('settings-subscription')?.scrollIntoView({behavior:'smooth'});else setSubscriptionOpen(true);}}/>}
              {user?.demo_owner_user_id&&<DemoToolbar role={user.role}/>}
            </div>
            <div className="topbar-utility-actions">
              <ThemeToggle/>
              <WorkspaceSearch key={workspaceScope} navigate={setActive} records={[
                ...clients.map(c=>({id:c.id,name:c.name,context:c.email||'Sin correo registrado',kind:'clients' as const,clientName:c.name,clientLogo:c.logo_url,clientColor:c.color_key})),
                ...projects.map(p=>{const client=clients.find(c=>String(c.id)===String(p.client_id));return {id:p.id,name:p.name,context:`${p.client_name} · ${p.work_order_count} piezas`,kind:'projects' as const,clientName:p.client_name,clientLogo:client?.logo_url,clientColor:client?.color_key,assignees:p.assignees};}),
                ...orders.map(o=>{const project=projects.find(p=>String(p.id)===String(o.project_id));const client=clients.find(c=>String(c.id)===String(project?.client_id));return {id:o.id,name:o.title,context:`${o.client_name} · ${o.project_name}`,kind:'work-orders' as const,clientName:o.client_name,clientLogo:client?.logo_url||o.client_logo_url,clientColor:client?.color_key||o.client_color_key,assignees:o.effective_assignees||o.assignees||project?.assignees};}),
              ]}/>
              <NotificationBell key={`${user?.id}:${user?.organization_id}`} openOrder={(id,anchor)=>setDetail({kind:'order',id,...(anchor?{anchor}:{})})}/>
            </div>
          </div>
        </div>
        <header className="workspace-page-header">
          {active==='Clientes' ? <ClientDirectoryToolbar
            canCreate={['owner','admin','management','sales','finance','collaborator'].includes(user?.role||'')}
            onCreate={()=>setModal('client')}
            onQueryChange={setClientSearch}
            onStatusChange={setClientStatusFilter}
            onViewChange={changeClientView}
            query={clientSearch}
            resultCount={displayedClients.length}
            status={clientStatusFilter}
            totalCount={clients.length}
            view={clientView as 'grid'|'list'}
          ><WorkspaceGuide {...guideProps}/></ClientDirectoryToolbar> : <>
            <div className="page-heading">
              <h1>{active==='Resumen'?'Centro de control':activeParent}</h1>
              {active==='Proyectos'&&<span className="page-count">{projects.length} proyectos</span>}
            </div>
            <div className="header-actions">
              {active==='Proyectos'&&<div className="workspace-view-controls"><ViewToggle label="Vista de proyectos" value={projectView as 'grid'|'list'} onChange={changeProjectView}/></div>}
              <WorkspaceGuide {...guideProps}/>
              {(['Proyectos','Resumen','Producción','Presupuestos'].includes(active)&&canCreateRecord(active)) && (
                <button
                  className="primary"
                  onClick={() =>
                    setModal(
                      active === "Proyectos"
                        ? "project"
                          : active === "Presupuestos"
                            ? "budget"
                            : "order",
                    )
                  }
                >
                  <Plus size={18} /> {active==='Proyectos'?'Nuevo proyecto':active==='Presupuestos'?'Nuevo presupuesto':'Nueva orden'}
                </button>
              )}
            </div>
          </>}
        </header>
        {active!=='Sin acceso'&&childSections(active).length>1&&<nav className="section-tabs" aria-label={`Apartados de ${activeParent}`}>{allowedChildren(activeParent).map(label=><Link key={label} href={sectionPath(label)} onMouseEnter={()=>prefetchSection(label)} onFocus={()=>prefetchSection(label)} aria-current={active===label?'page':undefined}>{tabLabels[label]||label}</Link>)}</nav>}
        {active==='Sin acceso'&&<section className="panel"><h2>No tenés permiso para esta sección</h2><p>Podés elegir otra sección del menú o pedir al dueño que revise tu acceso.</p><Link className="primary" href={sectionPath('Resumen')}>Ir al resumen</Link></section>}
        {active==='Equipo'&&<OperationsWorkspace key="people" mode="people" role={user?.role||'viewer'} currentEmail={user?.email||''} organizationName={user?.organization_name||''}/>}
        {active==='Roles y permisos'&&<PermissionsMatrixPanel role={user?.role||'viewer'}/>}
        {active==='Historial de trabajo'&&<WorkHistory role={user?.role||'viewer'}/>}
        {active==='Actividad'&&user?.role==='owner'&&<UsagePanel/>}
        {active==='Invitaciones'&&(user?.demo_owner_user_id?<section className="panel"><h2>Invitaciones y solicitudes</h2><p>En tu empresa real podés generar enlaces de un uso o enlaces con aprobación. El Demo no crea accesos externos. Probá los permisos desde la barra superior.</p></section>:<InviteLinks role={user?.role||'viewer'}/>)}
        {active==='Comisiones'&&<OperationsWorkspace key="commissions" mode="commissions" role={user?.role||'viewer'}/>}
        {active==='Pipeline'&&<div className="ops-stack"><CatalogWorkspace key="leads" kind="leads" role={user?.role||'viewer'}/>{user&&<LiveVisitors organizationId={String(user.organization_id)} role={user.role} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'}/>} {['owner','admin'].includes(user?.role||'')&&<GrowthDashboard events={metrics}/>}</div>}
        {active==='Métricas'&&['owner','admin'].includes(user?.role||'')&&<div className="ops-stack"><GrowthDashboard events={metrics}/></div>}
        {active==='Planes'&&<CatalogWorkspace key="plans" kind="plans" role={user?.role||'viewer'}/>}
        {active==='Inventario'&&<InventoryWorkspace key={String(user?.organization_id)} role={user?.role||'viewer'}/>}
        {active==='Estudio'&&<StudioWorkspace key={String(user?.organization_id)} role={user?.role||'viewer'}/>}
        {active==='Actividad'&&<ActivityWorkspace/>}
        {active==='Configuración'&&<div className="settings-page"><div className="settings-layout">
          <div className="settings-column"><SettingsWorkspace/></div>
          <div className="settings-column settings-side-column">
            <div id="settings-subscription"><SubscriptionPanel key={user?.organization_id} state={user?.subscription||null} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user?.organization_name}/></div>
            {!user?.demo_owner_user_id&&['owner','admin'].includes(user?.role||'')&&<CouponRedeem role={user?.role||''} onRedeemed={refreshSubscription}/>}
            {!user?.demo_owner_user_id&&<NewCompany/>}
          </div>
          {user&&<div className="settings-danger-wrap"><DeletionDangerZone key={String(user.organization_id)} organizationId={String(user.organization_id)} organizationName={user.organization_name} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'} onDemoExit={exitDemoSimulation} onAccountDeleted={deletionSignedOut} onOrganizationDeleted={deletionSignedOut}/></div>}
        </div></div>}
        {active==='Preferencias'&&<section className="panel settings-card preferences-card" aria-labelledby="workspace-preferences-title"><div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><Settings size={18}/></span><div><h2 id="workspace-preferences-title">Preferencias del espacio</h2><p>Se guardan solo para vos en {user?.organization_name||'esta empresa'}, en este navegador.</p></div></div>
          <div className="preferences-row">{preferencesReady?<SelectCustom label="Al entrar a Scale OS" value={startupChoices(user?.role||'').some(choice=>choice.value===preferences.startup)?preferences.startup:'summary'} choices={startupChoices(user?.role||'')} onChange={startup=>updatePreferences({startup:startup as StartupPreference})}/>:<p role="status">Cargando preferencias…</p>}<p className="form-note">Se aplica en tu próxima entrada al inicio. Los enlaces a secciones, piezas y otros destinos conservan su destino.</p></div>
          {preferenceWarning&&<p role="status" className="settings-notice">{preferenceWarning}</p>}
        </section>}
        {active==='Papelera'&&<TrashWorkspace refresh={load}/>}
        {active === "Resumen" && (
          <>
            <WorkspaceGuide {...guideProps} variant="card"/>
            <ControlCenter role={user?.role||'viewer'} orders={orders} refresh={load} navigate={setActive} signals={summary}/>
            <section className="panel" aria-label="Piezas por etapa">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">PRODUCCIÓN</p>
                  <h2>Piezas por etapa</h2>
                </div>
                <button className="text-button" onClick={() => setActive("Producción")}>Abrir Producción<ArrowUpRight size={14}/></button>
              </div>
              <div className="stage-strip">
                {statuses.map(status => (
                  <span className="stage-chip" key={status.id}>
                    <span className={`dot${status.tone === "red" ? "" : ` ${status.tone}`}`}/>
                    {status.label} <strong>{stageCounts.get(status.id) || 0}</strong>
                  </span>
                ))}
              </div>
            </section>
            <WorkPlanner orders={orders} userId={String(user?.id||'')} role={user?.role||'viewer'} projects={projects} openOrder={id=>setDetail({kind:'order',id})} refresh={load} navigate={setActive}/>
            <InternalTasks role={user?.role||'viewer'}/>
            <div className="metrics-heading"><p className="section-eyebrow">Operación</p><h2>Métricas operativas</h2></div>
            <section className="metrics operational-metrics" aria-label="Métricas operativas">
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
                <button type="button" className="text-button" disabled={!preferencesReady} onClick={()=>setProductionFiltersDialogScope(preferenceScope)}><SlidersHorizontal size={14}/>Filtros{hasProductionFilters?` · ${Number(!!productionClientId)+Number(preferences.production.mine)+Number(preferences.production.week)}`:''}</button>
                <p className="production-filter-summary" role="status" aria-live="polite">
                  {productionOrders.length} de {orders.length} órdenes
                </p>
                {hasProductionFilters && <button className="text-button" onClick={() => updatePreferences({production:defaultWorkspacePreferences().production})}><RotateCcw size={14}/>Restablecer filtros</button>}
              </div>}<button className="text-button production-project-link" onClick={()=>setActive("Proyectos")}>Ver proyectos<ArrowUpRight size={14}/></button></div>
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
                      openOrder={(id,edit)=>setDetail({kind:'order',id,...(edit?{edit:true}:{})})}
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
                <DragOverlay>{draggedOrderId&&<article className="work-card is-overlay"><strong>{orders.find(o=>String(o.id)===draggedOrderId)?.title}</strong><p>{orders.find(o=>String(o.id)===draggedOrderId)?.client_name}</p></article>}</DragOverlay>
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
              {moraUpdated?<span>Actualizado {moraUpdated.toLocaleTimeString('es-PY',{timeZone:'America/Asuncion',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}</span>:null}
            </div>
            <div className="kpi-strip" aria-label="Semáforo de mora por antigüedad">
              {moraBuckets.map(bucket => (
                <article className={`kpi-card ${bucket.key === "early" ? "tone-blue" : bucket.key === "medium" ? "tone-warning" : "tone-danger"}`} key={bucket.key}>
                  <p className="eyebrow">{bucket.label}</p>
                  <strong>{bucket.clients} cliente{bucket.clients === 1 ? "" : "s"}</strong>
                  <div className="kpi-amounts">
                    {bucket.amounts.size ? Array.from(bucket.amounts).map(([currency, amount]) => (
                      <span key={currency}>{moneyMora(amount, currency)}</span>
                    )) : <span>Sin saldos vencidos</span>}
                  </div>
                </article>
              ))}
              <article className="kpi-card tone-brand">
                <p className="eyebrow">DSO · DÍAS EN CALLE</p>
                {["owner", "admin", "finance"].includes(user?.role || "") ? (
                  <>
                    {moraReportsError ? (
                      <strong>Sin datos</strong>
                    ) : moraDso === null ? (
                      <strong>Calculando…</strong>
                    ) : moraDso.length ? (
                      <strong>{moraDso.map(row => `${row.currency} ${row.days} días`).join(" · ")}</strong>
                    ) : (
                      <strong>Sin datos</strong>
                    )}
                    <small>Saldo pendiente sobre lo facturado del mes, por moneda.</small>
                  </>
                ) : (
                  <>
                    <strong>—</strong>
                    <small>Visible para administración y finanzas.</small>
                  </>
                )}
              </article>
            </div>
            <div className="mora-toolbar">
              <div className="choice-list compact" aria-label="Filtrar estado de cobro">
                {[
                  ["", "Todos"],
                  ["up_to_date", "Al día"],
                  ["due_soon", "Por vencer"],
                  ["late", "En mora"],
                  ["severe", "Mora grave"],
                  ["no_invoice", "Sin factura"],
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
              <SearchField className="mora-search" hideLabel label="Buscar cliente en cobranza" value={moraSearch} onChange={setMoraSearch} placeholder="Buscar cliente…"/>
            </div>
            <div className="client-list mora-list">
              <div className="mora-list-head" aria-hidden="true"><span></span><span>Cliente</span><span>Pendiente</span></div>
              {visibleMoraClients.length ? (
                visibleMoraClients.map((client, index) => (
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
                            ? `Vence ${listDateShort(client.next_due_on) || "próximamente"}`
                            : `${client.days_overdue} días de mora`}
                        {client.days_overdue > 0 && (
                          <span className={`mora-chip ${client.days_overdue > 30 ? "mora-critical" : client.days_overdue > 15 ? "mora-medium" : "mora-early"}`}>
                            {client.days_overdue > 30 ? "+30 días" : client.days_overdue > 15 ? "16–30 días" : "1–15 días"}
                          </span>
                        )}
                        {client.has_invoice ? ` · ${client.invoice_count} factura${client.invoice_count === 1 ? "" : "s"}` : " · Sin facturas"}
                      </small>
                    </div>
                    <span className="client-row-amount">
                      {client.currency
                        ? money(Number(client.outstanding_amount), client.currency)
                        : "Sin saldo pendiente"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="empty-copy">{paymentStatuses.length ? "No hay clientes en esta categoría." : "Sin registros de cobranza todavía."}</p>
              )}
            </div>
          </section>
        )}
        {active === "Clientes" && (
          <section className="panel directory">
            <div className="kpi-strip" aria-label="Métricas del directorio">
              <article className="kpi-card tone-green">
                <p className="eyebrow">CLIENTES ACTIVOS</p>
                <strong>{directoryKpis.active}</strong>
                <small>Con servicio en curso</small>
              </article>
              <article className="kpi-card tone-warning">
                <p className="eyebrow">COBROS AL DÍA</p>
                <strong>{cobrosKpis.alDia}</strong>
                <small>{cobrosKpis.enMora} en mora · {cobrosKpis.porVencer} por vencer · {cobrosKpis.sinFactura} sin factura</small>
              </article>
              <article className="kpi-card tone-brand">
                <p className="eyebrow">FACTURACIÓN CONTRATADA</p>
                {["owner", "admin", "finance"].includes(user?.role || "") ? (
                  commercialState === 'error' ? (
                    <strong role="alert">No se pudo cargar</strong>
                  ) : commercialSummary === null ? (
                    <strong role="status">Calculando…</strong>
                  ) : commercialSummary.expectedMonthlyBilling === undefined ? (
                    <strong>No disponible</strong>
                  ) : commercialSummary.expectedMonthlyBilling.length ? (
                    <div className="kpi-amounts">
                      {commercialSummary.expectedMonthlyBilling.map(item => (
                        <span key={item.currency}>{moneyKpi(Number(item.total), item.currency)} / mes</span>
                      ))}
                    </div>
                  ) : (
                    <strong>Sin contratos activos</strong>
                  )
                ) : (
                  <strong>—</strong>
                )}
                <small>Expectativa comercial vigente por moneda</small>
              </article>
              <article className="kpi-card tone-blue">
                <p className="eyebrow">ENTREGAS ESTA SEMANA</p>
                <strong>{directoryKpis.deliveries}</strong>
                <small>Piezas con vencimiento en 7 días</small>
              </article>
            </div>
            {canManageClients&&liveClients.length?<div className="bulk-bar" role="status" aria-live="polite"><span className="bulk-count">{selectedClients.length?<><b>{selectedClients.length}</b> de {BATCH_LIMITS.clients} seleccionado{selectedClients.length===1?'':'s'}</>:<span className="bulk-hint">Seleccioná varios para operar en lote · máximo {BATCH_LIMITS.clients}</span>}</span><div className="inline-actions bulk-actions"><button type="button" className="text-button" onClick={selectVisibleClients}>Seleccionar visibles</button>{selectedClients.length?<><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchClients(true)}>Archivar</button><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchClients(false)}>Reactivar</button><button type="button" className="text-button" onClick={()=>setSelectedClients([])}>Limpiar</button></>:null}</div></div>:null}
            <div className={clientView==='grid'?'client-hub-grid':'client-hub-list'}>
              {clientView==='list'?clientHeadRow():null}
              {liveClients.map(client=>(
                <ClientHubCard key={client.id} client={client} pay={paymentStatuses.find(ps=>String(ps.client_id)===String(client.id))} stat={clientHubStats.get(String(client.id))} canSeeBilling={canSeeBilling} canManage={canManageClients} canManageTerms={roleCan(user?.role,'commercial-terms.manage')} archiveBusy={archiveBusy===`client:${client.id}`} onOpen={()=>setDetail({kind:'client',id:client.id})} onToggleArchive={()=>void setClientArchive(client.id,client.active===false)} refresh={load} role={user?.role||'viewer'} selectable={canManageClients} selected={selectedClients.includes(String(client.id))} onSelect={()=>toggleClientSelected(String(client.id))}/>
              ))}
              {!liveClients.length&&archivedClients.length&&clientStatusFilter!=='inactive'?<p className="empty-copy">Los clientes que coinciden con los filtros están archivados. Abrí «Archivados» para verlos.</p>:null}
              {!displayedClients.length ? (
                clients.length===0 ? (
                  <p className="empty-copy">
                    Todavía no hay clientes. Creá el primero para empezar.
                  </p>
                ) : (
                  <div className="empty-copy">
                    <p>{clientSearch.trim()?'No hay clientes que coincidan con tu búsqueda y filtros.':'No hay clientes con este estado.'}</p>
                    <button className="text-button" type="button" onClick={()=>{setClientSearch('');setClientStatusFilter('');}}><X size={14}/>Limpiar filtros</button>
                  </div>
                )
              ) : null}
            </div>
            {archivedClients.length ? (
              <details className="archived-capsule" open={clientStatusFilter==='inactive'}>
                <summary>Archivados ({archivedClients.length})</summary>
                <div className={clientView==='grid'?'client-hub-grid':'client-hub-list'}>
                  {clientView==='list'?clientHeadRow():null}
                  {archivedClients.map(client=>(
                    <ClientHubCard key={client.id} client={client} pay={paymentStatuses.find(ps=>String(ps.client_id)===String(client.id))} stat={clientHubStats.get(String(client.id))} canSeeBilling={canSeeBilling} canManage={canManageClients} canManageTerms={roleCan(user?.role,'commercial-terms.manage')} archiveBusy={archiveBusy===`client:${client.id}`} onOpen={()=>setDetail({kind:'client',id:client.id})} onToggleArchive={()=>void setClientArchive(client.id,client.active===false)} refresh={load} role={user?.role||'viewer'} selectable={canManageClients} selected={selectedClients.includes(String(client.id))} onSelect={()=>toggleClientSelected(String(client.id))}/>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        )}
        {active === "Proyectos" && (
          <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ENTREGAS Y CAPACIDAD</p>
                <h2>{liveProjects.length} proyecto{liveProjects.length === 1 ? "" : "s"}</h2>
              </div>
              <SelectCustom label="Cliente" choices={[{value:'',label:'Todos'},...clients.map(client=>({value:String(client.id),label:client.name}))]} value={projectClientFilter} onChange={setProjectClientFilter}/>
            </div>
            <div className="kpi-strip" aria-label="Métricas de proyectos">
              <article className="kpi-card tone-green">
                <p className="eyebrow">ACTIVOS</p>
                <strong>{projectKpis.active}</strong>
                <small>Con trabajo en curso</small>
              </article>
              <article className="kpi-card tone-warning">
                <p className="eyebrow">PAUSADOS</p>
                <strong>{projectKpis.paused}</strong>
                <small>Sin producción activa</small>
              </article>
              <article className="kpi-card tone-blue">
                <p className="eyebrow">COMPLETADOS</p>
                <strong>{projectKpis.completed}</strong>
                <small>Cerrados en el historial</small>
              </article>
              <article className="kpi-card tone-brand">
                <p className="eyebrow">PIEZAS TOTALES</p>
                <strong>{projectKpis.pieces}</strong>
                <small>Órdenes de los proyectos visibles</small>
              </article>
            </div>
            {canManageProjects&&liveProjects.length?<div className="bulk-bar" role="status" aria-live="polite"><span className="bulk-count">{selectedProjects.length?<><b>{selectedProjects.length}</b> de {BATCH_LIMITS.projects} seleccionado{selectedProjects.length===1?'':'s'}</>:<span className="bulk-hint">Seleccioná varios para operar en lote · máximo {BATCH_LIMITS.projects}</span>}</span><div className="inline-actions bulk-actions"><button type="button" className="text-button" onClick={selectVisibleProjects}>Seleccionar visibles</button>{selectedProjects.length?<><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchProjects(true)}>Archivar</button><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchProjects(false)}>Reactivar</button><button type="button" className="text-button" onClick={()=>setSelectedProjects([])}>Limpiar</button></>:null}</div></div>:null}
            {projectsState === 'error' && projects.length ? <p className="error" role="alert">No se pudieron actualizar los proyectos. Se muestra la última lista cargada. <button type="button" className="text-button" onClick={()=>void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los proyectos.'))}>Reintentar</button></p> : null}
            <div className={projectView==='grid'?'project-grid':'project-list'}>
              {projectView==='list'?<div className="project-entry-head" aria-hidden="true"><span>Proyecto</span><span>Estado</span><span>Fechas y piezas</span><span>Responsables</span><span>Acciones</span></div>:null}
              {liveProjects.map(project => projectEntry(project))}
              {!visibleProjects.length ? (
                projectsState === 'loading' && !projects.length ? (
                  <p role="status">Cargando proyectos…</p>
                ) : projectsState === 'error' && !projects.length ? (
                  <p className="error" role="alert">No se pudieron cargar los proyectos. <button type="button" className="text-button" onClick={()=>void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los proyectos.'))}>Reintentar</button></p>
                ) : (
                  <p className="empty-copy">
                    {projectClientFilter ? "Este cliente no tiene proyectos." : "Creá un proyecto después de cargar un cliente."}
                  </p>
                )
              ) : null}
            </div>
            {archivedProjects.length ? (
              <details className="archived-capsule">
                <summary>Archivados ({archivedProjects.length})</summary>
                <div className={projectView==='grid'?'project-grid':'project-list'}>
                  {projectView==='list'?<div className="project-entry-head" aria-hidden="true"><span>Proyecto</span><span>Estado</span><span>Fechas y piezas</span><span>Responsables</span><span>Acciones</span></div>:null}
                  {archivedProjects.map(project => projectEntry(project))}
                </div>
              </details>
            ) : null}
          </section>
        )}
        {active === "Presupuestos" && (
          <section className="panel directory">
            <div className="kpi-strip" aria-label="Métricas de presupuestos">
              <article className="kpi-card tone-brand">
                <p className="eyebrow">PROPUESTAS</p>
                <strong>{budgets.length}</strong>
                <div className="kpi-amounts">
                  {budgetKpis.totals.size ? Array.from(budgetKpis.totals).map(([currency, amount]) => (
                    <span key={currency}>{moneyKpi(amount, currency)}</span>
                  )) : <span>Sin propuestas</span>}
                </div>
              </article>
              <article className="kpi-card tone-warning">
                <p className="eyebrow">BORRADORES</p>
                <strong>{budgetKpis.drafts}</strong>
                <small>Sin enviar al cliente</small>
              </article>
              <article className="kpi-card tone-green">
                <p className="eyebrow">ACEPTADAS</p>
                <strong>{budgetKpis.accepted}</strong>
                <small>Con aprobación del cliente</small>
              </article>
              <article className="kpi-card tone-blue">
                <p className="eyebrow">VENCEN ESTA SEMANA</p>
                <strong>{budgetKpis.expiring}</strong>
                <small>Vigencia en los próximos 7 días</small>
              </article>
            </div>
            <p className="directory-summary">{budgets.length} presupuestos · Propuestas y aprobaciones</p>
            {budgetsState === 'error' && budgets.length ? <p className="error" role="alert">No se pudieron actualizar los presupuestos. Se muestra la última lista cargada. <button type="button" className="text-button" onClick={()=>void loadBudgets()}>Reintentar</button></p> : null}
            <div className="budget-hub-grid">
              {budgets.length ? (
                budgets.map((budget) => (
                  <article className="ops-card budget-hub-card" key={budget.id}>
                    <header className="budget-hub-head">
                      <span className="budget-number">{budget.number}</span>
                      <span className="budget-state" data-status={budget.status}>{{draft:'Borrador',sent:'Enviado',accepted:'Aceptado',rejected:'Rechazado',expired:'Vencido'}[budget.status]||budget.status}</span>
                    </header>
                    <h3>{budget.title}</h3>
                    <p className="budget-client">{budget.client_name}</p>
                    <dl className="budget-hub-facts">
                      <div><dt>Ítems</dt><dd>{budget.item_count}</dd></div>
                      <div><dt>Vigencia</dt><dd>{budget.valid_until?listDateShort(budget.valid_until)||'Sin fecha':'Sin fecha'}</dd></div>
                      <div className="budget-hub-fact-amount"><dt>Sin IVA</dt><dd title={money(Number(budget.subtotal),budget.currency)}>{money(Number(budget.subtotal),budget.currency)}</dd></div>
                    </dl>
                    <strong className="budget-hub-total">{money(Number(budget.total),budget.currency)}<small>IVA incl.</small></strong>
                    <footer className="budget-hub-actions"><BudgetActions id={budget.id} canInvoice={roleCan(user?.role,'invoices.manage')} refresh={async()=>setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets)}/><RemoveRecord kind="budgets" id={budget.id} name={budget.title} role={user?.role||'viewer'} done={async()=>setBudgets((await request<{budgets:Budget[]}>('/api/agency/budgets')).budgets)}/></footer>
                  </article>
                ))
              ) : budgetsState === 'loading' ? (
                <p role="status">Cargando presupuestos…</p>
              ) : budgetsState === 'error' ? (
                <p className="error" role="alert">No se pudieron cargar los presupuestos. <button type="button" className="text-button" onClick={()=>void loadBudgets()}>Reintentar</button></p>
              ) : (
                <p className="empty-copy">
                  Todavía no hay presupuestos. Creá el primero con un valor sin
                  IVA.
                </p>
              )}
            </div>
          </section>
        )}
        {active === "Informes" && <ReportsWorkspace key={user?.organization_id} role={user?.role||'viewer'} organizationName={user?.organization_name||''}/>}
        {active === "Finanzas" && (<>
          {financeEmpty && financeState !== 'ready' ? (
            financeState === 'error' ? (
              <section className="panel"><p className="error" role="alert">No se pudieron cargar las finanzas. <button type="button" className="text-button" onClick={()=>void loadFinance().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar las finanzas.'))}>Reintentar</button></p></section>
            ) : (
              <section className="panel"><p role="status">Cargando finanzas…</p></section>
            )
          ) : (<>
            {financeState === 'error' ? <p className="error" role="alert">No se pudieron actualizar las finanzas. Se muestra la última información recibida. <button type="button" className="text-button" onClick={()=>void loadFinance().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar las finanzas.'))}>Reintentar</button></p> : null}
          {(()=>{const availability=new Map<string,number>();for(const account of accounts)if(account.active!==false)availability.set(account.currency,(availability.get(account.currency)||0)+Number(account.balance));const receivable=new Map<string,number>();let pendingCount=0;for(const invoice of invoices){if(['paid','cancelled','draft'].includes(invoice.status))continue;const pending=Number(invoice.total)-Number(invoice.paid_amount);if(pending<=0)continue;receivable.set(invoice.currency,(receivable.get(invoice.currency)||0)+pending);pendingCount+=1;}return <div className="kpi-strip" aria-label="Resumen financiero">
            <article className="kpi-card tone-brand">
              <p className="eyebrow">DISPONIBLE</p>
              {availability.size?<div className="kpi-amounts">{Array.from(availability).map(([currency,total])=><span key={currency}>{moneyKpi(total,currency)}</span>)}</div>:<strong>Sin cuentas activas</strong>}
              <small>Saldo actual de cuentas activas por moneda</small>
            </article>
            <article className="kpi-card tone-warning">
              <p className="eyebrow">POR COBRAR</p>
              {receivable.size?<div className="kpi-amounts">{Array.from(receivable).map(([currency,total])=><span key={currency}>{moneyKpi(total,currency)}</span>)}</div>:<strong>Sin saldos pendientes</strong>}
              <small>Facturas emitidas o parciales con saldo pendiente</small>
            </article>
            <article className="kpi-card tone-blue">
              <p className="eyebrow">FACTURAS CON SALDO</p>
              <strong>{pendingCount}</strong>
              <small>{invoices.length?`${invoices.length} facturas cargadas`:'Todavía no hay facturas registradas'}</small>
            </article>
          </div>;})()}
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
                    <Plus size={14} />
                    + Cuenta
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setModal("transfer")}
                  >
                    <ArrowLeftRight size={14} />
                    Transferir
                  </button>
                </div>
              </div>
              {accounts.length ? (
                <div className="finance-account-grid">
                  {accounts.map((account) => (
                    <article className="finance-account-card" key={account.id} data-active={account.active===false?undefined:'true'}>
                      <header className="finance-account-head">
                        <b title={account.name}>{account.name}</b>
                        <span className="hub-chip">{{bank:'Bancaria',cash:'Efectivo',digital:'Digital',investment:'Inversión'}[account.account_type]||account.account_type} · {account.currency}</span>
                      </header>
                      <strong className="finance-account-balance">
                        {money(Number(account.balance),account.currency)}
                      </strong>
                      <dl className="finance-facts">
                        {account.account_number?<div><dt>N.º</dt><dd title={account.account_number}>{account.account_number}</dd></div>:null}
                        {account.holder_name?<div><dt>Titular</dt><dd title={account.holder_name}>{account.holder_name}</dd></div>:null}
                        {account.custodian_email?<div><dt>Custodia</dt><dd title={account.custodian_email}>{account.custodian_email}</dd></div>:null}
                      </dl>
                      <footer className="finance-card-actions"><RemoveRecord kind="accounts" id={account.id} name={account.name} role={user?.role||'viewer'} done={loadFinance}/></footer>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  Creá la primera cuenta para registrar cobros.
                </p>
              )}
              <div className="section-caption">
                <div>
                  <p className="eyebrow">TRAZABILIDAD</p>
                  <h3>Transferencias recientes</h3>
                </div>
              </div>
              {transfers.length ? (
                <div className="client-list">
                  <div className="finance-row-head" aria-hidden="true"><span>Transferencia</span><span>Monto</span></div>
                  {transfers.slice(0, 5).map((transfer) => (
                    <div className="payment-row finance-transfer-row" key={transfer.id}>
                      <div>
                        <b>
                          {transfer.from_account_name} →{" "}
                          {transfer.to_account_name}
                        </b>
                        <small>
                          {listDateShort(transfer.transferred_on)||'—'} ·{" "}
                          <ActorIdentity name={transfer.actor_name||transfer.created_by_email} photoUrl={transfer.actor_photo_url} verified={transfer.actor_verified===true}/>
                          {transfer.reference ? ` · ${transfer.reference}` : ""}
                        </small>
                        {transfer.to_currency&&<small>Recibido: {money(Number(transfer.received_amount||transfer.amount),transfer.to_currency)}</small>}
                      </div>
                      <strong>
                        {money(Number(transfer.amount),accounts.find(account=>account.id===transfer.from_account_id)?.currency||'PYG')}
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
                    <Plus size={14} />
                    + Factura
                  </button>
                  <button
                    className="primary"
                    onClick={() => setModal("payment")}
                  >
                    <Plus size={16} /> Registrar cobro
                  </button>
                </div>
              </div>
              {invoices.length ? (
                <div className="client-list">
                  <div className="finance-row-head" aria-hidden="true"><span>Factura</span><span>Total</span></div>
                  {invoices.map((invoice) => (
                    <div className="payment-row finance-invoice-row" key={invoice.id}>
                      <div>
                        <b>
                          {invoice.number} · {invoice.client_name}
                        </b>
                        <small>
                          <span className="finance-state" data-status={invoice.status}>{{issued:'Emitida',partial:'Parcial',paid:'Pagada',overdue:'Vencida',draft:'Borrador',cancelled:'Cancelada'}[invoice.status]||invoice.status}</span>
                          {" · pendiente "}
                          {money(Number(invoice.total) - Number(invoice.paid_amount),invoice.currency)}
                        </small>
                      </div>
                      <strong>
                        {money(Number(invoice.total),invoice.currency)}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-copy">
                  Todavía no hay facturas registradas.
                </p>
              )}
              {invoiceHasMore&&<div className="inline-actions"><button className="secondary" type="button" onClick={()=>void loadAllInvoices()}>Ver todas las facturas</button></div>}
              <div className="section-caption">
                <div>
                  <p className="eyebrow">COBROS REGISTRADOS</p>
                  <h3>Quién cobró y dónde quedó</h3>
                </div>
              </div>
              {payments.length ? (
                <div className="client-list">
                  <div className="finance-row-head" aria-hidden="true"><span>Cobro</span><span>Monto</span></div>
                  {payments.map((payment) => (
                    <div className="payment-row finance-payment-row" key={payment.id}>
                      <div>
                        <b>
                          {payment.client_name} · {payment.invoice_number}
                        </b>
                        <small>
                          {listDateShort(payment.received_on)||'—'} · {payment.account_name} (
                          {payment.account_type}) · recibió{" "}
                          <ActorIdentity name={payment.actor_name||payment.received_by_email||'Sin asignar'} photoUrl={payment.actor_photo_url} verified={payment.actor_verified===true}/>
                          {payment.reference ? ` · ${payment.reference}` : ""}
                        </small>
                        <ReceiptReversal payment={payment} refresh={loadFinance}/>
                      </div>
                      <strong>
                        {money(Number(payment.amount),payment.currency)}
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
          </>)}
          </>
        )}
        {active==='Previsión'&&user&&<FinancialForecast role={user.role} organizationId={user.organization_id}/>}
        <WorkspaceFooter/>
      </section>
      {myProfile&&user&&<MyProfile profile={user} close={()=>setMyProfile(false)} refresh={async()=>{clearDataCache();const d=await request<{user:User}>('/api/auth/me');setUser(d.user);}}/>}
      {detail?.kind==='order'&&<WorkDetail key={`${user?.organization_id}:${detail.id}`} id={detail.id} anchor={detail.anchor} initialEditing={detail.edit} organizationId={String(user?.organization_id||'')} role={user?.role||'viewer'} close={()=>setDetail(null)} refresh={load}/>}
      {detail?.kind==='client'&&<ClientDetail key={detail.id} id={detail.id} role={user?.role||'viewer'} close={()=>setDetail(null)} refresh={load} createProject={id=>{setProjectClient(id);setDetail(null);setModal('project');}} openOrder={id=>setDetail({kind:'order',id})}/>}
      {modal === "client" && (
        <Modal title="Nuevo cliente" onClose={close}>
          <div className="choice-list compact" role="group" aria-label="Cómo cargar el cliente">
            <button type="button" className={clientMode?'choice active':'choice'} aria-pressed={clientMode} onClick={()=>setClientMode(true)}>Completar desde RUC</button>
            <button type="button" className={!clientMode?'choice active':'choice'} aria-pressed={!clientMode} onClick={()=>setClientMode(false)}>Carga manual</button>
          </div>
          {clientMode ? (
            <ClientRuc embedded refresh={load} onCreated={close}/>
          ) : (
            <ClientForm
              request={request}
              done={(client) => {
                setClients((current) => [client, ...current]);
                setSummary((current) => ({
                  ...current,
                  active_clients: current.active_clients + 1,
                }));
                close();
              }}
            />
          )}
        </Modal>
      )}
      {modal === "project" && (
        <Modal title="Nuevo proyecto" onClose={close}>
          <ProjectForm
            request={request}
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
            request={request}
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
            request={request}
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
            request={request}
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
            request={request}
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
