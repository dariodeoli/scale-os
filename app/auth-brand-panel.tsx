import {Check} from 'lucide-react';
import {WorkspaceBrand} from './workspace-brand';

// Panel de marca del acceso: lo comparten el login (shell) y `AccessLayout`.
// Solo se dibuja desde 1024 px (`.auth-split` en globals.css); en mobile la
// tarjeta queda sola y centrada. El texto sale de la landing pública
// (public/scale-os.html): capacidades reales, sin métricas ni testimonios.
const benefits=[
 ['Producción y tareas','Proyectos y piezas con responsables, checklists, horas estimadas y fecha de entrega.'],
 ['De la propuesta al contrato','Presupuestos, modelos de contrato y datos de tu empresa y clientes en un mismo espacio.'],
 ['Finanzas y recursos','Balance por moneda, cobros, inventario, estudio y permisos para tu equipo.'],
] as const;

export function AuthBrandPanel(){
 return <aside className="auth-brand-panel" aria-label="Qué es Scale OS">
  <a className="auth-brand-home" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></a>
  <div className="auth-brand-copy">
   <p className="auth-brand-eyebrow">Una operación conectada</p>
   <p className="auth-brand-title">Menos perseguir información. Más hacer avanzar el trabajo.</p>
   <ul className="auth-brand-benefits">
    {benefits.map(([title,detail])=><li key={title}>
     <span className="auth-brand-check" aria-hidden="true"><Check size={14} strokeWidth={2.5}/></span>
     <span><b>{title}</b><span>{detail}</span></span>
    </li>)}
   </ul>
  </div>
  <p className="auth-brand-note">Por agencia, con todos sus integrantes incluidos. Sin tarjeta para iniciar.</p>
 </aside>;
}
