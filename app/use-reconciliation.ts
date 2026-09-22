'use client';
import {useCallback,useState} from 'react';
import {api} from './operations';
import {normalizeReconciliation, type StatementLine, type StatementMovement} from './treasury-data';

/**
 * Estado de la conciliación por extracto: filas del extracto y movimientos
 * registrados de la cuenta elegida. `load` reemplaza ambos conjuntos; `reset`
 * los vacía al cambiar de cuenta (igual contrato que la pantalla actual).
 */
export function useReconciliation() {
  const [lines, setLines] = useState<StatementLine[]>([]);
  const [movements, setMovements] = useState<StatementMovement[]>([]);
  const load = useCallback(async (accountId: string) => {
    const data = await api<unknown>(`/api/agency/reconciliation?accountId=${accountId}`);
    const next = normalizeReconciliation(data);
    setLines(next.lines);
    setMovements(next.movements);
  }, []);
  const reset = useCallback(() => {
    setLines([]);
    setMovements([]);
  }, []);
  return {lines, movements, load, reset};
}
