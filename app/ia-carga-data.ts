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

/** Umbrales del estándar portable (#132): preselección de vincular por confianza. */
export const IA_CONFIANZA_ALTA = 90;
export const IA_CONFIANZA_MEDIA = 60;

/** Configuración del asistente tal como la sirve `GET /api/ia/carga`. */
export type IaConfig = {configurada: boolean; modelo: string | null; tipos: IaTipo[]};

/** Estado de un registro detectado frente a lo ya cargado en la empresa. */
export type EstadoMatch = 'nuevo' | 'coincide' | 'ambiguo';

/** Señal de coincidencia con un registro existente de la misma organización. */
export type CoincidenciaIA = {
  id: string;
  nombre: string;
  /** `ruc_ci_exacto`, `correo`, `telefono`, `nombre_normalizado`, `nombre_parcial`, `nombre_parecido`. */
  senales: string[];
  /** Confianza 0–100 del estándar (#131): ≥90 vincula, 60–89 mejor candidato, <60 nuevo. */
  confianza?: number | null;
  activo: boolean;
  /** Imagen de confirmación (logo del cliente / foto del equipo) si el motor la resolvió. */
  fotoUrl?: string | null;
};

/** Acción sobre un cliente existente: un cobro ya percibido. */
export type AccionCobroIA = {
  tipo: 'registrar_cobro';
  cliente: {nombre: string; id: string | null; candidatos: CoincidenciaIA[]};
  /** Importe entero en `moneda` (PYG no lleva decimales). */
  monto: number;
  moneda: 'PYG' | 'USD';
  fecha: string | null;
  /** Cómo se resolvió la fecha («relativa: ayer», «sin año: …»); visible. */
  fecha_motivo?: string | null;
  detalle: string | null;
  avisos: string[];
  /** Campos del extracto que no aparecen en el texto pegado (#131). */
  no_en_texto?: string[];
  estado?: EstadoMatch;
};

/** Acción sobre un cliente existente: un pago a crédito/plazo (vencimiento). */
export type AccionVencimientoIA = {
  tipo: 'registrar_vencimiento';
  cliente: {nombre: string; id: string | null; candidatos: CoincidenciaIA[]};
  monto: number | null;
  moneda: 'PYG' | 'USD';
  plazo_dias: number | null;
  /** Fecha de vencimiento calculada o explícita; `null` si no se pudo leer. */
  vencimiento: string | null;
  fecha_motivo?: string | null;
  detalle: string | null;
  avisos: string[];
  no_en_texto?: string[];
  estado?: EstadoMatch;
};

/** Acción propuesta sobre un cliente existente (no se ejecuta sin confirmar). */
export type AccionIA = AccionCobroIA | AccionVencimientoIA;

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
  /** #131: campos del extracto que no se encontraron en el texto. */
  no_en_texto?: string[];
  /** Confianza 0–100 del registro completo contra lo existente (#131). */
  confianza?: number | null;
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
  no_en_texto?: string[];
  /** #131: moneda no soportada; el valor pide carga manual. */
  moneda_extranjera?: string | null;
  /** Confianza 0–100 del registro completo contra lo existente (#131). */
  confianza?: number | null;
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
    nombre_parcial: 'nombre parcial',
    nombre_parecido: 'nombre parecido',
  };
  return labels[senal] || senal.replace(/_/g, ' ');
}

/**
 * Preselección del estándar portable (#132) sobre la confianza de #131:
 * ≥90 coincide alto (vincular preseleccionado) · 60–89 mejor candidato
 * preseleccionado y cambiable · <60 crear nuevo. `null` = el motor no puntuó
 * (puente con #119: se conservan las reglas de la Fase 2).
 */
export function decisionPorConfianza(confianza: number | null | undefined): 'vincular' | 'crear' | null {
  if (confianza === null || confianza === undefined || !Number.isFinite(Number(confianza))) return null;
  return Number(confianza) >= IA_CONFIANZA_MEDIA ? 'vincular' : 'crear';
}

/** Nivel visible del match: `alta` (≥90), `media` (60–89) o `baja` (<60/sin dato). */
export function nivelConfianza(confianza: number | null | undefined): 'alta' | 'media' | 'baja' {
  if (confianza === null || confianza === undefined || !Number.isFinite(Number(confianza))) return 'baja';
  return Number(confianza) >= IA_CONFIANZA_ALTA ? 'alta' : Number(confianza) >= IA_CONFIANZA_MEDIA ? 'media' : 'baja';
}

/** Mejor candidato del registro (la normalización los ordena por confianza). */
export function mejorCoincidencia(coincidencias: readonly CoincidenciaIA[] | undefined): CoincidenciaIA | null {
  if (!coincidencias?.length) return null;
  // El motor ya ordena por señales; acá se elige por confianza para que la
  // preselección por umbral no dependa del orden de llegada.
  return coincidencias.reduce((mejor, candidato) => ((candidato.confianza ?? -1) > (mejor.confianza ?? -1) ? candidato : mejor));
}

/** Moneda distinta de la local (guaraníes): no se convierte sola (#131/#132). */
export function monedaExtranjeraIa(moneda: string | null | undefined) {
  const codigo = String(moneda ?? '').trim().toUpperCase();
  return Boolean(codigo) && codigo !== 'PYG';
}

/** Tipos de aviso del estándar portable que la tarjeta trata distinto. */
export type AvisoIaTipo = 'no-esta' | 'moneda' | 'fecha' | 'plazo' | 'duplicado' | 'otro';

/**
 * Clasifica un aviso del motor para darle tratamiento visible (#131/#132):
 * escalar fuera del texto, moneda extranjera, fecha resuelta, plazo por
 * «a crédito» y duplicado probable. El texto del motor nunca se reescribe.
 */
export function clasificarAvisoIa(texto: string): {tipo: AvisoIaTipo; etiqueta: string} {
  const valor = String(texto ?? '');
  const normalizado = valor.toLowerCase();
  if (/no (est[áa]|aparece|figura) en el texto|fuera del texto|inventad|alucina/.test(normalizado)) return {tipo: 'no-esta', etiqueta: 'No está en el texto'};
  if (/moneda|usd|d[óo]lar|euro|extranjer/.test(normalizado)) return {tipo: 'moneda', etiqueta: 'Moneda extranjera'};
  if (/fecha|ma[ñn]ana|ayer|relativ|vencim/.test(normalizado)) return {tipo: 'fecha', etiqueta: 'Fecha resuelta'};
  if (/cr[ée]dito|plazo|cuotas?/.test(normalizado)) return {tipo: 'plazo', etiqueta: 'Plazo, no cobro'};
  if (/duplicad|repetid|ya existe/.test(normalizado)) return {tipo: 'duplicado', etiqueta: 'Duplicado probable'};
  return {tipo: 'otro', etiqueta: ''};
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

/** Confianza 0–100 del motor (#131); tolera nombres y valores fuera de rango. */
const confianzaDe = (value: unknown): number | null => {
  const numero = Number(value);
  if (!Number.isFinite(numero)) return null;
  const redondeado = Math.round(numero);
  // Fuera de 0–100 es entrada inválida: no se acota a 100 (un valor basura no
  // debe habilitar la vinculación automática por umbral).
  return redondeado >= 0 && redondeado <= 100 ? redondeado : null;
};
/** Imagen segura de confirmación (https o data:image); cualquier otra se descarta. */
const imagenDe = (value: unknown): string | null => {
  const texto = String(value ?? '').trim();
  return /^(https:\/\/|data:image\/)/.test(texto) ? texto.slice(0, 2000) : null;
};
const imagenCoincidencia = (fila: Record<string, unknown>) =>
  imagenDe(fila.foto_url ?? fila.fotoUrl ?? fila.logo_url ?? fila.logoUrl ?? fila.avatar_url ?? fila.imagen ?? fila.foto);

const coincidenciasDe = (value: unknown): CoincidenciaIA[] => {
  const filas = list(value)
    .map((item) => {
      const fila = record(item);
      const id = clean(fila.id, 40);
      const nombre = clean(fila.nombre, 160);
      if (!id || !nombre) return null;
      const coincidencia: CoincidenciaIA = {id, nombre, senales: senalesDe(fila.senales), activo: fila.activo !== false};
      // #131: el puntaje y la imagen sólo viajan cuando el motor los manda (el
      // contrato de #119 sigue siendo válido sin ellos).
      const confianza = confianzaDe(fila.confianza ?? fila.puntaje ?? fila.score ?? fila.porcentaje ?? fila.match);
      if (confianza !== null) coincidencia.confianza = confianza;
      const foto = imagenCoincidencia(fila);
      if (foto) coincidencia.fotoUrl = foto;
      return coincidencia;
    })
    .filter((item): item is CoincidenciaIA => item !== null)
    // Mejor candidato primero por confianza: la preselección por umbral y la
    // vista miran el primero; el motor ya manda las señales, acá se ordena.
    .sort((uno, dos) => (dos.confianza ?? -1) - (uno.confianza ?? -1));
  return filas.slice(0, IA_COINCIDENCIAS_MAX);
};
const camposNoEnTexto = (value: unknown) =>
  list(value)
    .filter((campo): campo is string => typeof campo === 'string')
    .map((campo) => clean(campo, 40))
    .filter(Boolean)
    .slice(0, 12);

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
    if (Array.isArray(fila.no_en_texto)) cliente.no_en_texto = camposNoEnTexto(fila.no_en_texto);
    const confianza = confianzaDe(fila.confianza ?? fila.puntaje ?? fila.score ?? fila.porcentaje);
    if (confianza !== null) cliente.confianza = confianza;
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
    if (Array.isArray(fila.no_en_texto)) equipo.no_en_texto = camposNoEnTexto(fila.no_en_texto);
    const extranjera = nullableText(fila.moneda_extranjera, 12);
    if (extranjera) equipo.moneda_extranjera = extranjera;
    const confianza = confianzaDe(fila.confianza ?? fila.puntaje ?? fila.score ?? fila.porcentaje);
    if (confianza !== null) equipo.confianza = confianza;
    return equipo;
  });
  if (clientes.length > IA_REGISTROS_MAX) avisos.push(`El análisis trajo ${clientes.length} clientes; se muestran los primeros ${IA_REGISTROS_MAX}.`);
  if (inventario.length > IA_REGISTROS_MAX) avisos.push(`El análisis trajo ${inventario.length} equipos; se muestran los primeros ${IA_REGISTROS_MAX}.`);
  return {clientes: clientes.slice(0, IA_REGISTROS_MAX), inventario: inventario.slice(0, IA_REGISTROS_MAX), avisos};
}

/**
 * Acciones propuestas (#119/#131): tolerante con la forma externa, estricta con
 * lo que la UI puede confirmar. Se aceptan `registrar_cobro` (ya cobrado) y
 * `registrar_vencimiento` (pago a crédito/plazo); el resto se descarta (el
 * servidor ya validó igual).
 */
export function normalizarIaAcciones(value: unknown): AccionIA[] {
  const acciones: AccionIA[] = [];
  for (const item of list(value)) {
    const fila = record(item);
    if (fila.tipo !== 'registrar_cobro' && fila.tipo !== 'registrar_vencimiento') continue;
    const cliente = record(fila.cliente);
    const nombre = clean(cliente.nombre, 160);
    if (nombre.length < 2) continue;
    const id = clean(cliente.id, 40) || null;
    const candidatos = coincidenciasDe(cliente.candidatos);
    const moneda = fila.moneda === 'USD' ? 'USD' : 'PYG';
    const avisos = avisosDe(fila.avisos);
    const noEnTexto = Array.isArray(fila.no_en_texto) ? camposNoEnTexto(fila.no_en_texto) : undefined;
    const fechaMotivo = nullableText(fila.fecha_motivo, 80);
    if (fila.tipo === 'registrar_vencimiento') {
      const plazo = Number(fila.plazo_dias);
      const accion: AccionVencimientoIA = {
        tipo: 'registrar_vencimiento',
        cliente: {nombre, id, candidatos},
        monto: montoDe(fila.monto),
        moneda,
        plazo_dias: Number.isInteger(plazo) && plazo >= 1 ? plazo : null,
        vencimiento: nullableText(fila.vencimiento, 10),
        detalle: nullableText(fila.detalle, 500),
        avisos,
      };
      if (fechaMotivo) accion.fecha_motivo = fechaMotivo;
      if (noEnTexto) accion.no_en_texto = noEnTexto;
      const estado = estadoDe(fila.estado);
      if (estado) accion.estado = estado;
      acciones.push(accion);
      continue;
    }
    const monto = montoDe(fila.monto);
    if (monto === null || monto <= 0) continue;
    const accion: AccionCobroIA = {
      tipo: 'registrar_cobro',
      cliente: {nombre, id, candidatos},
      monto,
      moneda,
      fecha: nullableText(fila.fecha, 10),
      detalle: nullableText(fila.detalle, 500),
      avisos,
    };
    if (fechaMotivo) accion.fecha_motivo = fechaMotivo;
    if (noEnTexto) accion.no_en_texto = noEnTexto;
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
  /** Espera sugerida por el motor para el límite por empresa (#127), en minutos. */
  esperaMinutos: number | null;
  constructor(message: string, status: number, code = '', esperaMinutos: number | null = null) {
    super(message);
    this.name = 'IaApiError';
    this.status = status;
    this.code = code;
    this.esperaMinutos = esperaMinutos;
  }
}

/** Cómo tratar un fallo del análisis: cada caso tiene su acción en el diálogo. */
export type IaFallo = {
  tipo: 'no-configurada' | 'texto-largo' | 'limite' | 'proveedor' | 'sesion' | 'permiso' | 'texto' | 'desconocido';
  mensaje: string;
  /** Minutos informados por el motor cuando el estado es `limite`. */
  esperaMinutos: number | null;
};

const minutosDe = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numero = Number(value);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.max(1, Math.ceil(numero));
};
const segundosAMinutos = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numero = Number(value);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.max(1, Math.ceil(numero / 60));
};

/**
 * Clasifica el fallo del análisis en estados accionables distintos (#127/#128).
 *
 * Códigos del motor (tolerantes a variantes): `ia_no_configurada` (sin clave),
 * `ia_texto_largo` (el modelo truncó: probá en dos partes), `ia_limite` (cuota
 * por empresa, con `espera_minutos`/`retry_after`), `ia_proveedor_ocupado`
 * (reintentá); el estado HTTP también clasifica. El texto pegado nunca viaja en
 * el mensaje: la app no lo repite ni lo persiste.
 */
export function clasificarIaFallo(cause: unknown): IaFallo {
  if (!(cause instanceof IaApiError)) {
    return {tipo: 'desconocido', mensaje: cause instanceof Error ? cause.message : 'No se pudo completar el análisis.', esperaMinutos: null};
  }
  const code = cause.code.toLowerCase();
  const mensaje = cause.message.toLowerCase();
  const es = (patron: RegExp) => patron.test(code) || patron.test(mensaje);
  if (code === 'ia_no_configurada' || es(/no[_ -]?configurada|sin[_ -]?configurar/)) return {tipo: 'no-configurada', mensaje: 'La IA no está configurada en el servidor.', esperaMinutos: null};
  if (es(/texto.*(largo|extens|grande)|truncad|demasiado[_ -]?texto|length|json inv[aá]lido/)) {
    return {tipo: 'texto-largo', mensaje: `El texto era muy largo para una sola pasada. Probá en dos partes de hasta ${IA_TEXTO_MAX.toLocaleString('es-PY')} caracteres cada una.`, esperaMinutos: null};
  }
  // Resiliencia del motor (#127): salida vacía o ilegible tras el reintento del
  // servidor; se reintenta desde acá y, si persiste, conviene dividir el texto.
  if (code === 'ia_vacio' || code === 'ia_json') {
    return {tipo: 'proveedor', mensaje: 'La IA devolvió una respuesta ilegible. Reintentá en un momento; si sigue, dividí el texto en dos partes.', esperaMinutos: null};
  }
  if (cause.status === 429 || es(/limite|rate|cuota|throttle/)) {
    const espera = cause.esperaMinutos;
    return {tipo: 'limite', mensaje: `Alcanzaste el límite de análisis de tu empresa. ${espera ? `Esperá ${espera} minuto${espera === 1 ? '' : 's'}` : 'Esperá unos minutos'} y volvé a probar; mientras tanto podés cargar a mano.`, esperaMinutos: espera};
  }
  if (cause.status === 401) return {tipo: 'sesion', mensaje: 'Tu sesión venció. Volvé a ingresar y probá de nuevo.', esperaMinutos: null};
  if (cause.status === 403) return {tipo: 'permiso', mensaje: 'Tu rol no permite crear los registros de esta carga.', esperaMinutos: null};
  if (cause.status === 0) return {tipo: 'proveedor', mensaje: 'Sin conexión con el servidor. Revisá tu conexión y probá de nuevo.', esperaMinutos: null};
  if (cause.status >= 500 || es(/proveedor|ocupad|timeout|no respondi/)) return {tipo: 'proveedor', mensaje: 'El proveedor de IA está ocupado o no respondió. Reintentá en unos segundos: el texto que pegaste sigue acá.', esperaMinutos: null};
  if (cause.status === 400) return {tipo: 'texto', mensaje: cause.message || 'El texto no es válido para el análisis.', esperaMinutos: null};
  return {tipo: 'desconocido', mensaje: cause.message || 'No se pudo completar el análisis.', esperaMinutos: null};
}

/** Mensaje claro y en es-PY para cada fallo del asistente (nunca el cuerpo crudo). */
export function mensajeIaError(cause: unknown): string {
  return clasificarIaFallo(cause).mensaje;
}

/**
 * Monto sospechoso para guaraníes (auditoría #128): menos de Gs 10.000 suele ser
 * un error de escala («500 mil» leído como 500). Se avisa, no se corrige solo.
 */
export function montoDudosoIa(monto: number | null | undefined, moneda = 'PYG') {
  return String(moneda).toUpperCase() === 'PYG' && typeof monto === 'number' && Number.isFinite(monto) && monto > 0 && monto < 10_000;
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
  const data = (await response.json().catch(() => null)) as {error?: unknown; code?: unknown; espera_minutos?: unknown; retry_after?: unknown; retryAfter?: unknown} | null;
  if (!response.ok) {
    const mensaje = typeof data?.error === 'string' && data.error ? data.error : `No se pudo completar el análisis (HTTP ${response.status}).`;
    // La espera del límite puede venir en minutos (`espera_minutos`/`retryAfter`) o en segundos (`retry_after`).
    const espera = minutosDe(data?.espera_minutos ?? data?.retryAfter) ?? segundosAMinutos(data?.retry_after);
    throw new IaApiError(mensaje, response.status, typeof data?.code === 'string' ? data.code : '', espera);
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
