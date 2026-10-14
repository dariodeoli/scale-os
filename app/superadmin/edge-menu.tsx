"use client";
// Contenedor del menú ⋯ del panel global: abre hacia el lado con espacio. El
// desplegable (12 rem) se alinea a la derecha del disparador salvo que no entre
// a su izquierda (disparador cerca del borde), caso en que abre hacia la
// derecha (#167). Recibe el `ActionMenu` como hijo y le inyecta `align`.
import {cloneElement, useRef, useState, type ReactElement} from "react";

const MENU_WIDTH = 192;
const GUTTER = 8;

export function EdgeAwareMenu({children}: {children: ReactElement<{align?: "left" | "right"}>}) {
  const root = useRef<HTMLSpanElement | null>(null);
  const [align, setAlign] = useState<"left" | "right">("right");
  const measure = () => {
    const box = root.current?.getBoundingClientRect();
    if (box) setAlign(box.right - MENU_WIDTH >= GUTTER ? "right" : "left");
  };
  return <span ref={root} className="inline-flex" onPointerDownCapture={measure} onFocusCapture={measure} onKeyDownCapture={measure}>
    {cloneElement(children, {align})}
  </span>;
}
