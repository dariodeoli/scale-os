'use client';
// Selección múltiple única (#185 D3, AGENTS.md «Selección múltiple»).
//
// `useBulkSelection` concentra lo que cada pantalla copiaba a mano:
// alternar un id, «Seleccionar visibles», tope por llamada con aviso y poda
// contra la lista viva. La barra contextual es `BulkBar` (ui-v2). El lote se
// sigue resolviendo en una sola llamada al endpoint de cada pantalla.
import {useCallback,useMemo,useState} from 'react';
import {limitSelection} from './capabilities';
import {notify} from './feedback';

export type BulkSelectionOptions = {
  /** Tope del endpoint (`BATCH_LIMITS.*`). */
  limit: number;
  /** Sustantivo plural para los avisos: «presupuestos», «equipos»… */
  noun: string;
  /** Salida de los avisos; por defecto un toast de advertencia (`notify`). */
  onNotice?: (message: string) => void;
  /** Texto propio cuando «Seleccionar visibles» recorta al tope. */
  cappedMessage?: string;
};

export type BulkSelection = {
  /** Ids elegidos (conjunto, sin repetidos). */
  selected: ReadonlySet<string>;
  /** Mismos ids en el orden en que se eligieron (para el body del lote). */
  ids: string[];
  count: number;
  limit: number;
  has: (id: string) => boolean;
  /** Alterna un id; al tope avisa y no suma. */
  toggle: (id: string) => void;
  /** Suma los ids visibles hasta el tope; si ya estaban todos, los quita. */
  selectVisible: (visibleIds: readonly string[]) => void;
  clear: () => void;
  /** Reemplaza la selección (la ajusta a lo que sigue vivo o la cierra). */
  replace: (ids: readonly string[]) => void;
  /** Descarta lo que ya no está en la lista viva. */
  prune: (liveIds: Iterable<string>) => void;
};

export function useBulkSelection({limit, noun, onNotice, cappedMessage}: BulkSelectionOptions): BulkSelection {
  const [ids, setIds] = useState<string[]>([]);
  const warn = useCallback((message: string) => {
    if (onNotice) onNotice(message);
    else notify({tone: 'warning', message});
  }, [onNotice]);
  const toggle = useCallback((id: string) => {
    if (ids.includes(id)) { setIds(ids.filter(value => value !== id)); return; }
    if (ids.length >= limit) { warn(`El lote admite hasta ${limit} ${noun}. Quitá alguno para sumar otro.`); return; }
    setIds([...ids, id]);
  }, [ids, limit, noun, warn]);
  const selectVisible = useCallback((visibleIds: readonly string[]) => {
    const visible = [...new Set(visibleIds)];
    if (visible.length > 0 && visible.every(id => ids.includes(id))) { setIds(ids.filter(id => !visible.includes(id))); return; }
    const {selection, capped} = limitSelection([...ids, ...visible], limit);
    setIds(selection);
    if (capped) warn(cappedMessage ?? `El lote admite hasta ${limit} ${noun}: se seleccionaron los primeros ${limit}.`);
  }, [ids, limit, noun, warn, cappedMessage]);
  const clear = useCallback(() => setIds(current => current.length ? [] : current), []);
  const replace = useCallback((next: readonly string[]) => setIds([...new Set(next)].slice(0, limit)), [limit]);
  const prune = useCallback((liveIds: Iterable<string>) => {
    const live = new Set(liveIds);
    setIds(current => { const next = current.filter(id => live.has(id)); return next.length === current.length ? current : next; });
  }, []);
  const selected = useMemo(() => new Set(ids), [ids]);
  const has = useCallback((id: string) => selected.has(id), [selected]);
  return {selected, ids, count: ids.length, limit, has, toggle, selectVisible, clear, replace, prune};
}
