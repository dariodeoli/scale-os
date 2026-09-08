export const sections = [
 ['Resumen','resumen'],['Clientes','clientes'],['Proyectos','proyectos'],
 ['Presupuestos','presupuestos'],['Pagos','pagos'],['Mora','pagos/mora'],
 ['Métricas','metricas'],['Equipo','equipo'],['Comisiones','equipo/comisiones'],
 ['Pipeline','pipeline'],['Planes','presupuestos/planes'],['Inventario','inventario'],
 ['Actividad','actividad'],['Configuración','configuracion'],['Papelera','configuracion/papelera'],
] as const;
export function sectionPath(label:string){return '/'+(sections.find(([name])=>name===label)?.[1]||'resumen');}
export function sectionLabel(path:string){return sections.find(([,slug])=>'/'+slug===path.replace(/\/$/,''))?.[0]||'Resumen';}
export function validSection(slug:string){return sections.some(([,value])=>value===slug);}
export const legacyRoutes:Record<string,string>={mora:'/pagos/mora',planes:'/presupuestos/planes',comisiones:'/equipo/comisiones',papelera:'/configuracion/papelera',colaboradores:'/equipo'};
export function legacyDestination(slug:string){return Object.prototype.hasOwnProperty.call(legacyRoutes,slug)?legacyRoutes[slug]:undefined;}
export const sectionGroups:Record<string,readonly string[]>={Pagos:['Pagos','Mora'],Presupuestos:['Presupuestos','Planes'],Equipo:['Equipo','Comisiones'],'Configuración':['Configuración','Papelera']};
export function parentSection(label:string){return Object.entries(sectionGroups).find(([,children])=>children.includes(label))?.[0]||label;}
export function childSections(label:string){return sectionGroups[parentSection(label)]||[label];}
export const tabLabels:Record<string,string>={Pagos:'Cuentas y movimientos',Mora:'Cobranza y mora',Equipo:'Personas y accesos',Comisiones:'Comisiones y referidos',Planes:'Planes reutilizables','Configuración':'Empresa y ajustes'};
