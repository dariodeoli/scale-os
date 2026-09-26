"use client";
// Ronda 14 (#62, refs #43): tablas densas de la vertical comercial.
//
// La tabla densa sólo se muestra cuando el contenedor real tiene el ancho que
// exige su plantilla completa; si no entra, la sección usa su vista tarjeta y
// ninguna columna (montos, fechas o acciones) queda cortada. Se mide el
// contenedor con ResizeObserver y no el viewport: el nav colapsado, el padding
// del shell y el ancho de pantalla cambian el espacio disponible. Sin
// ResizeObserver (SSR y tests) se conserva la tabla densa para no alterar el
// render inicial.
import {useEffect,useRef,useState} from 'react';

/**
 * Ancho mínimo real de una tabla densa: suma de las pistas `rem` de la
 * plantilla + los espacios `gap-x-2` (8 px entre columnas) + el padding
 * lateral de fila y encabezado (8 px).
 */
export function denseTableMinWidth(trackRem: number, columns: number) {
  return trackRem * 16 + (columns - 1) * 8 + 8;
}

/** ¿Entra la tabla densa en el ancho medido del contenedor? */
export function denseTableFits(containerWidth: number, minWidth: number) {
  return containerWidth >= minWidth;
}

/**
 * Mide el contenedor de la sección y devuelve `fits` (la tabla densa entra).
 * El ref va en el nodo que comparte ancho con la tabla (la propia sección).
 */
export function useDenseTableFit<T extends HTMLElement = HTMLElement>(minWidth: number) {
  const ref = useRef<T | null>(null);
  const [fits, setFits] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => setFits(denseTableFits(element.clientWidth, minWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidth]);
  return {ref, fits};
}

// Anchos mínimos de los contratos densos COM: suma de las pistas de
// `CLIENT_TEMPLATE` (13+11+7+15+9+20 = 75rem, 6 columnas) y `BUDGET_TEMPLATE`
// (26+16+7+4+7+9+9+15 = 93rem, 8 columnas) + espacios + padding (ronda 14, #62).
export const CLIENT_TABLE_MIN_WIDTH = denseTableMinWidth(75, 6);
export const BUDGET_TABLE_MIN_WIDTH = denseTableMinWidth(93, 8);
