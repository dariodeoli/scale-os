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
export type ShellResourceRequest = {limit?: number; fields?: string};
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
/** #67: chrome mínimo de clientes para el buscador/presencia de las secciones que no listan la cartera (contacto y ciclo de vida incluidos para el buscador global). */
export const CLIENT_FIELDS_CHROME = 'id,name,email,phone,active,lifecycle_status,logo_url,color_key';
/** #67: chrome mínimo de proyectos (nombre, estado y piezas) para esas mismas secciones. */
export const PROJECT_FIELDS_CHROME = 'id,name,client_id,status,client_name,work_order_count,assignees';

// Proyecciones OPS (#67): el chrome (buscador, presencia y filtros) no necesita
// la ficha completa del cliente ni del proyecto. Medido por PLT: clients
// 221→63 KB y projects 178→93 KB con la semilla grande.
/** Cliente para el chrome y las tarjetas: identidad, contacto y color. */
export const CLIENT_CHROME_FIELDS = 'id,name,email,active,logo_url,color_key';
/** Proyecto para el chrome, el filtro del tablero y el planificador. */
export const PROJECT_CHROME_FIELDS = 'id,name,client_id,client_name,work_order_count';
/** Proyectos de la sección Proyectos: tarjetas, fechas, piezas y responsables. */
export const PROJECT_LIST_FIELDS = `${PROJECT_CHROME_FIELDS},status,active,urgency,start_date,due_date,drive_links,updated_at,assignees`;
const CHROME_SCOPE: ShellScope = {clients: {fields: CLIENT_FIELDS_CHROME}, projects: {fields: PROJECT_FIELDS_CHROME}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}};

export function shellDataUrl(resource: ShellResource, request: ShellResourceRequest = {}) {
  const query: string[] = [];
  if (request.limit) query.push(`limit=${request.limit}`);
  if (request.fields) query.push(`fields=${request.fields}`);
  return `/core-api/api/agency${PATHS[resource]}${query.length ? `?${query.join('&')}` : ''}`;
}

/** El mismo recurso con distinto recorte es otra lectura: la frescura va por firma. */
export function shellSignature(resource: ShellResource, request: ShellResourceRequest = {}) {
  return `${resource}:${request.limit ?? 'all'}:${request.fields ?? 'full'}`;
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

// #67: las secciones PLT (Equipo, Invitaciones, Roles, Papelera, Configuración,
// Preferencias y Actividad) solo usan clientes y proyectos como chrome del
// buscador y la presencia: piden la proyección y no piden resumen.
const PLT_SCOPE: ShellScope = {
  clients: {fields: CLIENT_FIELDS_CHROME},
  projects: {fields: PROJECT_FIELDS_CHROME},
  orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH},
};
const SECTION_SCOPE: Record<string, ShellScope> = {
  Resumen: {clients: {}, projects: {}, summary: {}, orders: {fields: ORDER_FIELDS_STATUS}},
  // El tablero de Producción es dueño de sus datos por columna
  // (`app/board-data.ts`: `?status=` + `?counts=1`): el shell no pide órdenes
  // para esta sección y así no hay lecturas duplicadas.
  Producción: {clients: {fields: CLIENT_CHROME_FIELDS}, projects: {fields: PROJECT_CHROME_FIELDS}, summary: {}},
  Clientes: {clients: {}, projects: {}, summary: {}, orders: {fields: ORDER_FIELDS_PORTFOLIO}},
  Proyectos: {clients: {fields: CLIENT_CHROME_FIELDS}, projects: {fields: PROJECT_LIST_FIELDS}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
  // Inventario y Estudio usan el chrome (clientes/proyectos) y el buscador;
  // sus propios recursos viajan por hooks con ventana (use-inventory/-studio).
  Inventario: {clients: {fields: CLIENT_CHROME_FIELDS}, projects: {fields: PROJECT_CHROME_FIELDS}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
  Estudio: {clients: {fields: CLIENT_CHROME_FIELDS}, projects: {fields: PROJECT_CHROME_FIELDS}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
  Presupuestos: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}, summary: {}},
  Pipeline: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW, fields: ORDER_FIELDS_SEARCH}},
  // Finanzas, Mora, Informes, Previsión y Comisiones no listan clientes ni
  // proyectos: piden solo el chrome y recortan ~300 KB por navegación (#67).
  Mora: CHROME_SCOPE,
  Finanzas: CHROME_SCOPE,
  Informes: CHROME_SCOPE,
  'Previsión': CHROME_SCOPE,
  Comisiones: CHROME_SCOPE,
  Equipo: PLT_SCOPE,
  Invitaciones: PLT_SCOPE,
  'Roles y permisos': PLT_SCOPE,
  Papelera: PLT_SCOPE,
  Configuración: PLT_SCOPE,
  Preferencias: PLT_SCOPE,
  Actividad: PLT_SCOPE,
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
