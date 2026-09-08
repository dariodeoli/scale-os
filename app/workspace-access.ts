/** Leaf permissions do not expand when menu entries are grouped. Server checks remain authoritative. */
export const visibleModule=(label:string,role:string)=>{
 if(label==='Colaboradores')return false;
 if(label==='Papelera')return ['owner','admin','management','finance','sales','production'].includes(role);
 if(['Actividad','Configuración'].includes(label))return ['owner','admin'].includes(role);
 if(['Pagos','Equipo','Comisiones'].includes(label))return ['owner','admin','finance'].includes(role);
 if(['Pipeline','Planes','Presupuestos','Mora'].includes(label))return ['owner','admin','management','finance','sales'].includes(role);
 if(label==='Métricas')return ['owner','admin'].includes(role);
 return true;
};
