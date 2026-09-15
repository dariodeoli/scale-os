/** Leaf permissions do not expand when menu entries are grouped. Server checks remain authoritative. */
export const visibleModule=(label:string,role:string)=>{
 if(label==='Colaboradores')return false;
 if(label==='Admin')return false;
 if(label==='Papelera')return ['owner','admin','management','finance','sales','production'].includes(role);
 if(['Actividad','Configuración','Invitaciones'].includes(label))return ['owner','admin'].includes(role);
 if(['Finanzas','Pagos','Equipo','Comisiones','Historial de trabajo','Informes','Roles y permisos'].includes(label))return ['owner','admin','finance'].includes(role);
 if(['Pipeline','Planes','Presupuestos','Mora'].includes(label))return ['owner','admin','management','finance','sales'].includes(role);
 if(label==='Estudio')return ['owner','admin','management','production','finance','editor','viewer'].includes(role);
 if(label==='Métricas')return ['owner','admin'].includes(role);
 return true;
};
