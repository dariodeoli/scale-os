/** Leaf permissions do not expand when menu entries are grouped. Server checks remain authoritative. */
export const visibleModule=(label:string,role:string)=>{
 if(label==='Colaboradores')return false;
 if(label==='Admin')return false;
 if(label==='Papelera')return ['owner','admin','management','finance','sales','production'].includes(role);
 if(['Actividad','Configuración','Invitaciones'].includes(label))return ['owner','admin'].includes(role);
 if(['Finanzas','Pagos','Comisiones','Historial de trabajo','Roles y permisos','Previsión'].includes(label))return ['owner','admin','finance'].includes(role);
 if(label==='Informes')return ['owner','admin','finance','sales'].includes(role);
 if(label==='Mora')return ['owner','admin','management','finance','sales'].includes(role);
 if(label==='Pipeline')return ['owner','admin','management','finance','sales','colaborador'].includes(role);
 if(['Planes','Presupuestos'].includes(label))return ['owner','admin','management','finance','sales','production','colaborador'].includes(role);
 if(label==='Estudio')return ['owner','admin','management','production','finance','editor','viewer','sales','colaborador'].includes(role);
 if(label==='Métricas')return ['owner','admin'].includes(role);
 return true;
};
