"use client";
// Buscador global migrado a `PaletaComandos` (owncoding-ui §15.8, ADOPCION-V2
// P2, Refs #135). La app aporta el catálogo real del shell —navegación por rol,
// clientes/proyectos/piezas, crear registro contextual y ayuda—; el objeto de
// la biblioteca dibuja el disparador, el atajo ⌘/Ctrl+K, el debounce, los
// estados y la navegación por teclado. Sin lógica de UI duplicada.
import {useCallback,useMemo} from 'react';
import {PaletaComandos} from 'owncoding-ui';
import {normalizeSearch} from './control-center-data';
import {sections} from './navigation';
import {visibleModule} from './workspace-access';
import type {AssignedPerson} from './assigned-people';

export type SearchRecord = {
  id: string;
  name: string;
  context: string;
  kind: 'clients' | 'projects' | 'work-orders';
  clientName?: string;
  clientLogo?: string | null;
  clientColor?: string | null;
  assignees?: AssignedPerson[];
};
export const searchDestination = (kind: SearchRecord['kind']) => kind === 'clients' ? 'Clientes' : kind === 'projects' ? 'Proyectos' : 'Producción';

/** Resultado canónico de la paleta: `tipo` agrupa y `datos` decide la acción. */
export type CommandResult = {
  id: string;
  tipo: 'accion' | 'ir' | 'cliente' | 'proyecto' | 'pieza';
  titulo: string;
  detalle: string;
  datos: {
    accion: 'navegar' | 'registro' | 'crear' | 'ayuda' | 'status';
    module?: string;
    kind?: SearchRecord['kind'];
    create?: 'order' | 'project' | 'budget';
  };
};
export type CreateKind = NonNullable<CommandResult['datos']['create']>;

/** Tope de registros visibles: los comandos y destinos nunca se recortan. */
export const COMMAND_RECORD_LIMIT = 30;

const CREATE_TARGET: Record<string, {create: CreateKind; label: string}> = {
  Proyectos: {create: 'project', label: 'un proyecto'},
  Presupuestos: {create: 'budget', label: 'un presupuesto'},
  Producción: {create: 'order', label: 'una pieza'},
  Resumen: {create: 'order', label: 'una pieza'},
};

/** Acciones reales del shell para la sección activa (mismas capacidades que el encabezado). */
export function commandActions(active: string, canCreate: boolean): CommandResult[] {
  const target = CREATE_TARGET[active];
  const results: CommandResult[] = [];
  if (canCreate && target) results.push({id: `crear-${target.create}`, tipo: 'accion', titulo: `Crear ${target.label}`, detalle: `Nuevo registro desde ${active}`, datos: {accion: 'crear', create: target.create}});
  results.push({id: 'ayuda', tipo: 'accion', titulo: `Ayuda de ${active}`, detalle: 'Qué podés hacer en este módulo', datos: {accion: 'ayuda', module: active}});
  results.push({id: 'estado', tipo: 'accion', titulo: 'Estado del sistema', detalle: 'Disponibilidad y comprobaciones en vivo', datos: {accion: 'status'}});
  return results;
}

/** Destinos de navegación visibles para el rol (misma fuente que el NAV). */
export function commandNavigation(role: string): CommandResult[] {
  return sections
    .filter(([label]) => visibleModule(label, role))
    .map(([label]) => ({id: `ir-${label}`, tipo: 'ir' as const, titulo: label, detalle: 'Abrir módulo', datos: {accion: 'navegar' as const, module: label}}));
}

/** Índice de registros del shell (clientes, proyectos y piezas). */
export function commandRecords(records: SearchRecord[]): CommandResult[] {
  return records.map((record) => ({
    id: `registro-${record.kind}-${record.id}`,
    tipo: record.kind === 'clients' ? 'cliente' : record.kind === 'projects' ? 'proyecto' : 'pieza',
    titulo: record.name,
    detalle: record.context,
    datos: {accion: 'registro', kind: record.kind},
  }));
}

/** Filtro puro: comandos primero, registros acotados al tope declarado. */
export function filterCommands(catalog: CommandResult[], query: string, limit = COMMAND_RECORD_LIMIT): CommandResult[] {
  const term = normalizeSearch(query);
  if (!term) return [];
  let records = 0;
  return catalog.filter((item) => {
    if (!normalizeSearch(`${item.titulo} ${item.detalle}`).includes(term)) return false;
    if (item.tipo === 'accion' || item.tipo === 'ir') return true;
    records += 1;
    return records <= limit;
  });
}

export function WorkspaceSearch({records, navigate, active = 'Resumen', role = 'viewer', canCreate = false, onCreate, onHelp}: {
  records: SearchRecord[];
  navigate: (label: string) => void;
  active?: string;
  role?: string;
  canCreate?: boolean;
  onCreate?: (kind: CreateKind) => void;
  onHelp?: () => void;
}) {
  const catalog = useMemo(() => [...commandActions(active, canCreate), ...commandNavigation(role), ...commandRecords(records)], [active, canCreate, role, records]);
  const buscar = useCallback(async (consulta: string) => filterCommands(catalog, consulta), [catalog]);
  const elegir = useCallback((resultado: CommandResult) => {
    const datos = resultado.datos;
    if (datos.accion === 'navegar' && datos.module) navigate(datos.module);
    else if (datos.accion === 'registro' && datos.kind) navigate(searchDestination(datos.kind));
    else if (datos.accion === 'crear' && datos.create) onCreate?.(datos.create);
    else if (datos.accion === 'ayuda') onHelp?.();
    else if (datos.accion === 'status') window.location.assign('/status');
  }, [navigate, onCreate, onHelp]);
  return <PaletaComandos
    boton
    textoBoton="Buscar cliente, proyecto u orden"
    titulo="Buscar en esta empresa"
    ariaLabel="Buscar clientes, proyectos y órdenes"
    placeholder="Nombre, cliente, proyecto o acción…"
    buscar={buscar}
    onElegir={elegir}
    etiquetasTipo={{accion: 'Acciones', ir: 'Ir a', cliente: 'Clientes', proyecto: 'Proyectos', pieza: 'Producción'}}
    minimo={2}
    descripcionVacio="No encontramos nada para esa búsqueda. Probá con el nombre de un cliente, un proyecto, una pieza o un módulo."
  />;
}
