/**
 * «Carga con IA» — contrato compartido y adaptadores de creación (Refs #118).
 *
 * El motor server-side es #117 (PLT): `GET /api/ia/carga` informa si la IA está
 * configurada, el modelo y los tipos que el rol puede crear; `POST /api/ia/carga`
 * devuelve los registros detectados sin escribir nada. Este módulo declara la
 * forma que consume la interfaz y la **normaliza con tolerancia**: la salida del
 * proveedor es entrada externa y nunca se confía en su forma.
 *
 * Reglas que la UI no rompe:
 * - El texto pegado viaja sólo al endpoint de análisis; no se persiste acá.
 * - Los avisos salen del análisis (faltantes/ambiguos); no se inventan.
 * - Nada se crea sin confirmación: la creación usa los endpoints existentes de
 *   clientes y equipos de inventario (permisos, aislamiento y auditoría iguales
 *   a los flujos manuales, sin atajos).
 */

import {api} from './operations';

export const IA_TEXTO_MAX = 20_000;
export const IA_REGISTROS_MAX = 25;
export const IA_TIPOS = ['clientes', 'inventario'] as const;
export type IaTipo = (typeof IA_TIPOS)[number];
export const IA_TIPO_LABEL: Record<IaTipo, string> = {
  clientes: 'Clientes',
  inventario: 'Equipos de inventario',
};

export const IA_CARGA_PATH = '/api/ia/carga';

/** Candidatos que muestra el análisis por registro (contrato de #119). */
export const IA_COINCIDENCIAS_MAX = 5;

/** Configuración del asistente tal como la sirve `GET /api/ia/carga`. */
export type IaConfig = {configurada: boolean; modelo: string | null; tipos: IaTipo[]};

/** Estado de un registro detectado frente a lo ya cargado en la empresa. */
export type EstadoMatch = 'nuevo' | 'coincide' | 'ambiguo';

/** Señal de coincidencia con un registro existente de la misma organización. */
export type CoincidenciaIA = {
  id: string;
  nombre: string;
  /** `ruc_ci_exacto`, `correo`, `telefono`, `nombre_normalizado`, `nombre_parcial`. */
  senales: string[];
  activo: boolean;
};

/** Acción propuesta sobre un cliente existente (no se ejecuta sin confirmar). */
export type AccionIA = {
  tipo: 'registrar_cobro';
  cliente: {nombre: string; id: string | null; candidatos: CoincidenciaIA[]};
  /** Importe en guaraníes enteros. */
  monto: number;
  moneda: 'PYG';
  fecha: string | null;
  detalle: string | null;
  avisos: string[];
  estado?: EstadoMatch;
};

/** Cliente detectado (vista previa editable). */
export type IaCliente = {
  nombre: string;
  empresa: string | null;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  avisos: string[];
  /** Fase 2 (#119): coincidencias locales y estado; ausentes en respuestas viejas. */
  estado?: EstadoMatch;
  coincidencias?: CoincidenciaIA[];
};

/** Equipo de inventario detectado; `cantidad` son las unidades a crear. */
export type IaEquipo = {
  nombre: string;
  categoria: string | null;
  cantidad: number | null;
  valor: number | null;
  avisos: string[];
  /** Fase 2 (#119): moneda detectada, coincidencias locales y estado. */
  moneda?: string | null;
  estado?: EstadoMatch;
  coincidencias?: CoincidenciaIA[];
};

export type IaAnalisis = {
  clientes: IaCliente[];
  inventario: IaEquipo[];
  /** Notas globales de la pasada (recortes, registros descartados, dudas). */
  avisos: string[];
};

/** Resultado completo del análisis: registros + acciones propuestas (#119). */
export type IaResultado = IaAnalisis & {acciones: AccionIA[]};

/** Etiqueta visible de cada señal de match; una señal desconocida se muestra cruda. */
export function senalMatchLabel(senal: string): string {
  const labels: Record<string, string> = {
    ruc_ci_exacto: 'RUC/CI coincide',
    correo: 'mismo correo',
    telefono: 'mismo teléfono',
    nombre_normalizado: 'nombre igual',
  };
  return labels[senal] || senal.replace(/_/g, ' ');
}

/* ------------------------------------------------------------------ normalización */

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const clean = (value: unknown, max: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const nullableText = (value: unknown, max: number) => clean(value, max) || null;
const avisosDe = (value: unknown) => list(value).filter((item): item is string => typeof item === 'string').map((item) => clean(item, 240)).filter(Boolean).slice(0, 8);
const cantidadDe = (value: unknown) => {
  const numero = Math.floor(Number(value));
  return Number.isFinite(numero) && numero >= 1 ? Math.min(numero, IA_REGISTROS_MAX) : 1;
};
const montoDe = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const numero = typeof value === 'string'
    ? Number(value.replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
    : Number(value);
  return Number.isFinite(numero) && numero >= 0 ? Math.round(numero) : null;
};
const estadoDe = (value: unknown): EstadoMatch | undefined =>
  value === 'nuevo' || value === 'coincide' || value === 'ambiguo' ? value : undefined;
const senalesDe = (value: unknown) =>
  list(value)
    .filter((senal): senal is string => typeof senal === 'string')
    .map((senal) => clean(senal, 40))
    .filter(Boolean)
    .slice(0, 6);
const coincidenciasDe = (value: unknown): CoincidenciaIA[] => {
  const filas = list(value)
    .map((item) => {
      const fila = record(item);
      const id = clean(fila.id, 40);
      const nombre = clean(fila.nombre, 160);
      if (!id || !nombre) return null;
      return {id, nombre, senales: senalesDe(fila.senales), activo: fila.activo !== false};
    })
    .filter((item): item is CoincidenciaIA => item !== null);
  return filas.slice(0, IA_COINCIDENCIAS_MAX);
};

/** Config defensiva: sin `tipos` desconocidos y con la forma exacta de la UI. */
export function normalizarIaConfig(value: unknown): IaConfig {
  const data = record(value);
  return {
    configurada: data.configurada === true,
    modelo: nullableText(data.modelo, 120),
    // Puente de contrato con #117: el motor publica «equipos»; la UI lo llama
    // «inventario». Se acepta la forma del servidor y la propia (tolerancia).
    tipos: list(data.tipos)
      .map((tipo) => (String(tipo) === 'equipos' ? 'inventario' : String(tipo)))
      .filter((tipo): tipo is IaTipo => (IA_TIPOS as readonly string[]).includes(tipo)),
  };
}

/**
 * Análisis defensivo: recorta a los topes del contrato, descarta ítems no
 * utilizables y conserva los avisos reales del proveedor. Nunca completa datos
 * faltantes con valores inventados (lo que falta se edita en la vista previa).
 */
export function normalizarIaAnalisis(value: unknown): IaAnalisis {
  const data = record(value);
  const avisos = avisosDe(data.avisos);
  const clientes = list(data.clientes).map((item) => {
    const fila = record(item);
    const cliente: IaCliente = {
      nombre: clean(fila.nombre, 120),
      empresa: nullableText(fila.empresa, 160),
      ruc: nullableText(fila.ruc, 60),
      telefono: nullableText(fila.telefono, 60),
      correo: nullableText(fila.correo, 200),
      avisos: avisosDe(fila.avisos),
    };
    const estado = estadoDe(fila.estado);
    if (estado) cliente.estado = estado;
    if (Array.isArray(fila.coincidencias)) cliente.coincidencias = coincidenciasDe(fila.coincidencias);
    return cliente;
  });
  // Puente de contrato con #117: el motor devuelve «equipos»; la UI lo expone
  // como «inventario». Se lee la clave del servidor y se tolera la propia.
  const inventario = list(data.equipos ?? data.inventario).map((item) => {
    const fila = record(item);
    const equipo: IaEquipo = {
      nombre: clean(fila.nombre, 160),
      categoria: nullableText(fila.categoria, 80),
      cantidad: fila.cantidad === null || fila.cantidad === undefined ? null : cantidadDe(fila.cantidad),
      valor: montoDe(fila.valor),
      avisos: avisosDe(fila.avisos),
    };
    const moneda = nullableText(fila.moneda, 8);
    if (moneda) equipo.moneda = moneda.toUpperCase();
    const estado = estadoDe(fila.estado);
    if (estado) equipo.estado = estado;
    if (Array.isArray(fila.coincidencias)) equipo.coincidencias = coincidenciasDe(fila.coincidencias);
    return equipo;
  });
  if (clientes.length > IA_REGISTROS_MAX) avisos.push(`El análisis trajo ${clientes.length} clientes; se muestran los primeros ${IA_REGISTROS_MAX}.`);
  if (inventario.length > IA_REGISTROS_MAX) avisos.push(`El análisis trajo ${inventario.length} equipos; se muestran los primeros ${IA_REGISTROS_MAX}.`);
  return {clientes: clientes.slice(0, IA_REGISTROS_MAX), inventario: inventario.slice(0, IA_REGISTROS_MAX), avisos};
}

/**
 * Acciones propuestas (#119): tolerante con la forma externa, estricta con lo
 * que la UI puede confirmar. Solo se aceptan tipos soportados y montos Gs
 * enteros positivos; el resto se descarta (el servidor ya validó igual).
 */
export function normalizarIaAcciones(value: unknown): AccionIA[] {
  const acciones: AccionIA[] = [];
  for (const item of list(value)) {
    const fila = record(item);
    if (fila.tipo !== 'registrar_cobro') continue;
    const cliente = record(fila.cliente);
    const nombre = clean(cliente.nombre, 160);
    const monto = montoDe(fila.monto);
    if (nombre.length < 2 || monto === null || monto <= 0) continue;
    const id = clean(cliente.id, 40) || null;
    const accion: AccionIA = {
      tipo: 'registrar_cobro',
      cliente: {nombre, id, candidatos: coincidenciasDe(cliente.candidatos)},
      monto,
      moneda: 'PYG',
      fecha: nullableText(fila.fecha, 10),
      detalle: nullableText(fila.detalle, 500),
      avisos: avisosDe(fila.avisos),
    };
    const estado = estadoDe(fila.estado);
    if (estado) accion.estado = estado;
    acciones.push(accion);
  }
  return acciones.slice(0, IA_REGISTROS_MAX);
}

/* ------------------------------------------------------------------------ API */

export class IaApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = '') {
    super(message);
    this.name = 'IaApiError';
    this.status = status;
    this.code = code;
  }
}

/** Mensaje claro y en es-PY para cada fallo del asistente (nunca el cuerpo crudo). */
export function mensajeIaError(cause: unknown): string {
  if (cause instanceof IaApiError) {
    if (cause.code === 'ia_no_configurada' || cause.status === 503) return 'La IA no está configurada en el servidor.';
    if (cause.status === 429 || cause.code === 'ia_rate_limit') return 'Hiciste muchos análisis seguidos. Esperá unos minutos y volvé a intentar.';
    if (cause.status === 401) return 'Tu sesión venció. Volvé a ingresar y probá de nuevo.';
    if (cause.status === 403) return 'Tu rol no permite crear los registros de esta carga.';
    if (cause.status === 400) return cause.message || 'El texto no es válido para el análisis.';
    // Resiliencia del motor (#127): el truncado se explica solo; una salida
    // ilegible ya se reintentó una vez en el servidor.
    if (cause.code === 'ia_truncado') return 'El texto era muy largo para una sola pasada: probalo en dos partes.';
    if (cause.code === 'ia_vacio' || cause.code === 'ia_json') return 'La IA devolvió una respuesta ilegible. Reintentá en un momento; si sigue, dividí el texto en dos partes.';
    if (cause.status >= 500) return 'El proveedor de IA no respondió. Probá de nuevo en unos segundos.';
    return cause.message || 'No se pudo completar el análisis.';
  }
  return cause instanceof Error ? cause.message : 'No se pudo completar el análisis.';
}

async function iaFetch(path: string, init: RequestInit = {}, timeoutMs = 12_000): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/core-api${path}`, {
      credentials: 'include',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      ...init,
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && (cause.name === 'TimeoutError' || cause.name === 'AbortError');
    throw new IaApiError(timedOut ? 'El análisis tardó más de lo esperado. Probá de nuevo.' : 'Sin conexión con el servidor. Revisá tu conexión y probá de nuevo.', 0);
  }
  const data = (await response.json().catch(() => null)) as {error?: unknown; code?: unknown} | null;
  if (!response.ok) {
    const mensaje = typeof data?.error === 'string' && data.error ? data.error : `No se pudo completar el análisis (HTTP ${response.status}).`;
    throw new IaApiError(mensaje, response.status, typeof data?.code === 'string' ? data.code : '');
  }
  return data;
}

/** `GET /api/ia/carga`: si la IA está configurada, el modelo y los tipos permitidos. */
export async function cargarConfigIa(): Promise<IaConfig> {
  return normalizarIaConfig(await iaFetch(IA_CARGA_PATH));
}

/**
 * `POST /api/ia/carga`: analiza el texto pegado y devuelve los registros
 * detectados. El timeout supera el del proveedor (30 s) para no cortar un
 * análisis que el servidor todavía está esperando.
 */
export async function analizarIa(texto: string): Promise<IaResultado> {
  const limpio = String(texto || '').trim();
  if (!limpio) throw new IaApiError('Pegá un texto para analizar.', 400);
  const data = await iaFetch(IA_CARGA_PATH, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({texto: limpio})}, 35_000);
  const registros = record(data).registros;
  return {...normalizarIaAnalisis(registros), acciones: normalizarIaAcciones(record(data).acciones)};
}

/* ------------------------------------------------------------------ creación */

/**
 * Crea un cliente con `POST /api/agency/clients` (el mismo endpoint del alta
 * manual: permisos, RUC único, aislamiento y auditoría idénticos).
 */
export async function crearClienteDesdeIa(cliente: {nombre: string; empresa: string | null; ruc: string | null; telefono: string | null; correo: string | null}): Promise<string> {
  const data = await api<{client?: {id?: unknown}}>('/api/agency/clients', {
    name: cliente.nombre,
    email: cliente.correo ?? '',
    phone: cliente.telefono ?? '',
    tax_id: cliente.ruc ?? '',
    legal_name: cliente.empresa ?? '',
  });
  const id = data?.client?.id;
  if (id === undefined || id === null) throw new Error('El servidor no devolvió el cliente creado.');
  return String(id);
}

/**
 * Crea UN equipo con `POST /api/agency/inventory` (mismo endpoint del alta
 * manual). La categoría viaja por id cuando existe y por nombre cuando el texto
 * trajo una nueva: el servidor la resuelve o la crea, igual que el formulario.
 */
export async function crearEquipoDesdeIa(equipo: {nombre: string; categoriaId: string; categoriaNombre: string | null; valor: number; moneda: string}): Promise<string> {
  const payload: Record<string, unknown> = {name: equipo.nombre, value: String(equipo.valor), currency: equipo.moneda};
  if (equipo.categoriaId) payload.category_id = equipo.categoriaId;
  else if (equipo.categoriaNombre) payload.category = equipo.categoriaNombre;
  const data = await api<{record?: {id?: unknown}}>('/api/agency/inventory', payload);
  const id = data?.record?.id;
  if (id === undefined || id === null) throw new Error('El servidor no devolvió el equipo creado.');
  return String(id);
}
