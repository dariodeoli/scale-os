export const sections = [
 ['Resumen','resumen'],['Producción','produccion'],['Clientes','clientes'],['Proyectos','proyectos'],
 ['Presupuestos','presupuestos'],['Finanzas','pagos'],['Mora','pagos/mora'],['Informes','informes'],
 ['Métricas','pipeline/metricas'],['Equipo','equipo'],['Invitaciones','equipo/invitaciones'],['Comisiones','equipo/comisiones'],
 ['Pipeline','pipeline'],['Planes','presupuestos/planes'],['Inventario','inventario'],
 ['Resumen semanal','equipo/resumen-semanal'],['Historial de trabajo','equipo/historial'],['Actividad','equipo/actividad'],['Configuración','configuracion'],['Preferencias','configuracion/preferencias'],['Papelera','configuracion/papelera'],
] as const;
export function sectionPath(label:string){if(label==='Tablero de producción')label='Producción';if(label==='Métricas')label='Pipeline';if(label==='Pagos')label='Finanzas';return '/'+(sections.find(([name])=>name===label)?.[1]||'resumen');}
export function sectionLabel(path:string){return sections.find(([,slug])=>'/'+slug===path.replace(/\/$/,''))?.[0]||'Resumen';}
export function validSection(slug:string){return sections.some(([,value])=>value===slug);}
export const legacyRoutes:Record<string,string>={actividad:'/equipo/actividad',metricas:'/pipeline',mora:'/pagos/mora',planes:'/presupuestos/planes',comisiones:'/equipo/comisiones',papelera:'/configuracion/papelera',colaboradores:'/equipo'};
export function legacyDestination(slug:string){return Object.prototype.hasOwnProperty.call(legacyRoutes,slug)?legacyRoutes[slug]:undefined;}
export const sectionGroups:Record<string,readonly string[]>={Finanzas:['Finanzas','Mora'],Pipeline:['Pipeline'],Presupuestos:['Presupuestos','Planes'],Equipo:['Equipo','Resumen semanal','Invitaciones','Comisiones','Historial de trabajo','Actividad'],'Configuración':['Configuración','Preferencias','Papelera']};
export function parentSection(label:string){if(label==='Métricas')return 'Pipeline';return Object.entries(sectionGroups).find(([,children])=>children.includes(label))?.[0]||label;}
export function childSections(label:string){return sectionGroups[parentSection(label)]||[label];}
export const tabLabels:Record<string,string>={Finanzas:'Cuentas y movimientos',Pipeline:'Oportunidades',Métricas:'Visitas y crecimiento',Mora:'Cobranza y mora',Invitaciones:'Invitaciones y solicitudes',Equipo:'Personas y accesos',Comisiones:'Comisiones y referidos',Planes:'Planes reutilizables','Configuración':'Empresa y ajustes'};
