"use client";
// Menú ⋯ del panel global que abre hacia el lado con espacio: el desplegable de
// 12 rem se alinea a la derecha del disparador salvo que no entre a su izquierda
// (disparador cerca del borde), caso en que abre hacia la derecha (#167).
import {useRef, useState, type ComponentProps} from "react";
import {ActionMenu} from "../ui-v2";

const MENU_WIDTH = 192;
const GUTTER = 8;

export function EdgeAwareActionMenu(props: Omit<ComponentProps<typeof ActionMenu>, "align">) {
  const root = useRef<HTMLSpanElement | null>(null);
  const [align, setAlign] = useState<"left" | "right">("right");
  const measure = () => {
    const box = root.current?.getBoundingClientRect();
    if (!box) return;
    setAlign(box.right - MENU_WIDTH >= GUTTER ? "right" : "left");
  };
  return <span ref={root} className="inline-flex" onPointerDownCapture={measure} onFocusCapture={measure} onKeyDownCapture={measure}>
    <ActionMenu {...props} align={align}/>
  </span>;
}
