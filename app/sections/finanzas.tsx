"use client";
import type {Dispatch, SetStateAction} from 'react';
import {ArrowLeftRight, Plus} from 'lucide-react';
import {ActorIdentity} from '../actor-identity';
import {ReceiptReversal, ReconciliationWorkspace} from '../daily-controls';
import {RemoveRecord} from '../archive-controls';
import {moneyKpi} from '../client-format';
import {listDateShort} from '../list-format';
import {money} from '../operations';
import type {Account, AccountTransfer, Invoice, ModalKind, PaymentRecord, User} from '../workspace-types';

// Finanzas (cuentas, facturas, cobros, transferencias y conciliación).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type FinanzasSectionProps = {
  user: User | null;
  financeState: 'loading'|'ready'|'error';
  accounts: Account[];
  invoices: Invoice[];
  transfers: AccountTransfer[];
  payments: PaymentRecord[];
  invoiceHasMore: boolean;
  financeEmpty: boolean;
  loadFinance: () => Promise<void>;
  loadAllInvoices: () => Promise<void>;
  setModal: Dispatch<SetStateAction<ModalKind>>;
  setToast: Dispatch<SetStateAction<string>>;
};
export function FinanzasSection({user, financeState, accounts, invoices, transfers, payments, invoiceHasMore, financeEmpty, loadFinance, loadAllInvoices, setModal, setToast}: FinanzasSectionProps){
  return (
    <>
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
  );
}
