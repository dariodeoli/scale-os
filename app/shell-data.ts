// Datos compartidos del shell: qué pide cada sección, con qué recorte y cuánto
// vale lo ya cargado. Navegar entre secciones no vuelve a pedir lo que está en
// memoria; solo se refresca lo que la sección activa necesita y ya venció.
//
// Dos palancas del API (#57, v1.0.112):
//   - `?limit=`/`?offset=`: ventana de `work-orders` para buscador y presencia.
//   - `?fields=`: proyección sobre la lista de órdenes; cada pantalla pide solo
//     los campos que dibuja (Resumen cuenta estados, Clientes arma cartera, el
//     tablero dibuja la tarjeta). Sin proyección, el API ya recorta el payload
//     por defecto (sin columnas sin lectores ni el correo legado).
export type ShellResource = 'clients' | 'projects' | 'orders' | 'summary';
export type ShellResourceRequest = {limit?: number; fields?: string; byStatus?: boolean; counts?: boolean};
export type ShellScope = Partial<Record<ShellResource, ShellResourceRequest>>;

/** Ventana de órdenes para buscador y presencia en las pantallas que no listan órdenes. */
export const ORDER_WINDOW = 300;
const PATHS: Record<ShellResource, string> = {clients: '/clients', projects: '/projects', orders: '/work-orders', summary: '/summary'};

// Proyecciones por uso (todas dentro de `workOrderListFields` del API).
/** Resumen: cuenta por estado y "en revisión". */
export const ORDER_FIELDS_STATUS = 'id,status,project_id';
/** Clientes: cartera por cliente (piezas abiertas y próximo vencimiento). */
export const ORDER_FIELDS_PORTFOLIO = 'id,status,project_id,due_date';
/** Producción: la tarjeta del tablero completa (asignados y checklist incluidos). */
export const ORDER_FIELDS_BOARD = 'id,project_id,project_name,client_name,title,description,status,work_type,urgency,due_date,due_time,effective_assignees,assignee_source,checklist_total,checklist_completed,approval_step,drive_url,drive_links,estimated_hours,actual_hours,updated_at';
/** Buscador: lo que muestra el resultado. */
export const ORDER_FIELDS_SEARCH = 'id,title,status,project_id,project_name,client_name,due_date';

// ── Tablero de Producción por columna (contrato #57) ─────────────────────────
// `?status=` filtra por etapa y `?counts=1` devuelve `stage_counts` con los
// totales exactos de todas las etapas en una respuesta mínima. El tablero pide
// una ventana por columna en paralelo, en vez de la lista completa.
export const BOARD_COLUMN_LIMIT = 50;
export function boardColumnUrl(status: string, limit: number = BOARD_COLUMN_LIMIT) {
  return `${shellDataUrl('orders', {limit, fields: ORDER_FIELDS_BOARD})}&status=${encodeURIComponent(status)}`;
}
export function boardCountsUrl() {
  return `${shellDataUrl('orders', {limit: 1, fields: 'id'})}&counts=1`;
}
export function boardColumnSignature(status: string, limit: number = BOARD_COLUMN_LIMIT) {
  return `orders:col:${status}:${limit}`;
}
export const BOARD_COUNTS_SIGNATURE = 'orders:counts';

export function shellDataUrl(resource: ShellResource, request: ShellResourceRequest = {}) {
  const query: string[] = [];
  if (request.limit) query.push(`limit=${request.limit}`);
  if (request.fields) query.push(`fields=${request.fields}`);
  return `/core-api/api/agency${PATHS[resource]}${query.length ? `?${query.join('&')}` : ''}`;
}

/** El mismo recurso con distinto recorte es otra lectura: la frescura va por firma. */
export function shellSignature(resource: ShellResource, request: ShellResourceRequest = {}) {
  const base = `${resource}:${request.limit ?? 'all'}:${request.fields ?? 'full'}`;
  // Un alcance por estado o con conteos es otra lectura: no comparte frescura
  // con la ventana plana ni con la lista completa.
  return request.byStatus ? `${base}:by-status` : request.counts ? `${base}:counts` : base;
}

export function scopeResources(scope: ShellScope): ShellResource[] {
  return (Object.keys(scope) as ShellResource[]).filter((resource) => scope[resource]);
}

// El contrato es optimista (el API soporta `?fields=` desde v1.0.112) y se apaga
// en la sesión si una proyección devuelve 400: la pantalla vuelve al payload por defecto.
export type ShellContract = {fields: boolean};
export const NO_CONTRACT: ShellContract = {fields: true};
let contract: ShellContract = NO_CONTRACT;
export function shellContract() {
  return contract;
}
export function learnShellContract(patch: Partial<ShellContract>) {
  contract = {...contract, ...patch};
  return contract;
}

const SECTION_SCOPE: Record<string, ShellScope> = {
  Resumen: {clients: {}, projects: {}, summary: {}, orders: {fields: ORDER_FIELDS_STATUS}},
  Producción: {clients: {}, projects: {}, summary: {}, orders: {limit: BOARD_COLUMN_LIMIT, fields: ORDER_FIELDS_BOARD, byStatus: true, counts: true}},
  Clientes: {clients: {}, projects: {}, summary: {}, orders: {fields: ORDER_FIELDS_PORTFOLIO}},
  Proyectos: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
  Presupuestos: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}, summary: {}},
  Pipeline: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
  Mora: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
};
const DEFAULT_SCOPE: ShellScope = {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}};

/** Alcance de la sección; sin soporte de `?fields=` vuelve al payload por defecto. */
export function sectionScope(section: string, current: ShellContract = contract): ShellScope {
  const scope = SECTION_SCOPE[section] || DEFAULT_SCOPE;
  if (current.fields) return scope;
  const plain: ShellScope = {};
  for (const resource of scopeResources(scope)) {
    const request = {...scope[resource]};
    delete request.fields;
    plain[resource] = request;
  }
  return plain;
}
