'use client';
import {useCallback,useEffect,useState} from 'react';
import {dataFetch} from './data-cache';
import {feedbackEvent} from './feedback';
import {
  isRecord,
  realAccounts,
  realExpenseRows,
  validForecast,
  type ForecastData,
  type Horizon,
  type RealAccountRow,
  type RealExpenseRow,
} from './forecast-data';

/**
 * Estado de la Previsión: trae el mes/horizonte, valida el contrato y se recarga
 * con cada mutación confirmada (`feedbackEvent`, igual que la pantalla actual).
 */
export function useForecast(month: string, horizon: Horizon) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener(feedbackEvent, update);
    return () => window.removeEventListener(feedbackEvent, update);
  }, []);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    void dataFetch(`/core-api/api/agency/forecast?month=${encodeURIComponent(month)}${horizon === '1' ? '' : `&months=${horizon}`}`, {credentials: 'include'})
      .then(async response => {
        const result: unknown = await response.json();
        if (!response.ok) throw new Error(isRecord(result) && typeof result.error === 'string' ? result.error : 'No se pudo cargar la previsión');
        if (!validForecast(result)) throw new Error('La previsión recibió datos inválidos. Recargá la página.');
        if (active) setData(result);
      })
      .catch(cause => {if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la previsión');});
    return () => {active = false;};
  }, [month, horizon, refresh]);
  const reload = useCallback(() => setRefresh(value => value + 1), []);
  return {data, error, reload, version: refresh, setError};
}

/**
 * Cuentas activas y gastos reales del mes. Solo consulta cuando la previsión del
 * mes pedido ya llegó; al recargarse la previsión (misma fecha u objeto nuevo)
 * vuelve a leer, que es lo que actualiza el listado tras revertir un gasto.
 */
export function useRealExpenses(month: string, data: ForecastData | null) {
  const [accounts, setAccounts] = useState<RealAccountRow[]>([]);
  const [expenses, setExpenses] = useState<RealExpenseRow[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!data || data.month !== month) return;
    let active = true;
    setError('');
    const read = async (url: string) => {
      const response = await dataFetch(url, {credentials: 'include'});
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(isRecord(result) && typeof result.error === 'string' ? result.error : 'No se pudieron cargar los gastos reales');
      return result;
    };
    void Promise.all([
      read('/core-api/api/agency/accounts'),
      read(`/core-api/api/agency/expenses?month=${encodeURIComponent(month)}`),
    ])
      .then(([accountPayload, expensePayload]) => {
        if (!active) return;
        setAccounts(realAccounts(accountPayload));
        setExpenses(realExpenseRows(expensePayload));
      })
      .catch(cause => {if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los gastos reales');});
    return () => {active = false;};
  }, [data, month]);
  return {accounts, expenses, error, setError};
}
