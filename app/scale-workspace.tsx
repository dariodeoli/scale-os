"use client";
import {ProjectCard} from './project-card';
import {Currency} from "./currencies";
import {usePathname,useRouter} from 'next/navigation';
import {sectionLabel,sectionPath,parentSection,childSections,tabLabels} from './navigation';
import Link from 'next/link';
import {normalizeCommercialDashboard, type CommercialDashboard} from './control-center-data';
import {WorkspaceSearch} from './workspace-search';
import {WorkspaceBrand} from './workspace-brand';
import {ThemeToggle} from './theme-toggle';
import {MobileNavigation} from './mobile-navigation';
import {DesktopSidebar, RAIL_ITEM} from './desktop-sidebar';
import {roleCan,BATCH_LIMITS,limitSelection} from './capabilities';
import './client-directory.css';
import './com-tables.css';
import dynamic from 'next/dynamic';
import {NotificationBell} from './notifications-ui';
import {WorkspaceFooter} from './workspace-footer';
import {GoogleSignIn} from './google-sign-in';
import {PersonContainer} from './person-container';
import {LoadingScreen} from './loading-screen';
import type {ReportsData} from './reports-workspace';
const DemoToolbar=dynamic(()=>import('./demo-toolbar').then(m=>m.DemoToolbar));
const DemoWelcome=dynamic(()=>import('./demo-toolbar').then(m=>m.DemoWelcome));
const MyProfile=dynamic(()=>import('./my-profile').then(m=>m.MyProfile));
const ClientRuc=dynamic(()=>import('./client-ruc').then(m=>m.ClientRuc));
const PresenceTracker=dynamic(()=>import('./presence').then(m=>m.PresenceTracker),{ssr:false});
import {WorkspacePresence} from './presence';
import {CompanyCurrencyProvider} from './currency-provider';
const WorkDetail=dynamic(()=>import('./productivity-ui').then(m=>m.WorkDetail));
const ClientDetail=dynamic(()=>import('./productivity-ui').then(m=>m.ClientDetail));
import {setDataScope, clearDataCache, dataFetch} from './data-cache';
import {request} from './workspace-request';
import {sectionScope,scopeResources,shellDataUrl,shellSignature,shellContract,learnShellContract,type ShellResource,type ShellScope} from './shell-data';
import {prefetchSectionData} from './data-prefetch';
import './control-center.css';
import {Dialog} from './dialog';
import {completeSave} from './save-completion';
import {ProjectComments, CompanySelector, money} from './operations';
import './operations.css';
import './suite.css';
import {RecordEditor} from './suite';
import {AssignedPeople} from './assigned-people';
import {listDateShort,dueTone} from './list-format';
import {StateChip,ViewSwitch} from './ui-v2';
import {QuoteComposer} from './quote-composer';
import {PasswordPanel} from './password-panel';
import {PasswordField} from './password-field';
import {EmailField} from './email-field';
import {WorkspaceGuide, workspaceGuideScope, visibleModule, type WorkspaceGuideData} from './workspace-guide';
import {FXTransferForm} from './daily-controls';
import {SelectCustom} from './profile-controls';
import {filterProductionOrders} from './production-filter';
import type {Status} from './production-board';
import {defaultWorkspacePreferences, workspacePreferenceKey} from './workspace-preferences';
import {useWorkspacePreferences,useStartupPreference,useLocalCalendarDay} from './use-workspace-preferences';
import {clientPortfolioStats} from './client-format';
import type {Account,AccountTransfer,Budget,Client,ClientPaymentStatus,Invoice,Member,MetricEvent,ModalKind,PaymentRecord,Project,Summary,User,WorkOrder} from './workspace-types';
import {SinAccesoSection} from './sections/sin-acceso';
import {EquipoSection} from './sections/equipo';
import {PermisosSection} from './sections/permisos';
import {HistorialSection} from './sections/historial';
import {ActividadSection} from './sections/actividad';
import {InvitacionesSection} from './sections/invitaciones';
import {ComisionesSection} from './sections/comisiones';
import {PipelineSection} from './sections/pipeline';
import {MetricasSection} from './sections/metricas';
import {PlanesSection} from './sections/planes';
import {InventarioSection} from './sections/inventario';
import {EstudioSection} from './sections/estudio';
import {ConfiguracionSection} from './sections/configuracion';
import {PreferenciasSection} from './sections/preferencias';
import {PapeleraSection} from './sections/papelera';
import {InformesSection} from './sections/informes';
import {PrevisionSection} from './sections/prevision';
import {PresupuestosSection} from './sections/presupuestos';
import {FinanzasSection} from './sections/finanzas';
import {ProduccionSection} from './sections/produccion';
import {ClientesSection} from './sections/clientes';
import {MoraSection} from './sections/mora';
import {ProyectosSection} from './sections/proyectos';
import {ResumenSection} from './sections/resumen';
import {AccountForm,ClientForm,InvoiceForm,OrderForm,PaymentForm,ProjectForm} from './workspace-forms';
import {notify} from './feedback';
import {SubscriptionPanel, SubscriptionNotice} from './subscription-panel';
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
import {ClientDirectoryToolbar,filterClientDirectory} from "./client-directory-toolbar";
import {
  Archive,
  ArchiveRestore,
  CircleDollarSign,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Clapperboard,
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
  Target,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const nav = [
  ["Resumen", LayoutDashboard],
  ["Pipeline", Target],
  ["Clientes", Users],
  ["Presupuestos", FileText],
  ["Proyectos", FolderKanban],
  ["Producción", Clapperboard],
  ["Inventario", Boxes],
  ["Estudio", CalendarDays],
  ["Finanzas", WalletCards],
  ["Informes", BarChart3],
  ["Equipo", BriefcaseBusiness],
  ["Configuración", Settings],
] as const;
function localMonth(){const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).formatToParts(new Date());return `${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;}
export function identityScope(user:Pick<User,'id'|'organization_id'|'role'>|null){
  return user?`${user.id}:${user.organization_id}:${user.role}`:'';
}
export function identityScopeChanged(previous:Pick<User,'id'|'organization_id'|'role'>|null,next:Pick<User,'id'|'organization_id'|'role'>){
  return identityScope(previous)!==identityScope(next);
}
export function shouldRollbackOrderMutation(failingVersion:number,latestVersion:number){
  return failingVersion===latestVersion;
}
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
// Datos compartidos del shell: qué recursos necesita cada sección y cuánto vale
// Datos compartidos del shell: qué pide cada sección, con qué recorte y cuánto
// vale lo ya cargado. Navegar entre secciones no vuelve a pedir lo que está en
// memoria; solo se refresca lo que la sección activa necesita y ya venció.
// El alcance por sección y el recorte de `work-orders` viven en `shell-data.ts`.
const DATA_FRESH_MS=120000;
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
  const lastDataSection=useRef(requestedSection);
  function setActive(label:string){router.push(sectionPath(label));}
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [paymentInvoice,setPaymentInvoice]=useState('');
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
  const lastIdentityRefresh=useRef(0);
  const [workspaceScope,setWorkspaceScope]=useState('');
  const [guideData,setGuideData]=useState<WorkspaceGuideData>({scope:null,status:'unknown'});
  const dataLoadSequence=useRef(0);
  const dataFreshness=useRef<Record<string,number>>({});
  const contractKnown=useRef(false);
  const [projectsState,setProjectsState]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{setProjectsState(guideData.status==='error'?'error':guideData.status==='ready'?'ready':'loading');},[guideData.status]);
  // Estado de los datos compartidos: lo consume el chrome y lo exponen las
  // secciones para mostrar esqueletos por bloque en vez de pantallas vacías.
  const shellDataState=guideData.status==='error'?'error':guideData.status==='ready'?'ready':'loading';
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
    // El shell calienta solo los recortes acotados: la lista completa de órdenes
    // se pide cuando la sección realmente se abre, nunca al pasar el mouse.
    const scope=sectionScope(label);
    for(const resource of scopeResources(scope)){
      const config=scope[resource];
      if(!config?.limit)continue;
      void dataFetch(shellDataUrl(resource,config),{credentials:'include'}).catch(()=>{});
    }
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
    const refreshIdentity=()=>{const now=Date.now();if(now-lastIdentityRefresh.current<15000)return;lastIdentityRefresh.current=now;void request<{user:User}>('/api/auth/me').then(d=>{
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
  const [summary, setSummary] = useState<Summary>({
    active_clients: 0,
    active_projects: 0,
    open_orders: 0,
    unanswered_budgets: null,
    unverified_inventory: null,
    upcoming_deliveries: null,
  });
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
    // El total de entregas próximas sale del agregado del API (exacto también
    // cuando la sección pide una ventana de órdenes); la lista es el respaldo.
    const deliveries = summary.upcoming_deliveries ?? orders.filter(order => {
      if (!order.due_date || ["approved", "published"].includes(order.status)) return false;
      const due = new Date(order.due_date);
      return !Number.isNaN(due.getTime()) && due >= today && due <= week;
    }).length;
    return { active, paused, activeProjects, deliveries };
  }, [clients, projects, orders, summary.upcoming_deliveries]);
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
  async function load(identity:User|null=user,scope:ShellScope=sectionScope(requestedSection)) {
    if(!identity||identity.subscription?.hasAccess===false)return;
    const sequence=++dataLoadSequence.current;
    const guideScope=workspaceGuideScope({userId:String(identity.id),organizationId:String(identity.organization_id),role:identity.role,demo:!!identity.demo_owner_user_id});
    const scopeReady=(next:ShellScope)=>scopeResources(next).every(resource=>dataFreshness.current[shellSignature(resource,next[resource])]>0);
    setGuideData({scope:guideScope,status:'loading'});
    const loadedScope=workspacePreferenceKey(String(identity?.id||''),String(identity?.organization_id||''));
    // Una fase del alcance: pide lo que corresponde, valida y aplica el contrato.
    const applyScope=async(next:ShellScope)=>{
      const needs=(resource:ShellResource)=>Boolean(next[resource]);
      const ordersPromise = !needs('orders')
        ? Promise.resolve({workOrders:orders})
        : request<{ workOrders: WorkOrder[] }>(shellDataUrl('orders',next.orders));
      const [clientData, projectData, orderData, summaryData] = await Promise.all(
        [
          needs('clients')?request<{ clients: Client[] }>(shellDataUrl('clients',next.clients)):{clients},
          needs('projects')?request<{ projects: Project[] }>(shellDataUrl('projects',next.projects)):{projects},
          ordersPromise,
          needs('summary')?request<{ summary: Summary }>(shellDataUrl('summary',next.summary)):{summary},
        ],
      );
      if(sequence!==dataLoadSequence.current)return null;
      if(!Array.isArray(clientData?.clients)||!Array.isArray(projectData?.projects)||!Array.isArray(orderData?.workOrders)||!summaryData?.summary)throw new Error('El servidor devolvió datos incompletos. Reintentá.');
      if(needs('clients')){setClients(clientData.clients);dataFreshness.current[shellSignature('clients',next.clients)]=Date.now();}
      if(needs('projects')){setProjects(projectData.projects);dataFreshness.current[shellSignature('projects',next.projects)]=Date.now();}
      if(needs('orders')){setOrders(orderData.workOrders);dataFreshness.current[shellSignature('orders',next.orders)]=Date.now();}
      if(needs('summary')){setSummary(summaryData.summary);dataFreshness.current[shellSignature('summary',next.summary)]=Date.now();}
      return {clientData,projectData,orderData,summaryData};
    };
    try{
    const first=await applyScope(scope).catch(async(cause:unknown)=>{
      // Un 400 de proyección apaga `?fields=` en la sesión y reintenta sin recorte.
      if(scopeResources(scope).some(resource=>scope[resource]?.fields)&&cause instanceof Error&&/Campos inválidos/i.test(cause.message)){
        learnShellContract({fields:false});
        if(sequence!==dataLoadSequence.current)return null;
        return applyScope(sectionScope(requestedSection));
      }
      throw cause;
    });
    if(!first)return;
    setStartupDataScope(loadedScope);
    if(scopeReady(sectionScope(requestedSection,shellContract())))setGuideData({scope:guideScope,status:'ready',counts:{clients:first.clientData.clients.length,projects:first.projectData.projects.length,orders:first.orderData.workOrders.length}});
    }catch(cause){
      if(sequence!==dataLoadSequence.current)return;
      if(guideData.status!=='ready')setGuideData({scope:guideScope,status:'error'});
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
    // Navegar cambia la sección y su proyección: la firma cargada manda. Si la
    // sección nueva pide otro recorte, la lista vieja no se reusa (el tablero
    // rompía al pintar tarjetas proyectadas para Resumen).
    const pathChanged=lastDataPath.current!==pathname;
    const sectionChanged=lastDataSection.current!==requestedSection;
    lastDataPath.current=pathname;
    lastDataSection.current=requestedSection;
    if(!pathChanged&&!sectionChanged)return;
    if(!signedIn||!user||user.subscription?.hasAccess===false)return;
    const scope=sectionScope(requestedSection);
    const stale:ShellScope={};
    for(const resource of scopeResources(scope)){
      const request=scope[resource];
      const signature=shellSignature(resource,request);
      const loaded=dataFreshness.current[signature]>0;
      if(resource==='orders'&&!loaded)setOrders(current=>current.length?[]:current);
      if(!loaded||Date.now()-dataFreshness.current[signature]>DATA_FRESH_MS)stale[resource]=request;
    }
    if(!scopeResources(stale).length)return;
    void load(user,stale).catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron actualizar los datos.'));
  },[pathname,requestedSection,signedIn]);
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
        if(data.user.subscription?.hasAccess!==false)return load(data.user,sectionScope(sectionLabel(pathname))).catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los datos.'));
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
  // Fila de la vista lista de Proyectos (contrato v2): una línea por celda,
  // acciones de ícono propias (archivar/reactivar y editar) para no depender de
  // los children de la tarjeta — el drawer del proyecto sigue viviendo en la
  // tarjeta (vista cuadrícula).
  // Acción de ícono de la fila: targets 44/28 sin el min-height legado de
  // `.icon-button` (que empujaba la fila a 57px).
  const ROW_ICON_ACTION='grid h-11 w-11 min-h-0 shrink-0 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7';
  function projectRowEntry(project:Project){
    const client=clients.find(c=>String(c.id)===String(project.client_id));
    const archived=project.active===false;
    const statusTone=archived?'mute':project.status==='active'?'ok':project.status==='paused'?'warn':project.status==='completed'?'info':'bad';
    const statusText=archived?'Archivado':project.status==='active'?'Activo':project.status==='paused'?'Pausado':project.status==='completed'?'Completado':'Cancelado';
    const pieces=Number(project.work_order_count||0);
    return <>
      <span className="flex min-w-0 items-center gap-2">
        {canManageProjects?<input type="checkbox" className="size-4 shrink-0 accent-fono" checked={selectedProjects.includes(String(project.id))} onChange={()=>toggleProjectSelected(String(project.id))} aria-label={`Seleccionar ${project.name}`}/>:null}
        <span className="flex min-w-0 items-baseline gap-1.5">
          <b className="min-w-0 truncate text-[13.5px] font-semibold text-fore" title={project.name}>{project.name}</b>
          <small className="min-w-0 truncate text-[11px] text-mute" title={client?.name||'Sin cliente'}>· {client?.name||'Sin cliente'}</small>
        </span>
      </span>
      <span className="flex items-center"><StateChip tone={statusTone}>{statusText}</StateChip></span>
      <span className="min-w-0 truncate text-[11.5px] text-mute" title={`Inicio ${listDateShort(project.start_date)||'sin fecha'} · Entrega ${listDateShort(project.due_date)||'sin fecha'} · ${pieces} pieza${pieces===1?'':'s'}`}>{listDateShort(project.start_date)||'Sin inicio'} · <span data-tone={dueTone(project.due_date)}>{listDateShort(project.due_date)||'Sin entrega'}</span> · <b className="tabular-nums">{pieces}</b> pieza{pieces===1?'':'s'}</span>
      <span className="flex min-w-0 items-center"><AssignedPeople people={project.assignees}/></span>
      <span className="flex items-center justify-end gap-1">
        {canManageProjects?<button type="button" className={ROW_ICON_ACTION} disabled={archiveBusy===`project:${project.id}`} title={archived?'Reactivar proyecto':'Archivar proyecto'} aria-label={`${archived?'Reactivar':'Archivar'} proyecto: ${project.name}`} onClick={()=>void setProjectArchive(project.id,archived)}>{archived?<ArchiveRestore size={15}/>:<Archive size={15}/>}</button>:null}
        <RecordEditor kind="projects" recordId={project.id} name={project.name} role={user?.role||'viewer'} refresh={load}/>
      </span>
    </>;
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
      if(data.user.subscription?.hasAccess!==false)await load(data.user,sectionScope(requestedSection));
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
  const close = () => {setModal(null);setProjectClient('');setPaymentInvoice('');};
  /** “Registrar cobro” desde una fila: abre el modal con la factura ya elegida. */
  const openPayment = (invoiceId = '') => {setPaymentInvoice(invoiceId);setModal('payment');};
  /** Salida de los vacíos FIN (ronda 14, #62): Finanzas con el alta de factura abierta. */
  const openInvoice = () => {setActive('Finanzas');setModal('invoice');};
  const selectedProductionClient = clients.some(client => String(client.id) === productionClientId) ? productionClientId : "";
  const productionOrders = filterProductionOrders(orders, projects, selectedProductionClient,{...preferences.production,userId:String(user?.id||''),today:productionToday});
  const hasProductionFilters=!!productionClientId||preferences.production.mine||preferences.production.week;
  if (loading) return <LoadingScreen name={signedIn?(user?.full_name||user?.email||''):''} photoUrl={signedIn?(user?.photo_url??undefined):undefined} roleLabel={signedIn?assignableRoles.find(role=>role.id===user?.role)?.label:undefined}/>;
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

  // Ítem de nav (riel y drawer): mismo esqueleto, tono por superficie. El riel
  // marca el activo con barra dorada y tile de ícono; el drawer usa el tono de
  // marca sobre superficie clara. Foco visible en ambos y sin subrayado.
  const NAV_ICON='nav-icon grid size-7 shrink-0 place-items-center rounded-lg transition';
  const navItemClass=(active:boolean,tone:'rail'|'light')=>`${active?'active ':''}${RAIL_ITEM} ${tone==='rail'
    ? `relative ${active?'bg-white/[0.14] text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gold':'text-white/75 hover:bg-white/[0.08] hover:text-white'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`
    : `${active?'bg-fono/10 text-fono-light':'text-mute hover:bg-ink-700 hover:text-fore'} focus-visible:ring-2 focus-visible:ring-fono/40`}`;
  const navIconClass=(active:boolean,tone:'rail'|'light')=>`${NAV_ICON} ${tone==='rail'?(active?'bg-white/20 text-white':'bg-white/10 text-white/80'):(active?'bg-fono/15 text-fono-light':'bg-ink-700 text-mute')}`;
  const sidebarContent=(tone:'rail'|'light')=><>
        <div className="mobile-sidebar-brand"><WorkspaceBrand/></div>
        <p className="nav-caption mb-1 mt-2 px-3 font-mono text-[10px] uppercase tracking-[.14em] text-mute">Espacio de trabajo</p>
        <nav aria-label="Menú principal" className={`grid gap-1 [&_a]:no-underline ${tone==='rail'?'min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden':''}`}>
          {visibleNav.map(([label, Icon]) => (
            <Link
              key={label}
              className={navItemClass(activeParent === label,tone)}
              aria-current={activeParent===label?'page':undefined}
              title={label}
              aria-label={label}
              href={sectionPath(allowedChildren(label)[0])}
              onMouseEnter={()=>prefetchSection(allowedChildren(label)[0])}
              onFocus={()=>prefetchSection(allowedChildren(label)[0])}
            >
              <span className={navIconClass(activeParent===label,tone)}><Icon size={16}/></span>
              <span className="nav-label min-w-0 break-words">{label}</span>
            </Link>
          ))}
          <button type="button" className={`nav-logout ${navItemClass(false,tone)}`} onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"><span className={navIconClass(false,tone)}><LogOut size={16}/></span><span className="nav-label">Cerrar sesión</span></button>
        </nav>
        <div className={`sidebar-bottom mt-auto grid grid-cols-[minmax(0,1fr)] gap-1.5 border-t pt-3 ${tone==='rail'?'border-white/[0.12]':'border-ink-600'}`}>
          <div className="profile-footer min-w-0"><button className={`user w-full min-w-0 justify-start rounded-xl px-2 py-1.5 text-left transition ${tone==='rail'?'hover:bg-white/10':'hover:bg-ink-700'}`} aria-label="Abrir mi perfil" onClick={()=>setMyProfile(true)}><PersonContainer name={user?.full_name||firstName} photoUrl={user?.photo_url} secondary={assignableRoles.find(role=>role.id===user?.role)?.label||user?.role} verified/></button></div>
        </div>
      </>;
  return (
    <CompanyCurrencyProvider organizationId={user?.organization_id||''} defaultCurrency={user?.default_currency}><main data-shell-data={shellDataState} className={`shell control-shell ${active==='Producción'?'production-mode':''} ${active==='Producción'&&productionView==='Tablero'?'production-board-mode':''}`}>
      <PresenceTracker key={`${user?.id}:${user?.organization_id}`}/>
      <DesktopSidebar>
        <div className="sidebar-brand"><WorkspaceBrand/></div>
        {sidebarContent('rail')}
      </DesktopSidebar>
      {/* El content ocupa el ancho restante por flex (`flex-1`), no por un
          `width: calc(100% - riel)` atado a cada estado del riel: colapsar o
          expandir el riel es una sola transición y el content se recalcula
          solo, sin `max-width` que deje ancho sin usar (issue #61). */}
      <section className="content flex min-h-dvh min-w-0 flex-1 flex-col">
        {demoWelcome&&user?.demo_owner_user_id&&<DemoWelcome close={()=>setDemoWelcome(false)}/>}
        {active==='Producción'&&productionView==='Tablero'&&productionFiltersDialogScope===preferenceScope&&productionFiltersDialogScope&&preferencesReady&&<Dialog title="Filtros guardados del tablero" close={()=>setProductionFiltersDialogScope('')}><div className="ops-stack">
          <SelectCustom label="Responsable" value={preferences.production.mine?'mine':'all'} choices={[{value:'all',label:'Todas las asignaciones'},{value:'mine',label:'Asignadas a mí'}]} onChange={value=>updatePreferences({production:{...preferences.production,mine:value==='mine'}})}/>
          <SelectCustom label="Fecha de entrega" value={preferences.production.week?'week':'all'} choices={[{value:'all',label:'Todas las fechas'},{value:'week',label:'Vencen esta semana (hora local)'}]} onChange={value=>updatePreferences({production:{...preferences.production,week:value==='week'}})}/>
          <p className="form-note">De lunes a domingo según el calendario local de tu dispositivo. Incluye todos los estados; las órdenes sin fecha quedan fuera del filtro semanal. Se combina con el cliente elegido y se guarda para vos en esta empresa y navegador.</p>
          <button className="text-button" onClick={()=>updatePreferences({production:defaultWorkspacePreferences().production})}><RotateCcw size={14}/>Restablecer filtros</button>
          {preferenceWarning&&<p className="form-note" role="status">{preferenceWarning}</p>}
        </div></Dialog>}
        {subscriptionOpen&&user&&active!=='Configuración'&&<Dialog title="Suscripción de tu agencia" close={()=>setSubscriptionOpen(false)}><SubscriptionPanel embedded key={user.organization_id} state={user.subscription||null} error={subscriptionError} onRefresh={refreshSubscription} organizationName={user.organization_name}/></Dialog>}
        <div className="workspace-topbar sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-ink-600 bg-ink-800/95 px-4 py-2 shadow-[0_1px_0_rgb(37_28_41_/_4%)] backdrop-blur md:px-6 lg:px-8 xl:px-12 motion-reduce:[&_*]:transition-none max-md:z-30 max-md:grid max-md:grid-cols-1 max-md:gap-2" role="toolbar" aria-label="Controles del espacio de trabajo">
          <div className="topbar-primary flex min-w-0 flex-1 items-center gap-3">
            <div className="topbar-identity flex min-w-0 items-center gap-2 max-md:gap-2">
              <MobileNavigation>{sidebarContent('light')}</MobileNavigation>
            </div>
            <div className="topbar-workspace-context flex min-w-0 flex-1 items-center gap-3">
              <div className="topbar-company min-w-0 [&_.company-name]:truncate [&_.workspace]:!m-0 [&_.workspace]:min-w-0 [&_.workspace]:overflow-hidden">
                <CompanySelector name={companyLabel}/>
              </div>
              <div className="topbar-presence min-w-0 shrink-0 max-[520px]:hidden" role="group" aria-label="Personas activas en el espacio">
                <WorkspacePresence compact projectIds={projects.map(project=>String(project.id))} role={user?.role||'viewer'}/>
              </div>
            </div>
          </div>
          <div className="topbar-utilities flex min-w-0 flex-wrap items-center justify-end gap-2 max-md:contents">
            <div className="topbar-status flex items-center gap-2 max-md:col-span-full max-md:row-start-2">
              {user?.subscription&&<SubscriptionNotice state={user.subscription} onOpen={()=>{if(active==='Configuración')document.getElementById('settings-subscription')?.scrollIntoView({behavior:'smooth'});else setSubscriptionOpen(true);}}/>}
              {user?.demo_owner_user_id&&<DemoToolbar role={user.role}/>}
            </div>
            <div className="topbar-utility-actions flex min-w-0 items-center gap-2 [&>*]:min-h-10 [&>*]:min-w-10 max-md:[&>*]:min-h-11 max-md:[&>*]:min-w-11">
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
        <div className="flex min-w-0 flex-1 flex-col px-4 pb-8 pt-5 md:px-6 lg:px-8 xl:px-12">
        <header className="workspace-page-header mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 max-md:grid max-md:grid-cols-1">
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
            <div className="page-heading flex min-w-0 items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">{active==='Resumen'?'Centro de control':activeParent}</h1>
              {active==='Proyectos'&&<span className="page-count rounded-full bg-ink-700 px-2 py-0.5 text-[11px] tabular-nums text-mute">{projects.length} proyectos</span>}
            </div>
            <div className="header-actions flex flex-wrap items-center gap-2 max-md:w-full max-md:justify-start">
              {active==='Proyectos'&&<div className="workspace-view-controls"><ViewSwitch value={projectView as 'list'|'grid'} onChange={changeProjectView}/></div>}
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
        {active!=='Sin acceso'&&childSections(active).length>1&&<nav className="section-tabs [&>a]:no-underline" aria-label={`Apartados de ${activeParent}`}>{allowedChildren(activeParent).map(label=><Link key={label} href={sectionPath(label)} onMouseEnter={()=>prefetchSection(label)} onFocus={()=>prefetchSection(label)} aria-current={active===label?'page':undefined}>{tabLabels[label]||label}</Link>)}</nav>}
        {active==='Sin acceso'&&<SinAccesoSection/>}
        {active==='Equipo'&&<EquipoSection user={user}/>}
        {active==='Roles y permisos'&&<PermisosSection user={user}/>}
        {active==='Historial de trabajo'&&<HistorialSection user={user}/>}
        {active==='Invitaciones'&&<InvitacionesSection user={user}/>}
        {active==='Comisiones'&&<ComisionesSection user={user}/>}
        {active==='Pipeline'&&<PipelineSection user={user} metrics={metrics}/>}
        {active==='Métricas'&&<MetricasSection user={user} metrics={metrics}/>}
        {active==='Planes'&&<PlanesSection user={user}/>}
        {active==='Inventario'&&<InventarioSection user={user}/>}
        {active==='Estudio'&&<EstudioSection user={user}/>}
        {active==='Actividad'&&<ActividadSection user={user}/>}
        {active==='Configuración'&&<ConfiguracionSection user={user} subscriptionError={subscriptionError} refreshSubscription={refreshSubscription} exitDemoSimulation={exitDemoSimulation} deletionSignedOut={deletionSignedOut}/>}
        {active==='Preferencias'&&<PreferenciasSection user={user} preferencesReady={preferencesReady} preferences={preferences} preferenceWarning={preferenceWarning} updatePreferences={updatePreferences}/>}
        {active==='Papelera'&&<PapeleraSection load={load}/>}
        {active === "Resumen" && <ResumenSection dataState={shellDataState} guideProps={guideProps} user={user} orders={orders} load={load} setActive={setActive} summary={summary} stageCounts={stageCounts} projects={projects} setDetail={setDetail}/>}
        {active==='Producción'&&<ProduccionSection productionView={productionView} changeProductionView={changeProductionView} preferences={preferences} clients={clients} selectedProductionClient={selectedProductionClient} setProductionClientId={setProductionClientId} preferencesReady={preferencesReady} setProductionFiltersDialogScope={setProductionFiltersDialogScope} preferenceScope={preferenceScope} hasProductionFilters={hasProductionFilters} productionClientId={productionClientId} preferenceWarning={preferenceWarning} updatePreferences={updatePreferences} createOrder={canCreateRecord('Producción')?()=>setModal('order'):undefined} productionOrders={productionOrders} orders={orders} projects={projects} user={user} setActive={setActive} setDetail={setDetail} draggedOrderId={draggedOrderId} setDraggedOrderId={setDraggedOrderId} onDragEnd={onDragEnd} load={load}/>}
        {active==='Mora'&&<MoraSection user={user} paymentStatuses={paymentStatuses} moraFilter={moraFilter} setMoraFilter={setMoraFilter} moraSearch={moraSearch} setMoraSearch={setMoraSearch} moraUpdated={moraUpdated} moraReportsError={moraReportsError} moraDso={moraDso} onCreateInvoice={openInvoice}/>}
        {active==='Clientes'&&<ClientesSection dataState={shellDataState} user={user} clientView={clientView} clientStatusFilter={clientStatusFilter} setClientStatusFilter={setClientStatusFilter} clientSearch={clientSearch} setClientSearch={setClientSearch} archiveBusy={archiveBusy} bulkBusy={bulkBusy} selectedClients={selectedClients} setSelectedClients={setSelectedClients} canSeeBilling={canSeeBilling} canManageClients={canManageClients} clients={clients} displayedClients={displayedClients} liveClients={liveClients} archivedClients={archivedClients} paymentStatuses={paymentStatuses} clientHubStats={clientHubStats} commercialSummary={commercialSummary} commercialState={commercialState} directoryKpis={directoryKpis} cobrosKpis={cobrosKpis} load={load} setClientArchive={setClientArchive} toggleClientSelected={toggleClientSelected} selectVisibleClients={selectVisibleClients} batchClients={batchClients} setDetail={setDetail}/>}
        {active==='Proyectos'&&<ProyectosSection setToast={setToast} bulkBusy={bulkBusy} projectRow={projectRowEntry} projectView={projectView} selectedProjects={selectedProjects} setSelectedProjects={setSelectedProjects} projectsState={projectsState} canManageProjects={canManageProjects} clients={clients} projects={projects} projectClientFilter={projectClientFilter} setProjectClientFilter={setProjectClientFilter} projectKpis={projectKpis} visibleProjects={visibleProjects} liveProjects={liveProjects} archivedProjects={archivedProjects} load={load} selectVisibleProjects={selectVisibleProjects} batchProjects={batchProjects} projectEntry={projectEntry} createProject={canCreateRecord('Proyectos')?()=>setModal('project'):undefined}/>}
        {active==='Presupuestos'&&<PresupuestosSection loading={loading} user={user} budgetsState={budgetsState} budgets={budgets} invoices={invoices} budgetKpis={budgetKpis} summary={summary} loadBudgets={loadBudgets} setBudgets={setBudgets} onCreate={()=>setModal('budget')}/>}
        {active==='Informes'&&<InformesSection user={user} onCreateInvoice={openInvoice}/>}
        {active==='Finanzas'&&<FinanzasSection user={user} financeState={financeState} accounts={accounts} invoices={invoices} transfers={transfers} payments={payments} invoiceHasMore={invoiceHasMore} financeEmpty={financeEmpty} loadFinance={loadFinance} loadAllInvoices={loadAllInvoices} setModal={setModal} openPayment={openPayment} setToast={setToast}/>}
        {active==='Previsión'&&<PrevisionSection user={user} navigate={setActive} onCreateInvoice={openInvoice}/>}
        <div className="mt-auto pt-6"><WorkspaceFooter/></div>
        </div>
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
            key={paymentInvoice||'payment'}
            request={request}
            invoices={invoices}
            accounts={accounts}
            custodians={custodians}
            preselectInvoiceId={paymentInvoice}
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
