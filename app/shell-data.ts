// Datos compartidos del shell: qué pide cada sección y con qué recorte.
// `work-orders` acepta `?limit=` (1..2000) + `page:{limit,offset,hasMore}`
// desde v1.0.111 (#57): las pantallas que no necesitan todas las órdenes piden
// una ventana y dejan de arrastrar la respuesta más pesada del panel.
export type ShellResource = 'clients' | 'projects' | 'orders' | 'summary';
export type ShellResourceRequest = {limit?: number};
export type ShellScope = Partial<Record<ShellResource, ShellResourceRequest>>;

/** Ventana de órdenes para buscador y presencia en las pantallas que no listan órdenes. */
export const ORDER_WINDOW = 300;
const PATHS: Record<ShellResource, string> = {clients: '/clients', projects: '/projects', orders: '/work-orders', summary: '/summary'};

export function shellDataUrl(resource: ShellResource, request: ShellResourceRequest = {}) {
  return `/core-api/api/agency${PATHS[resource]}${request.limit ? `?limit=${request.limit}` : ''}`;
}

/** El mismo recurso con distinto recorte es otra lectura: la frescura va por firma. */
export function shellSignature(resource: ShellResource, request: ShellResourceRequest = {}) {
  return request.limit ? `${resource}:${request.limit}` : resource;
}

export function scopeResources(scope: ShellScope): ShellResource[] {
  return (Object.keys(scope) as ShellResource[]).filter((resource) => scope[resource]);
}

// Resumen y Clientes cuentan sobre las órdenes (chips por etapa, piezas y
// próximo vencimiento por cliente) y Producción es el tablero: las tres piden
// la lista completa mientras el API no exponga esos agregados (#57, propuesta
// en el issue). El resto pide la ventana para el buscador y la presencia.
const SECTION_SCOPE: Record<string, ShellScope> = {
  Resumen: {clients: {}, projects: {}, orders: {}, summary: {}},
  Producción: {clients: {}, projects: {}, orders: {}},
  Clientes: {clients: {}, projects: {}, orders: {}, summary: {}},
  Proyectos: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW}},
  Presupuestos: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW}, summary: {}},
  Pipeline: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW}},
  Mora: {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW}},
};
const DEFAULT_SCOPE: ShellScope = {clients: {}, projects: {}, orders: {limit: ORDER_WINDOW}};

export function sectionScope(section: string): ShellScope {
  return SECTION_SCOPE[section] || DEFAULT_SCOPE;
}
