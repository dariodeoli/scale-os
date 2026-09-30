import {fail} from './suite-validation.js';

// Protección de datos personales del dominio Finanzas (Ley N° 7593/2025).
//
// Fuente única de la parte financiera del cumplimiento:
// - inventario de finalidades y retención por dataset (base del RAT de #112);
// - export de la parte financiera de un titular para el procedimiento ARSOP
//   (`financePersonalData`, que consume el endpoint de export de #112);
// - anonimización al vencer la retención (`anonymizeFinanceSubject`, que
//   consume el job programado de #112).
//
// Reglas duras:
// - Los registros contables NUNCA se borran por retención: se anonimizan los
//   identificadores y se conservan importes, fechas y estados para no romper
//   los libros (`FINANCE_NEVER_DELETE`).
// - La anonimización no toca la identidad de plataforma
//   (`user_personal_identities`) ni la auditoría (`agency_operation_audit`):
//   esas superficies quedan a cargo del job y del registro de #112, que debe
//   tratar los snapshots PII que la auditoría conserva.
// - Los plazos son un borrador operativo: el encuadre legal final de cada
//   negocio lo valida su asesoría.

export const FINANCE_PURPOSES = ['payroll', 'payments', 'commissions', 'billing', 'reports', 'treasury'];

// Plazo único del borrador fiscal/contable (prescripción y conservación de
// libros). Los extractos bancarios son respaldo operativo y los gastos
// planificados no son registro contable, por eso conservan ventanas menores.
const FINANCIAL_RETENTION_YEARS = 10;
const SUPPORT_RETENTION_YEARS = 5;

export const FINANCE_RETENTION_POLICY = [
 {dataset:'agency_collaborators', purpose:'payroll', subjects:['collaborator'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Ejecución de la relación laboral o de servicios y obligación contable/fiscal.',
  personalFields:['full_name', 'email', 'photo_url', 'notes'],
  keepFields:['compensation_type', 'compensation_amount', 'monthly_salary_amount', 'monthly_salary_currency', 'payment_day', 'invoices_company', 'started_on', 'ended_on', 'active']},
 {dataset:'agency_salary_month_overrides', purpose:'payroll', subjects:['collaborator'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Ejecución de la relación laboral y respaldo del cálculo de remuneraciones.',
  personalFields:['note'], keepFields:['collaborator_id', 'month', 'amount']},
 {dataset:'agency_commissions', purpose:'commissions', subjects:['collaborator'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Ejecución del contrato de comisión y obligación contable/fiscal.',
  personalFields:['beneficiary_name', 'notes'], keepFields:['invoice_id', 'collaborator_id', 'kind', 'percentage', 'amount', 'currency', 'status', 'due_on', 'paid_on']},
 {dataset:'agency_payouts', purpose:'payments', subjects:['collaborator'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Ejecución del pago, trazabilidad de tesorería y obligación contable/fiscal.',
  personalFields:['reference'], keepFields:['collaborator_id', 'commission_id', 'account_id', 'amount', 'paid_on']},
 {dataset:'bank_accounts', purpose:'treasury', subjects:['collaborator', 'other'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Operación de tesorería y obligación de identificación de cuentas.',
  personalFields:['account_number', 'holder_name', 'institution'], keepFields:['name', 'account_type', 'currency', 'balance', 'active']},
 {dataset:'agency_invoices', purpose:'billing', subjects:['client'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Obligación fiscal y contable de conservar comprobantes.',
  personalFields:['notes'], keepFields:['number', 'status', 'currency', 'total', 'paid_amount', 'issued_on', 'due_on']},
 {dataset:'agency_payments', purpose:'billing', subjects:['client'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'keep',
  legalBasis:'Cobros inmutables por diseño contable (`sync_agency_payment`): el asiento no se edita ni se borra.',
  personalFields:['reference'], keepFields:['invoice_id', 'account_id', 'amount', 'received_on'],
  note:'La retención se cumple con acceso restringido; un dato personal en la referencia solo se corrige con una reversión autorizada.'},
 {dataset:'agency_client_commercial_terms', purpose:'billing', subjects:['client'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'keep',
  legalBasis:'Obligación contable de conservar los términos facturados; la fila no contiene PII directa.',
  personalFields:[], keepFields:['plan_name', 'recurring_amount', 'currency', 'starts_on', 'ends_on', 'commission_recipient_id', 'commission_mode', 'commission_value']},
 {dataset:'agency_statement_lines', purpose:'treasury', subjects:['client', 'other'], retentionYears:SUPPORT_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Conciliación bancaria como respaldo operativo de los libros.',
  personalFields:['reference'], keepFields:['account_id', 'external_id', 'booked_on', 'amount']},
 {dataset:'agency_expenses', purpose:'payments', subjects:['other'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'keep',
  legalBasis:'Egresos inmutables por diseño contable (`sync_agency_expense`): el asiento no se edita ni se borra.',
  personalFields:['reference'], keepFields:['account_id', 'category', 'kind', 'amount', 'currency', 'paid_on'],
  note:'La retención se cumple con acceso restringido; un dato personal en la referencia solo se corrige con una reversión autorizada.'},
 {dataset:'agency_planned_expenses', purpose:'reports', subjects:['other'], retentionYears:SUPPORT_RETENTION_YEARS, onExpiry:'keep',
  legalBasis:'Planificación sin valor contable; se conserva para no reescribir previsiones pasadas.',
  personalFields:[], keepFields:['cadence', 'effective_month', 'category', 'amount', 'currency', 'kind']},
 {dataset:'agency_referral_discounts', purpose:'commissions', subjects:['client'], retentionYears:FINANCIAL_RETENTION_YEARS, onExpiry:'anonymize',
  legalBasis:'Obligación contable de conservar descuentos aplicados a comprobantes.',
  personalFields:['referrer', 'reason'], keepFields:['invoice_id', 'amount', 'status']},
];

// Tablas cuyos registros tienen valor probatorio contable/fiscal: la supresión
// de un titular las bloquea o anonimiza, jamás las borra. `record-lifecycle.js`
// solo archiva cuentas y presupuestos; el job de #112 no debe borrar estas filas.
export const FINANCE_NEVER_DELETE = [
 {dataset:'agency_invoices', reason:'Comprobantes de facturación (obligación fiscal/contable).'},
 {dataset:'agency_payments', reason:'Cobros y su trazabilidad de tesorería.'},
 {dataset:'agency_payment_reversals', reason:'Reversiones de cobros (trazabilidad contable).'},
 {dataset:'agency_payouts', reason:'Egresos a colaboradores y comisionistas.'},
 {dataset:'agency_commissions', reason:'Comisiones devengadas y su liquidación.'},
 {dataset:'agency_expenses', reason:'Egresos contables.'},
 {dataset:'agency_expense_reversals', reason:'Reversiones de egresos.'},
 {dataset:'agency_statement_lines', reason:'Extractos conciliados con los libros.'},
 {dataset:'agency_reconciliation_matches', reason:'Conciliación bancaria auditada.'},
 {dataset:'account_transfers', reason:'Transferencias entre cuentas.'},
 {dataset:'agency_client_commercial_terms', reason:'Términos facturados (historial append-only).'},
];

const RETENTION_NOTE = 'Los registros financieros se conservan por obligación contable/fiscal; al vencer su plazo se anonimizan los identificadores sin borrar importes, fechas ni estados.';

function positiveId(value, label) {
 const raw = String(value ?? '');
 if (!/^[1-9]\d{0,18}$/.test(raw) || BigInt(raw) > 9223372036854775807n) fail(`${label} inválido`);
 return raw;
}

function isoDate(value) {
 if (value === null || value === undefined) return null;
 const date = value instanceof Date ? value : new Date(value);
 return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

export function financeRetentionFor(dataset) {
 return FINANCE_RETENTION_POLICY.find(entry => entry.dataset === dataset) || null;
}

/**
 * Parte financiera de un titular para el export ARSOP de #112.
 * Devuelve `null` cuando el titular no tiene registros financieros en la
 * empresa (el endpoint decide el 404); `subjectType` es `collaborator` o
 * `client`. Solo se devuelven las secciones financieras: la identidad de
 * plataforma y la ficha comercial las aportan las verticales dueñas.
 */
export async function financePersonalData(connection, {organizationId, subjectType, subjectId} = {}) {
 const org = positiveId(organizationId, 'Empresa');
 const id = positiveId(subjectId, 'Titular');
 if (subjectType === 'collaborator') {
  const profile = (await connection.query(`select full_name, email, photo_url, job_title, compensation_type,
   compensation_amount::text as "compensationAmount", currency, monthly_salary_amount::text as "monthlySalaryAmount",
   monthly_salary_currency as "monthlySalaryCurrency", payment_day as "paymentDay", invoices_company as "invoicesCompany",
   started_on::text as "startedOn", ended_on::text as "endedOn", active, notes
   from agency_collaborators where organization_id=$1 and id=$2`, [org, id])).rows[0];
  if (!profile) return null;
  const salaryOverrides = (await connection.query(`select month::text as month, amount::text as amount, note, created_at as "createdAt", updated_at as "updatedAt"
   from agency_salary_month_overrides where organization_id=$1 and collaborator_id=$2 order by month`, [org, id])).rows;
  const commissions = (await connection.query(`select c.id::text as id, c.kind, c.beneficiary_name as "beneficiaryName", c.percentage::text as percentage,
   c.amount::text as amount, c.currency, c.status, c.due_on::text as "dueOn", c.paid_on::text as "paidOn", c.notes, i.number as "invoiceNumber"
   from agency_commissions c left join agency_invoices i on i.id=c.invoice_id and i.organization_id=c.organization_id
   where c.organization_id=$1 and c.collaborator_id=$2 order by c.id`, [org, id])).rows;
  const payouts = (await connection.query(`select p.id::text as id, p.amount::text as amount, p.paid_on::text as "paidOn", p.reference, a.name as "accountName", a.currency
   from agency_payouts p join bank_accounts a on a.id=p.account_id and a.organization_id=p.organization_id
   where p.organization_id=$1 and p.collaborator_id=$2 order by p.id`, [org, id])).rows;
  return {subject:{type:'collaborator', id}, purposes:['payroll', 'commissions', 'payments'], retention:RETENTION_NOTE, profile,
   salaryOverrides:salaryOverrides.map(row => ({month:row.month, amount:row.amount, note:row.note, createdAt:isoDate(row.createdAt), updatedAt:isoDate(row.updatedAt)})),
   commissions, payouts};
 }
 if (subjectType === 'client') {
  const exists = (await connection.query('select 1 from agency_clients where organization_id=$1 and id=$2', [org, id])).rows[0];
  if (!exists) return null;
  const invoices = (await connection.query(`select id::text as id, number, status, currency, total::text as total, paid_amount::text as "paidAmount",
   issued_on::text as "issuedOn", due_on::text as "dueOn", notes
   from agency_invoices where organization_id=$1 and client_id=$2 order by id`, [org, id])).rows;
  const payments = (await connection.query(`select p.id::text as id, p.amount::text as amount, p.received_on::text as "receivedOn", p.reference, i.number as "invoiceNumber",
   a.name as "accountName", a.currency, r.reason as "reversalReason", r.reversed_on::text as "reversedOn"
   from agency_payments p join agency_invoices i on i.id=p.invoice_id and i.organization_id=p.organization_id
   left join bank_accounts a on a.id=p.account_id and a.organization_id=p.organization_id
   left join agency_payment_reversals r on r.payment_id=p.id
   where p.organization_id=$1 and i.client_id=$2 order by p.id`, [org, id])).rows;
  const terms = (await connection.query(`select plan_name as "planName", recurring_amount::text as "recurringAmount", currency, starts_on::text as "startsOn",
   ends_on::text as "endsOn", coalesce(commission_mode,'none') as "commissionMode", commission_value::text as "commissionValue"
   from agency_client_commercial_terms where organization_id=$1 and client_id=$2 and effective_until is null order by id desc limit 1`, [org, id])).rows[0] || null;
  // El descuento por referido es un registro financiero del titular, pero el
  // nombre de quien refirió es dato personal de un tercero: no se exporta.
  const referralDiscounts = (await connection.query(`select d.id::text as id, d.amount::text as amount, d.status, d.reason, i.number as "invoiceNumber"
   from agency_referral_discounts d join agency_invoices i on i.id=d.invoice_id and i.organization_id=d.organization_id
   where d.organization_id=$1 and i.client_id=$2 order by d.id`, [org, id])).rows;
  return {subject:{type:'client', id}, purposes:['billing', 'treasury', 'commissions'], retention:RETENTION_NOTE, invoices, payments, terms, referralDiscounts};
 }
 fail('Tipo de titular inválido');
}

/**
 * Anonimiza los identificadores financieros de un titular conservando los
 * libros (importes, fechas y estados). Idempotente: se puede re-ejecutar sin
 * cambiar el resultado. La llama el job de #112 dentro de su transacción.
 */
export async function anonymizeFinanceSubject(connection, {organizationId, subjectType, subjectId} = {}) {
 const org = positiveId(organizationId, 'Empresa');
 const id = positiveId(subjectId, 'Titular');
 if (subjectType === 'collaborator') {
  const counts = {};
  counts.collaborator = (await connection.query(`update agency_collaborators
   set full_name='Colaborador anonimizado', email=null, photo_url=null, notes=null, updated_at=now()
   where organization_id=$1 and id=$2 returning id`, [org, id])).rowCount;
  counts.salaryOverrideNotes = (await connection.query(`update agency_salary_month_overrides set note=null
   where organization_id=$1 and collaborator_id=$2 and note is not null`, [org, id])).rowCount;
  counts.commissions = (await connection.query(`update agency_commissions
   set beneficiary_name='Beneficiario anonimizado', notes=null
   where organization_id=$1 and collaborator_id=$2 and (beneficiary_name<>'Beneficiario anonimizado' or notes is not null)`, [org, id])).rowCount;
  counts.payoutReferences = (await connection.query(`update agency_payouts set reference=''
   where organization_id=$1 and collaborator_id=$2 and reference<>''`, [org, id])).rowCount;
  return {subject:{type:'collaborator', id}, counts, retention:RETENTION_NOTE};
 }
 if (subjectType === 'client') {
  const counts = {};
  // `agency_payments` es inmutable (trigger `sync_agency_payment`): la
  // referencia del cobro se conserva con acceso restringido y cualquier
  // corrección exige una reversión. El resto de la parte financiera del
  // cliente sí se anonimiza.
  counts.invoiceNotes = (await connection.query(`update agency_invoices set notes=null, updated_at=now()
   where organization_id=$1 and client_id=$2 and notes is not null`, [org, id])).rowCount;
  counts.referralDiscounts = (await connection.query(`update agency_referral_discounts d set referrer='Referido anonimizado', reason='Motivo anonimizado'
   where d.organization_id=$1 and d.invoice_id in (select i.id from agency_invoices i where i.organization_id=$1 and i.client_id=$2)
    and (d.referrer<>'Referido anonimizado' or d.reason<>'Motivo anonimizado')`, [org, id])).rowCount;
  return {subject:{type:'client', id}, counts, retention:RETENTION_NOTE};
 }
 fail('Tipo de titular inválido');
}

/**
 * Barrido programado por antigüedad: anonimiza los campos editables cuya
 * ventana de retención venció (notas de nómina, notas de comisiones y de
 * facturas, referidos y referencias de extractos). No borra filas ni toca
 * asientos inmutables; lo llama el job de #112 una vez por empresa.
 */
export async function anonymizeExpiredFinanceData(connection, {asOf=new Date()} = {}) {
 const now = asOf instanceof Date ? asOf : new Date(asOf);
 if (!Number.isFinite(now.getTime())) fail('Fecha inválida');
 const cutoff = years => new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
 const financial = cutoff(FINANCIAL_RETENTION_YEARS);
 const support = cutoff(SUPPORT_RETENTION_YEARS);
 const counts = {};
 counts.salaryOverrideNotes = (await connection.query(`update agency_salary_month_overrides set note=null
  where note is not null and month < $1::date`, [financial])).rowCount;
 counts.commissionNames = (await connection.query(`update agency_commissions
  set beneficiary_name='Beneficiario anonimizado', notes=null
  where created_at < $1::date and (beneficiary_name<>'Beneficiario anonimizado' or notes is not null)`, [financial])).rowCount;
 counts.invoiceNotes = (await connection.query(`update agency_invoices set notes=null, updated_at=now()
  where notes is not null and issued_on < $1::date`, [financial])).rowCount;
 counts.referralDiscounts = (await connection.query(`update agency_referral_discounts
  set referrer='Referido anonimizado', reason='Motivo anonimizado'
  where created_at < $1::date and (referrer<>'Referido anonimizado' or reason<>'Motivo anonimizado')`, [financial])).rowCount;
 counts.statementReferences = (await connection.query(`update agency_statement_lines set reference=''
  where reference<>'' and booked_on < $1::date`, [support])).rowCount;
 return {asOf:now.toISOString(), cutoffs:{financial, support}, counts, retention:RETENTION_NOTE};
}
