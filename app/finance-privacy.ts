/**
 * Inventario de finalidades del dominio Finanzas (Ley N° 7593/2025).
 *
 * Fuente de verdad de la parte financiera del tratamiento: qué dato personal
 * se trata, para qué, con qué base legal, quién lo ve y dónde se captura. La
 * retención y la anonimización ejecutable viven en `backend/finance-privacy.js`
 * con el mismo `id` por finalidad (paridad verificada en
 * `tests/finance-privacy.test.ts`).
 *
 * Transparencia: los diálogos de captura muestran la finalidad y enlazan el
 * aviso público con `financeNoticeHref()`. La ruta canónica del aviso la
 * publica DSN en #113; si cambia, se ajusta solo esta constante.
 */
import type {Capability} from './capabilities';

export type FinancePurposeId = 'payroll' | 'payments' | 'commissions' | 'billing' | 'reports' | 'treasury';
export type FinanceSubject = 'collaborator' | 'client' | 'other';

export type FinancePurpose = {
 id: FinancePurposeId;
 title: string;
 purpose: string;
 legalBasis: string;
 subjects: readonly FinanceSubject[];
 data: readonly string[];
 visibility: readonly Capability[];
 capturePoints: readonly string[];
};

/** Ruta pública del aviso de privacidad (la publica DSN en #113). */
export const FINANCE_PRIVACY_NOTICE_PATH = '/privacidad';

export const financeNoticeHref = (id?: FinancePurposeId) => id ? `${FINANCE_PRIVACY_NOTICE_PATH}#${id}` : FINANCE_PRIVACY_NOTICE_PATH;

export const FINANCE_PURPOSES: readonly FinancePurpose[] = [
 {
  id: 'payroll',
  title: 'Previsión y pago de remuneraciones',
  purpose: 'Calcular la previsión mensual, registrar ajustes y pagar sueldos y honorarios del equipo.',
  legalBasis: 'Ejecución de la relación laboral o de servicios y obligación contable/fiscal.',
  subjects: ['collaborator'],
  data: ['Nombre y correo del colaborador', 'Salario base y moneda', 'Ajustes mensuales y su nota', 'Día de pago y facturación', 'Egresos de pago'],
  visibility: ['salary.view'],
  capturePoints: ['Previsión financiera · salario fijo mensual', 'Previsión financiera · ajuste del mes'],
 },
 {
  id: 'payments',
  title: 'Cobros y pagos',
  purpose: 'Registrar cobros de clientes, pagos a colaboradores y movimientos de tesorería.',
  legalBasis: 'Ejecución del contrato y obligación contable/fiscal.',
  subjects: ['client', 'collaborator'],
  data: ['Importes, fechas y referencias', 'Cuenta de salida', 'Quién registró el movimiento'],
  visibility: ['finance.view'],
  capturePoints: ['Comisiones · registrar pago', 'Finanzas · cobros y transferencias'],
 },
 {
  id: 'commissions',
  title: 'Comisiones y referidos',
  purpose: 'Liquidar comisiones del equipo y descuentos por referidos.',
  legalBasis: 'Ejecución del contrato de comisión y obligación contable/fiscal.',
  subjects: ['collaborator', 'other'],
  data: ['Beneficiario y colaborador vinculado', 'Importes, porcentaje y estado', 'Notas del acuerdo', 'Quién refirió (tercero)', 'Quién registró el egreso'],
  visibility: ['commissions.manage'],
  capturePoints: ['Comisiones · nueva comisión o referido', 'Comisiones · descuento por referido'],
 },
 {
  id: 'billing',
  title: 'Facturación y cobranza',
  purpose: 'Emitir comprobantes, seguir vencimientos y conciliar cobros con los libros.',
  legalBasis: 'Ejecución del contrato y obligación fiscal/contable.',
  subjects: ['client'],
  data: ['Cliente facturado', 'Montos, vencimientos y estado', 'Notas del comprobante', 'Referencia del cobro'],
  visibility: ['billing.view'],
  capturePoints: ['Clientes · ficha y términos comerciales', 'Finanzas · facturas y planes'],
 },
 {
  id: 'reports',
  title: 'Informes y planificación',
  purpose: 'Medir facturación, cobros y previsión, y planificar gastos del negocio.',
  legalBasis: 'Interés legítimo en la gestión del negocio; los informes se sirven agregados y sin identidad.',
  subjects: ['client', 'collaborator'],
  data: ['Indicadores agregados', 'Gastos planificados por categoría'],
  visibility: ['reports.view'],
  capturePoints: ['Informes · exportar CSV/PDF', 'Previsión · gastos planificados'],
 },
 {
  id: 'treasury',
  title: 'Tesorería y conciliación',
  purpose: 'Administrar cuentas y custodios, y conciliar extractos bancarios.',
  legalBasis: 'Ejecución de la relación contractual y obligación contable.',
  subjects: ['collaborator', 'other'],
  data: ['Titular, institución y número de cuenta', 'Custodio de la cuenta', 'Referencias del extracto'],
  visibility: ['accounts.manage'],
  capturePoints: ['Finanzas · nueva cuenta y custodio', 'Finanzas · importar extracto'],
 },
];

export function financePurpose(id: FinancePurposeId): FinancePurpose {
 const found = FINANCE_PURPOSES.find(purpose => purpose.id === id);
 if (!found) throw new Error(`Finalidad financiera desconocida: ${id}`);
 return found;
}

/** Texto de aviso para un punto de captura: «Finalidad: …». */
export const financePurposeNotice = (id: FinancePurposeId) => `Finalidad: ${financePurpose(id).title}`;
