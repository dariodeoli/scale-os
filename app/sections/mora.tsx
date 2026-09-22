"use client";
import type {Dispatch, SetStateAction} from 'react';
import {SearchField} from '../search-field';
import {money} from '../operations';
import {listDateShort} from '../list-format';
import type {ClientPaymentStatus, User} from '../workspace-types';

// Mora y cobranzas (dominio FIN; CRM de cobranzas).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type MoraSectionProps = {
  user: User | null;
  paymentStatuses: ClientPaymentStatus[];
  moraFilter: string;
  setMoraFilter: Dispatch<SetStateAction<string>>;
  moraSearch: string;
  setMoraSearch: Dispatch<SetStateAction<string>>;
  moraUpdated: Date | null;
  moraReportsError: boolean;
  moraBuckets: {key:string;label:string;min:number;max:number;clients:number;amounts:Map<string,number>}[];
  moraDso: {currency:string;days:number}[] | null;
  visibleMoraClients: ClientPaymentStatus[];
  moneyMora: typeof money;
};
export function MoraSection({user, paymentStatuses, moraFilter, setMoraFilter, moraSearch, setMoraSearch, moraUpdated, moraReportsError, moraBuckets, moraDso, visibleMoraClients, moneyMora}: MoraSectionProps){
  return (
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
  );
}
