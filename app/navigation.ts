export const sections = [
 ['Resumen','resumen'],['Clientes','clientes'],['Proyectos','proyectos'],
 ['Presupuestos','presupuestos'],['Pagos','pagos'],['Mora','mora'],
 ['Métricas','metricas'],['Equipo','equipo'],['Comisiones','comisiones'],
 ['Pipeline','pipeline'],['Planes','planes'],['Inventario','inventario'],
 ['Actividad','actividad'],['Configuración','configuracion'],['Papelera','papelera'],
] as const;
export function sectionPath(label:string){return '/'+(sections.find(([name])=>name===label)?.[1]||'resumen');}
export function sectionLabel(path:string){return sections.find(([,slug])=>'/'+slug===path.replace(/\/$/,''))?.[0]||'Resumen';}
export function validSection(slug:string){return sections.some(([,value])=>value===slug);}
