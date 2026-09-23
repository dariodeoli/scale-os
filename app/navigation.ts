export const sections = [
 ['Resumen','resumen'],['Pipeline','pipeline'],['Clientes','clientes'],['Presupuestos','presupuestos'],
 ['Proyectos','proyectos'],['Producción','produccion'],['Inventario','inventario'],['Estudio','estudio'],
 ['Finanzas','pagos'],['Mora','pagos/mora'],['Informes','informes'],['Equipo','equipo'],
 ['Invitaciones','equipo/invitaciones'],['Comisiones','equipo/comisiones'],['Roles y permisos','equipo/permisos'],
 ['Métricas','pipeline/metricas'],['Planes','presupuestos/planes'],
  ['Historial de trabajo','equipo/historial'],['Actividad','equipo/actividad'],['Configuración','configuracion'],['Previsión','pagos/prevision'],['Preferencias','configuracion/preferencias'],['Papelera','configuracion/papelera'],
] as const;
export function sectionPath(label:string){if(label==='Tablero de producción')label='Producción';if(label==='Métricas')label='Pipeline';if(label==='Pagos')label='Finanzas';return '/'+(sections.find(([name])=>name===label)?.[1]||'resumen');}
export function sectionLabel(path:string){return sections.find(([,slug])=>'/'+slug===path.replace(/\/$/,''))?.[0]||'Resumen';}
export function validSection(slug:string){return sections.some(([,value])=>value===slug);}
export const legacyRoutes:Record<string,string>={actividad:'/equipo/actividad',metricas:'/pipeline',mora:'/pagos/mora',planes:'/presupuestos/planes',comisiones:'/equipo/comisiones',papelera:'/configuracion/papelera',colaboradores:'/equipo'};
export function legacyDestination(slug:string){return Object.prototype.hasOwnProperty.call(legacyRoutes,slug)?legacyRoutes[slug]:undefined;}
export const sectionGroups:Record<string,readonly string[]>={Finanzas:['Finanzas','Mora','Previsión'],Pipeline:['Pipeline'],Presupuestos:['Presupuestos','Planes'],Equipo:['Equipo','Invitaciones','Comisiones','Roles y permisos','Historial de trabajo','Actividad'],'Configuración':['Configuración','Preferencias','Papelera']};
export function parentSection(label:string){if(label==='Métricas')return 'Pipeline';return Object.entries(sectionGroups).find(([,children])=>children.includes(label))?.[0]||label;}
export function childSections(label:string){return sectionGroups[parentSection(label)]||[label];}
export const tabLabels:Record<string,string>={Finanzas:'Cuentas y movimientos',Pipeline:'Oportunidades',Métricas:'Visitas y crecimiento',Mora:'Cobranza y mora','Previsión':'Previsión financiera',Invitaciones:'Invitaciones y solicitudes',Equipo:'Personas y accesos',Comisiones:'Comisiones y referidos','Roles y permisos':'Roles y permisos',Planes:'Planes reutilizables','Configuración':'Empresa y ajustes','Preferencias':'Preferencias del espacio',Papelera:'Registros recuperables'};
