"use client";
import {createContext,useContext,type ReactNode} from 'react';

// Conteos exactos por etapa del tablero de Producción (contrato #57: `?counts=1`).
// El shell los pide una vez por sesión (respuesta mínima con los totales de todas
// las etapas) y el tablero los lee con `useBoardCounts()` para mostrar el total
// real de cada columna aunque la ventana de la columna traiga solo 50 tarjetas.
// Sin conteos (API vieja) el hook devuelve `null` y la columna cae a su conteo
// local.
export type BoardCounts = Record<string, number>;
const BoardCountsContext = createContext<BoardCounts | null>(null);

export function BoardCountsProvider({counts, children}:{counts:BoardCounts | null; children:ReactNode}) {
  return <BoardCountsContext.Provider value={counts}>{children}</BoardCountsContext.Provider>;
}

export function useBoardCounts(): BoardCounts | null {
  return useContext(BoardCountsContext);
}
