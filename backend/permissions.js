const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export const roles=['owner','admin','management','finance','sales','production','editor','viewer','collaborator'];
export const roleLabels={owner:'Dueño',admin:'Administrador',management:'Gerencia',finance:'Finanzas',sales:'Ventas',production:'Producción',editor:'Editor',viewer:'Solo lectura',collaborator:'Colaborador'};
const all=[...roles];
// Los roles del checklist viven en un solo lugar: ver y editar comparten audiencia.
const checklistRoles=['owner','admin','management','production','editor','collaborator'];
export const CAPABILITIES=[
 {id:'members.manage',label:'Equipo y accesos',description:'Personas, cargos, accesos, invitaciones y remuneraciones.',roles:['owner','admin','management']},
 {id:'settings.manage',label:'Configuración de la empresa',description:'Datos de la empresa, moneda y cotización.',roles:['owner','admin']},
 {id:'activity.view',label:'Actividad del equipo',description:'Ver actividad y auditoría de la empresa.',roles:['owner','admin']},
 {id:'metrics.view',label:'Métricas y crecimiento',description:'Métricas del sitio y panel de crecimiento.',roles:['owner','admin']},
 {id:'visitors.view',label:'Visitantes en vivo',description:'Visitas activas del landing y uso.',roles:['owner','admin']},
 {id:'company.create',label:'Crear empresas',description:'Crear empresas adicionales.',roles:['owner','admin']},
 {id:'clients.manage',label:'Gestionar clientes',description:'Crear y editar clientes, enlaces y ficha comercial.',roles:['owner','admin','management','sales','finance','collaborator']},
 {id:'projects.manage',label:'Crear proyectos',description:'Crear proyectos de trabajo.',roles:['owner','admin','management','sales','production','collaborator']},
 {id:'projects.edit',label:'Editar proyectos',description:'Editar datos y responsables de proyectos.',roles:['owner','admin','management','production','collaborator']},
 {id:'work-orders.manage',label:'Gestionar piezas',description:'Crear piezas y acciones de producción.',roles:['owner','admin','management','production','collaborator']},
 {id:'work-orders.edit',label:'Editar y mover piezas',description:'Editar piezas y cambiar su estado.',roles:['owner','admin','management','production','editor','collaborator']},
 {id:'assignees.manage',label:'Responsables',description:'Asignar responsables a proyectos y piezas.',roles:['owner','admin','management','production','collaborator']},
 {id:'work-checklists.view',label:'Ver checklists',description:'Leer los checklists de las piezas.',roles:checklistRoles},
 {id:'checklists.edit',label:'Checklists',description:'Editar checklists de piezas.',roles:checklistRoles},
 {id:'tasks.view',label:'Ver tareas propias',description:'Consultar tareas asignadas y su detalle.',roles:all},
 {id:'tasks.assign',label:'Asignar tareas del equipo',description:'Consultar y asignar tareas a miembros activos de la empresa.',roles:['owner','admin','management','production']},
 {id:'tasks.edit',label:'Actualizar tareas propias',description:'Crear tareas propias, completar, reprogramar y actualizar sus materiales.',roles:['owner','admin','management','production','editor','collaborator','sales','finance']},
 {id:'contracts.view',label:'Ver contratos',description:'Consultar documentos y versiones de contratos de la empresa.',roles:['owner','admin']},
 {id:'contracts.manage',label:'Editar contratos y plantillas',description:'Preparar borradores y plantillas con datos trazables.',roles:['owner','admin']},
 {id:'contracts.issue',label:'Emitir contratos revisados',description:'Emitir una versión inmutable después de revisión humana.',roles:['owner','admin']},
 {id:'contracts.bank-data.view',label:'Datos bancarios en contratos',description:'Incluir y consultar datos bancarios en documentos y PDF.',roles:['owner','admin','finance']},
 {id:'commercial.manage',label:'Pipeline comercial',description:'Oportunidades y seguimiento comercial.',roles:['owner','admin','management','finance','sales','collaborator']},
 {id:'budgets.manage',label:'Presupuestos y planes',description:'Presupuestos, planes reutilizables y cotización.',roles:['owner','admin','management','finance','sales','production','collaborator']},
 {id:'commercial-terms.manage',label:'Términos comerciales',description:'Plan contratado, monto, comisión y factura por cliente.',roles:['owner','admin','management','sales']},
 {id:'billing.view',label:'Cobranza y facturas',description:'Ver mora, facturas y cobros.',roles:['owner','admin','management','finance','sales']},
 {id:'permissions.manage',label:'Gestionar permisos',description:'Permisos de roles y personas dentro de la jerarquía autorizada.',roles:['owner','admin','management']},
 {id:'finance.balance.view',label:'Ver Balance',description:'Balance financiero y patrimonio de la empresa.',roles:['owner','admin','finance']},
 {id:'finance.view',label:'Saldos y previsión',description:'Saldos, dashboard financiero y previsión mensual.',roles:['owner','admin','finance']},
 {id:'accounts.manage',label:'Cuentas y custodios',description:'Cuentas bancarias y custodios.',roles:['owner','admin','finance']},
 {id:'invoices.manage',label:'Facturas',description:'Crear y editar facturas.',roles:['owner','admin','management','finance','sales']},
 {id:'payments.manage',label:'Cobros y pagos',description:'Registrar cobros y pagos.',roles:['owner','admin','finance']},
 {id:'transfers.manage',label:'Transferencias',description:'Registrar transferencias entre cuentas.',roles:['owner','admin','finance']},
 {id:'commissions.manage',label:'Comisiones y referidos',description:'Comisiones, referidos y descuentos.',roles:['owner','admin','finance']},
 {id:'reports.view',label:'Informes',description:'Informes mensuales y evolución.',roles:['owner','admin','finance','sales']},
 {id:'expenses.manage',label:'Gastos planificados',description:'Gastos fijos y variables mensuales.',roles:['owner','admin','finance']},
 {id:'inventory.view',label:'Ver inventario',description:'Equipos, categorías y reservas.',roles:all},
 {id:'inventory.manage',label:'Gestionar inventario',description:'Equipos, categorías y ubicaciones.',roles:['owner','admin','management','production','finance','collaborator']},
 {id:'inventory.book',label:'Reservar equipos',description:'Crear y editar reservas de equipos.',roles:['owner','admin','management','production','collaborator']},
 {id:'studio.manage',label:'Estudio',description:'Espacios y reservas del estudio.',roles:['owner','admin','management','sales','production','collaborator']},
 {id:'portal-access.manage',label:'Accesos del portal',description:'Invitar y revocar clientes del portal.',roles:['owner','admin','management','production']},
 {id:'portal.manage',label:'Portal del cliente',description:'Publicar entregas y gestionar revisiones.',roles:['owner','admin','management','production','collaborator']},
 {id:'salary.view',label:'Ver salarios',description:'Salarios y ajustes mensuales del equipo.',roles:['owner','admin','finance']},
 {id:'privacy.manage',label:'Protección de datos',description:'Consentimientos, solicitudes de derechos, export y retención.',roles:['owner','admin']},
];
// Management operates agency business, while salaries and Balance stay protected.
for(const capability of CAPABILITIES)if(!['salary.view','finance.balance.view'].includes(capability.id)&&!capability.roles.includes('management'))capability.roles.push('management');
const byId=new Map(CAPABILITIES.map(capability=>[capability.id,capability]));
const protectedManagement=new Set(['salary.view','finance.balance.view']);
const lowerRoles=user=>user?.role==='owner'?roles.filter(role=>role!=='owner'):user?.role==='admin'?roles.filter(role=>!['owner','admin'].includes(role)):user?.role==='management'?roles.filter(role=>!['owner','admin','management'].includes(role)):[];
export function roleCan(user,capability){
 if(!user)return false;
 if(user.role==='management'&&protectedManagement.has(capability))return false;
 const definition=byId.get(capability);if(!definition)return false;
 if(user.role==='owner')return true;
 const override=user.capabilities?.[capability];
 return override===undefined?definition.roles.includes(user.role):Boolean(override);
}
/** One loader for browser sessions, MCP and canonical access mutation guards. */
export async function loadActorPermissions(db,user){
 const roleRows=(await db.query('select capability,allowed from agency_role_permissions where organization_id=$1 and role=$2',[user.organization_id,user.role])).rows;
 const memberRows=(await db.query('select capability,allowed from agency_member_permissions where organization_id=$1 and user_id=$2',[user.organization_id,user.id])).rows;
 return Object.fromEntries([...roleRows,...memberRows].map(row=>[row.capability,row.allowed]));
}
const manageableAccessRoles=user=>user?.role==='owner'?[...roles]:user?.role==='admin'?roles.filter(role=>role!=='owner'):lowerRoles(user);
export function accessEditable(actor,target){return String(actor?.id)!==String(target?.user_id??target?.id)&&manageableAccessRoles(actor).includes(target?.role)&&roleCan(actor,'members.manage');}
export function permissionsEditable(actor,target){return String(actor?.id)!==String(target?.user_id??target?.id)&&lowerRoles(actor).includes(target?.role)&&roleCan(actor,'permissions.manage');}
const roleRowsToMap=(rows,role)=>Object.fromEntries(rows.filter(row=>row.role===role).map(row=>[row.capability,row.allowed]));
function canAssignRoleWithRows(actor,role,rows){
 if(!manageableAccessRoles(actor).includes(role))return false;
 const target={role,capabilities:roleRowsToMap(rows,role)};
 return CAPABILITIES.every(capability=>!roleCan(target,capability.id)||roleCan(actor,capability.id));
}
export async function permissionPolicy(db,user){
 const rows=(await db.query('select role,capability,allowed from agency_role_permissions where organization_id=$1',[user.organization_id])).rows;
 const visibleRoles=lowerRoles(user);
 return {canManageRoles:visibleRoles.length>0&&roleCan(user,'permissions.manage'),canResetRoles:user.role==='owner'&&roleCan(user,'permissions.manage'),canManageMembers:visibleRoles.length>0&&roleCan(user,'members.manage'),visibleRoles,permissionRoles:visibleRoles,editableRoles:manageableAccessRoles(user).filter(role=>canAssignRoleWithRows(user,role,rows)),grantableCapabilities:CAPABILITIES.filter(cap=>roleCan(user,cap.id)).map(cap=>cap.id),canViewSalary:roleCan(user,'salary.view'),canViewBalance:roleCan(user,'finance.balance.view')};
}
export async function assertAssignableRole(db,actor,role){
 const rows=(await db.query('select role,capability,allowed from agency_role_permissions where organization_id=$1',[actor.organization_id])).rows;
 if(!canAssignRoleWithRows(actor,role,rows))fail('No podés asignar un rol con permisos superiores a los tuyos.',403);
}
export async function refreshPermissionActor(db,user){
 const current=(await db.query('select role,active,removed_at from organization_members where organization_id=$1 and user_id=$2',[user.organization_id,user.id])).rows[0];
 if(!current?.active||current.removed_at)fail('Tu acceso a esta empresa cambió. Volvé a ingresar.',403);
 const actor={...user,role:current.role};actor.capabilities=await loadActorPermissions(db,actor);return actor;
}
export function permissionMatrix(overrides,visibleRoles=roles.filter(role=>role!=='owner'),visibleCapabilities=CAPABILITIES.map(cap=>cap.id)){
 const rows=(overrides||[]).reduce((map,row)=>{map[`${row.role}:${row.capability}`]=row.allowed;return map;},{});
 return CAPABILITIES.filter(cap=>visibleCapabilities.includes(cap.id)).map(capability=>({id:capability.id,label:capability.label,description:capability.description,defaults:capability.roles.filter(role=>visibleRoles.includes(role)),overrides:Object.fromEntries(visibleRoles.map(role=>[role,rows[`${role}:${capability.id}`]??null]))}));
}
async function rolePermissionResult(db,user){
 const policy=await permissionPolicy(db,user),rows=(await db.query('select role,capability,allowed,updated_at from agency_role_permissions where organization_id=$1 order by role,capability',[user.organization_id])).rows;
 return {roles:policy.visibleRoles,capabilities:permissionMatrix(rows,policy.visibleRoles,user.role==='management'?policy.grantableCapabilities:undefined),policy};
}
const validObject=input=>input&&typeof input==='object'&&!Array.isArray(input);
export async function rolePermissions({req,res,url,db,session,body,send}){
 const memberMatch=url.pathname.match(/^\/api\/agency\/members\/([1-9]\d{0,18})\/permissions$/);
 if(url.pathname!=='/api/agency/permissions'&&!memberMatch)return false;
 let client;
 try{
  let user=await session(req);if(!user)fail('No autenticado',401);
  if(!lowerRoles(user).length||!roleCan(user,'permissions.manage'))fail('Tu rol no permite gestionar permisos',403);
  if(!['GET','PATCH'].includes(req.method))fail('Método no permitido',405);
  if(memberMatch&&String(memberMatch[1])===String(user.id))fail('No podés cambiar ni consultar tus permisos desde el editor de accesos.',403);
  client=await db.connect();await client.query('begin');
  if(req.method==='PATCH')await client.query('select id from organizations where id=$1 for update',[user.organization_id]);
  user=await refreshPermissionActor(client,user);
  if(!lowerRoles(user).length||!roleCan(user,'permissions.manage'))fail('Tu rol no permite gestionar permisos',403);
  await client.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(user.id),req.socket?.remoteAddress||'']);
  let target;
  if(memberMatch){
   target=(await client.query('select user_id,role,active,removed_at from organization_members where organization_id=$1 and user_id=$2 and removed_at is null'+(req.method==='PATCH'?' for update':''),[user.organization_id,memberMatch[1]])).rows[0];
   if(!target)fail('Integrante no encontrado',404);
   if(!permissionsEditable(user,target))fail('Solo podés gestionar permisos de integrantes con un rol inferior.',403);
  }
  if(req.method==='PATCH'){
   const input=await body(req),keys=Object.keys(input||{}),allowed=input?.allowed;
   if(!validObject(input)||keys.some(key=>!(memberMatch?['capability','allowed']:['capability','role','allowed']).includes(key))||!Object.hasOwn(input,'allowed')||allowed!==null&&typeof allowed!=='boolean')fail('Campos de permiso inválidos');
   const capability=input.capability??null,role=input.role??null;
   if(capability!==null&&(typeof capability!=='string'||!byId.has(capability)))fail('Capacidad inválida');
   if(memberMatch){
    if(!capability)fail('Indicá la capacidad para aplicar un permiso');
    if(!roleCan(user,capability))fail('No podés gestionar una capacidad que no tenés.',403);
    if(allowed===null)await client.query('delete from agency_member_permissions where organization_id=$1 and user_id=$2 and capability=$3',[user.organization_id,target.user_id,capability]);
    else await client.query('insert into agency_member_permissions(organization_id,user_id,capability,allowed,updated_by_user_id) values($1,$2,$3,$4,$5) on conflict(organization_id,user_id,capability) do update set allowed=excluded.allowed,updated_by_user_id=excluded.updated_by_user_id,updated_at=now()',[user.organization_id,target.user_id,capability,allowed,user.id]);
   }else{
    if(role!==null&&(typeof role!=='string'||!roles.includes(role)||role==='owner'))fail('Rol inválido');
    if(user.role!=='owner'&&(!role||!capability))fail('Indicá un rol inferior y una capacidad; solo el dueño puede restablecer permisos en conjunto.',403);
    if(role&&!lowerRoles(user).includes(role))fail('Solo podés gestionar permisos de roles inferiores.',403);
    if(capability&&!roleCan(user,capability))fail('No podés gestionar una capacidad que no tenés.',403);
    if(allowed===null){
     if(capability===null)await client.query('delete from agency_role_permissions where organization_id=$1',[user.organization_id]);
     else if(role===null)await client.query('delete from agency_role_permissions where organization_id=$1 and capability=$2',[user.organization_id,capability]);
     else await client.query('delete from agency_role_permissions where organization_id=$1 and role=$2 and capability=$3',[user.organization_id,role,capability]);
    }else{
     if(!capability||!role)fail('Indicá el rol y la capacidad para aplicar un permiso');
     await client.query('insert into agency_role_permissions(organization_id,role,capability,allowed,updated_by_user_id) values($1,$2,$3,$4,$5) on conflict(organization_id,role,capability) do update set allowed=excluded.allowed,updated_by_user_id=excluded.updated_by_user_id,updated_at=now()',[user.organization_id,role,capability,allowed,user.id]);
    }
   }
  }
  let result;
  if(memberMatch){
   const policy=await permissionPolicy(client,user),roleRows=(await client.query('select capability,allowed from agency_role_permissions where organization_id=$1 and role=$2',[user.organization_id,target.role])).rows;
   const memberRows=(await client.query('select capability,allowed from agency_member_permissions where organization_id=$1 and user_id=$2',[user.organization_id,target.user_id])).rows;
   const defaults=Object.fromEntries(roleRows.map(row=>[row.capability,row.allowed])),overrides=Object.fromEntries(memberRows.map(row=>[row.capability,row.allowed]));
   result={member:{id:target.user_id,role:target.role},capabilities:CAPABILITIES.filter(cap=>user.role!=='management'||policy.grantableCapabilities.includes(cap.id)).map(cap=>({id:cap.id,label:cap.label,description:cap.description,defaultAllowed:roleCan({role:target.role,capabilities:defaults},cap.id),override:overrides[cap.id]??null,effectiveAllowed:roleCan({role:target.role,capabilities:{...defaults,...overrides}},cap.id),canGrant:roleCan(user,cap.id)})),policy};
  }else result=await rolePermissionResult(client,user);
  await client.query('commit');send(res,200,result);return true;
 }catch(error){if(client)await client.query('rollback');send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la operación de permisos.'});return true;}
 finally{client?.release();}
}
