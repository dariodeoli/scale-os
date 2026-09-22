"use client";
import Link from 'next/link';
import {sectionPath} from '../navigation';

// Estado «Sin acceso» del marco.
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
export function SinAccesoSection(){
  return (
    <section className="panel"><h2>No tenés permiso para esta sección</h2><p>Podés elegir otra sección del menú o pedir al dueño que revise tu acceso.</p><Link className="primary" href={sectionPath('Resumen')}>Ir al resumen</Link></section>
  );
}
