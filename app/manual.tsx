"use client";
import {BookOpen,CheckCircle2,Globe,CircleDot} from 'lucide-react';
import './manual.css';

const modules=[
 {name:'Clientes',summary:'Fichas de contacto, apariencia, RUC y datos comerciales de cada cliente. El estado del servicio (activo, pausado, cancelado) gobierna sus proyectos.'},
 {name:'Pipeline y presupuestos',summary:'Oportunidades de venta por etapas (lead, contactado, propuesta, negociación, ganado, perdido). Los presupuestos se comparten con un enlace público y una propuesta aceptada puede convertirse en factura.'},
 {name:'Proyectos',summary:'Agrupan el trabajo por cliente con fechas, responsables, enlaces de Drive y niveles de aprobación interna.'},
 {name:'Producción',summary:'Tablero de piezas por estado (bloqueada, por grabar, grabada, edición, revisión, aprobada, publicada). Cada pieza tiene checklist, comentarios, historial y acciones de revisión del cliente.'},
 {name:'Inventario',summary:'Equipos por categoría y ubicación, con fotos, verificación física, etiquetas imprimibles, reservas por fecha, retiro y devolución con responsable.'},
 {name:'Estudio',summary:'Espacios y reservas del estudio con responsables y calendario mensual.'},
 {name:'Finanzas',summary:'Cuentas, cobros, pagos, gastos planificados y reales, comisiones, mora (cobranzas) y previsión mensual con proyección de caja a 3, 6 o 12 meses.'},
 {name:'Equipo',summary:'Personas con ficha laboral, modalidad e importe acordado, accesos al panel, cargos y permisos por rol. La matriz de permisos define qué ve cada cargo.'},
 {name:'Portal del cliente',summary:'Entregas publicadas que el cliente revisa desde su propio enlace, con aprobación o pedido de cambios. Cada pieza publicada tiene su enlace de revisión con vencimiento.'},
 {name:'Configuración',summary:'Datos de la empresa, moneda predeterminada, cotización USD/PYG, integraciones, permisos, papelera y este manual.'},
];
const portalSteps=[
 {title:'Ingresa con tu enlace',detail:'El cliente recibe un enlace directo a su entrega; no necesita crear cuenta.'},
 {title:'Revisa la pieza',detail:'Ve el archivo publicado con los comentarios internos resueltos.'},
 {title:'Aprueba o pide cambios',detail:'Su respuesta llega al tablero de producción como aprobación o como solicitud de cambios.'},
 {title:'Sin acceso a tu panel',detail:'El cliente solo ve lo que publicaste; nunca accede a clientes, finanzas ni equipo.'},
];
function PortalPreview(){
 return <div className="manual-portal-preview" aria-label="Vista previa del panel del cliente">
  <header className="manual-portal-header"><span className="manual-portal-brand"><Globe size={15}/> Entrega para el cliente</span><span className="manual-portal-chip">Sin iniciar sesión</span></header>
  <h4>Reel de lanzamiento · Campaña de verano</h4>
  <p className="manual-portal-note">Tu agencia publicó esta pieza para tu revisión.</p>
  <div className="manual-portal-card"><CircleDot size={14}/><b>Video final</b><span className="manual-portal-state">Publicada</span></div>
  <div className="manual-portal-actions"><button type="button" disabled className="primary">Aprobar</button><button type="button" disabled className="secondary">Pedir cambios</button></div>
  <p className="manual-portal-foot">El enlace vence y no muestra datos internos de tu empresa.</p>
 </div>;
}
export function ManualWorkspace(){
 return <section className="panel settings-card" aria-labelledby="manual-settings-title">
  <div className="settings-card-heading"><span className="settings-card-icon" aria-hidden="true"><BookOpen size={18}/></span><div><h2 id="manual-settings-title">Manual de la aplicación</h2><p>Qué hace cada módulo del panel y cómo ve el cliente lo que publicás.</p></div></div>
  <div className="manual-list">
   {modules.map(module=><details className="manual-module" key={module.name}><summary>{module.name}</summary><p>{module.summary}</p></details>)}
  </div>
  <h3 className="manual-subtitle">Así ve el cliente una entrega</h3>
  <ol className="manual-steps">{portalSteps.map((step,index)=><li key={step.title}><CheckCircle2 size={15}/><b>{index+1}. {step.title}</b><small>{step.detail}</small></li>)}</ol>
  <PortalPreview/>
 </section>;
}
