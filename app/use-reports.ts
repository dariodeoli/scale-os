'use client';
import {useEffect,useState} from 'react';
import {api} from './operations';
import {shiftMonth,type ReportsData} from './reports-data';

/**
 * Ventana de Informes: reporte del mes visible + la ventana anterior equivalente.
 *
 * Contrato de estado (igual al que ya validaba la pantalla): los datos se ocultan
 * al cambiar la consulta, las respuestas fuera de orden se descartan por `queryKey`,
 * la ventana anterior solo se pide cuando la actual llegó y corresponde al mes
 * pedido, y el error pertenece únicamente a la consulta vigente.
 */
export function useReportsWindow(month: string, months: number, retry: number) {
  const [result, setResult] = useState<{key: string; data: ReportsData} | null>(null);
  const [previousResult, setPreviousResult] = useState<{key: string; data: ReportsData} | null>(null);
  const [error, setError] = useState('');
  const queryKey = `${month}:${months}:${retry}`;
  useEffect(() => {
    let alive = true;
    setResult(null);
    setPreviousResult(null);
    setError('');
    void api<ReportsData>(`/api/agency/reports?month=${month}&months=${months}`).then(data => {
      if (!data || data.month !== month || !Array.isArray(data.months)) throw Error('La respuesta del reporte no corresponde al mes solicitado.');
      if (alive) setResult({key: queryKey, data});
      const previousWindowMonth = shiftMonth(month, -months);
      if (!alive || !previousWindowMonth) return;
      void api<ReportsData>(`/api/agency/reports?month=${previousWindowMonth}&months=${months}`).then(previous => {
        if (!previous || previous.month !== previousWindowMonth || !Array.isArray(previous.months)) return;
        if (alive) setPreviousResult({key: queryKey, data: previous});
      }).catch(() => {});
    }).catch(cause => {
      if (alive) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el reporte.');
    });
    return () => {alive = false;};
  }, [month, months, retry, queryKey]);
  return {
    data: result?.key === queryKey ? result.data : null,
    previousData: previousResult?.key === queryKey ? previousResult.data : null,
    error,
  };
}
