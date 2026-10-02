'use client';
// Resumen comercial de la ficha de cliente (Refs #145): una sola fuente para
// «Cliente desde» (alta real, día de Asunción) y los montos del sistema. La
// fecha real de relación se etiqueta aparte («Inicio de relación») y sólo se
// muestra cuando es un día distinto del alta; el resto de las fechas legítimas
// (inicio comercial, activación comercial) viven con su propio nombre en sus
// secciones. Un solo objeto de resumen para toda la ficha.
import {fechaListaCorta} from 'owncoding-ui';
import {roleCan} from './capabilities';
import {clientDateSummary} from './client-format';
import {clientState} from './client-status';
import {money} from './money-format';
import {RecordEditor} from './suite';

export type ClientSummaryTerms = {planName: string; recurringAmount: string | number; currency: string; cadence: string; intervalMonths: number | null; invoiceRequired: boolean};
export type ClientSummary = {relationshipStartedOn: string | null; terms: ClientSummaryTerms | null};
export type ClientSummaryPayStatus = {payment_status: string; days_overdue: number; next_due_on: string | null; outstanding_amount: string; currency: string | null};
type SummaryClient = Record<string, unknown> & {created_at?: unknown; name?: unknown; active?: unknown; lifecycle_status?: unknown; tax_id?: unknown; legal_name?: unknown};

const s = (client: SummaryClient, key: keyof SummaryClient) => String(client[key] ?? '');

function cadenceLabel(terms: ClientSummaryTerms | null) {
  if (!terms) return 'Sin datos';
  if (terms.cadence === 'monthly') return 'Mensual';
  if (terms.cadence === 'interval') {const n = Number(terms.intervalMonths) || 1; return `Cada ${n} mes${n === 1 ? '' : 'es'}`;}
  if (terms.cadence === 'once') return 'Única vez';
  return 'Sin datos';
}

export function ClientCommercialSummary({id, client, payStatus, summary, role, reload}: {
  id: string;
  client: SummaryClient;
  payStatus: ClientSummaryPayStatus | null;
  summary: ClientSummary | null;
  role: string;
  reload: () => Promise<void>;
}) {
  if (!summary) return null;
  // «Cliente desde» = alta real; la fecha de relación, si difiere, va aparte.
  const dates = clientDateSummary({createdAt: s(client, 'created_at'), relationshipStartedOn: summary.relationshipStartedOn});
  return <section className="client-summary" aria-label="Resumen comercial del cliente">
    <div className="client-summary-grid">
      <article><span>Estado del servicio</span><strong>{clientState({lifecycle_status: s(client, 'lifecycle_status'), active: client.active !== false}).label}</strong></article>
      <article><span>Cobros</span><strong>{payStatus ? payStatus.payment_status === 'up_to_date' ? 'Al día' : payStatus.payment_status === 'due_soon' ? `Vence ${fechaListaCorta(payStatus.next_due_on, '') || 'próximamente'}` : `${payStatus.days_overdue} días de mora` : 'Sin datos'}</strong>{payStatus && payStatus.currency && Number(payStatus.outstanding_amount) > 0 ? <small title={`Pendiente ${money(Number(payStatus.outstanding_amount), payStatus.currency)}`}>Pendiente {money(Number(payStatus.outstanding_amount), payStatus.currency)}</small> : null}</article>
      <article><span>Plan</span><strong title={summary.terms?.planName || undefined}>{summary.terms?.planName || 'Sin plan registrado'}</strong>{!summary.terms && roleCan(role, 'commercial-terms.manage') ? <RecordEditor kind="clients" recordId={id} name={s(client, 'name')} role={role} refresh={reload} planCta="text" actions={[]}/> : null}</article>
      <article><span>Pago mensual</span><strong title={summary.terms ? money(String(summary.terms.recurringAmount), summary.terms.currency) : undefined}>{summary.terms ? money(String(summary.terms.recurringAmount), summary.terms.currency) : 'Sin datos'}</strong></article>
      <article><span>Recurrencia</span><strong>{cadenceLabel(summary.terms)}</strong></article>
      <article><span>Cliente desde</span><strong>{dates.since || 'Sin fecha registrada'}</strong></article>
      {dates.relationship ? <article><span>Inicio de relación</span><strong>{dates.relationship}</strong><small title="Fecha real declarada por el equipo; puede ser anterior al alta en el sistema">Fecha declarada por el equipo</small></article> : null}
      <article><span>Factura</span><strong>{summary.terms ? summary.terms.invoiceRequired ? 'Pide factura' : 'No pide factura' : 'Sin datos'}</strong></article>
      <article><span>RUC</span><strong title={s(client, 'tax_id') || undefined}>{s(client, 'tax_id') || 'Sin RUC registrado'}</strong>{s(client, 'legal_name') && s(client, 'legal_name') !== s(client, 'name') ? <small title={s(client, 'legal_name')}>{s(client, 'legal_name')}</small> : null}</article>
    </div>
  </section>;
}
