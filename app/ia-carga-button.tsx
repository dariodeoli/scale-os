"use client";
import {Sparkles} from 'lucide-react';

/**
 * Botón del topbar de «Carga con IA» (Refs #118). Vive separado del diálogo
 * para que el shell cargue sólo esta pieza: el diálogo llega diferido recién al
 * abrirlo (mismo patrón que Mi perfil y la ficha del cliente).
 *
 * El shell lo monta únicamente si el rol puede crear clientes o equipos de
 * inventario; el texto del tooltip explica qué hace antes de abrirlo.
 */
export function IaCargaButton({onOpen}:{onOpen:()=>void}){
 return <button
  type="button"
  className="secondary ia-carga-button whitespace-nowrap"
  onClick={onOpen}
  aria-haspopup="dialog"
  aria-label="Carga con IA"
  title="Carga con IA · pegá un texto y revisá antes de crear"
 >
  <Sparkles size={16} aria-hidden="true"/>
  <span className="hidden md:inline">Carga con IA</span>
 </button>;
}
