"use client";
import type {Dispatch, SetStateAction} from 'react';
import {CircleDollarSign, Eye, X} from 'lucide-react';
import {BATCH_LIMITS, roleCan} from '../capabilities';
import {clientState} from '../client-status';
import {clientWhatsappUrl} from '../client-links';
import {clientSince, moneyKpi} from '../client-format';
import {listDateShort} from '../list-format';
import {money} from '../operations';
import {ClientIdentity} from '../client-identity';
import {WhatsAppButton} from '../whatsapp-button';
import {RecordEditor} from '../suite';
import type {CommercialDashboard} from '../control-center-data';
import type {Client, ClientPaymentStatus, User} from '../workspace-types';

// Directorio de clientes (referencia #42: Clientes).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
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
  const state=clientState(client),tel=clientWhatsappUrl(client.phone||undefined),since=clientSince(client.created_at);
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
        <div><dt>Correo</dt><dd title={client.email||"Sin email registrado"}>{client.email || "Sin email registrado"}</dd></div>
        <div><dt>Teléfono</dt><dd title={client.phone||"Sin teléfono"}>{client.phone || "Sin teléfono"}</dd></div>
        <div><dt>RUC</dt><dd title={client.tax_id||"Sin RUC registrado"}>{client.tax_id || "Sin RUC registrado"}</dd></div>
        <div><dt>Cliente desde</dt><dd title={since||"Sin fecha de alta"}>{since || "Sin fecha de alta"}</dd></div>
      </dl>
      <div className="client-hub-stats" aria-label="Cartera del cliente" title={portfolio.length?portfolio.map(part=>part.text).join(' · '):undefined}>
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
type ClientesSectionProps = {
  user: User | null;
  clientView: string;
  clientStatusFilter: string;
  setClientStatusFilter: Dispatch<SetStateAction<string>>;
  clientSearch: string;
  setClientSearch: Dispatch<SetStateAction<string>>;
  archiveBusy: string;
  bulkBusy: boolean;
  setToast: Dispatch<SetStateAction<string>>;
  selectedClients: string[];
  setSelectedClients: Dispatch<SetStateAction<string[]>>;
  canSeeBilling: boolean;
  canManageClients: boolean;
  clients: Client[];
  displayedClients: Client[];
  liveClients: Client[];
  archivedClients: Client[];
  paymentStatuses: ClientPaymentStatus[];
  clientHubStats: Map<string, {projects:number;pieces:number;nextDue:string|null}>;
  commercialSummary: CommercialDashboard | null;
  commercialState: 'idle' | 'loading' | 'ready' | 'error';
  directoryKpis: {active:number;paused:number;activeProjects:number;deliveries:number};
  cobrosKpis: {alDia:number;porVencer:number;enMora:number;sinFactura:number};
  load: () => Promise<void>;
  setClientArchive: (id:string, archived:boolean) => Promise<void>;
  toggleClientSelected: (id:string) => void;
  selectVisibleClients: () => void;
  batchClients: (archived:boolean) => Promise<void>;
  setDetail: Dispatch<SetStateAction<{kind:'client'|'order';id:string;anchor?:string;edit?:boolean} | null>>;
};
export function ClientesSection({user, clientView, clientStatusFilter, setClientStatusFilter, clientSearch, setClientSearch, archiveBusy, bulkBusy, setToast, selectedClients, setSelectedClients, canSeeBilling, canManageClients, clients, displayedClients, liveClients, archivedClients, paymentStatuses, clientHubStats, commercialSummary, commercialState, directoryKpis, cobrosKpis, load, setClientArchive, toggleClientSelected, selectVisibleClients, batchClients, setDetail}: ClientesSectionProps){
  return (
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
  );
}
