import {visibleModule} from './workspace-access';

export type WorkspaceGuideIdentity = {
  userId?: string;
  organizationId?: string;
  role: string;
  demo?: boolean;
};
export type GuideRecord = 'clients' | 'projects' | 'orders';
/** Capture scope when loading starts, never relabel an old response with the current scope. */
export type WorkspaceGuideData = {
  scope: string | null;
  status: 'unknown' | 'loading' | 'error' | 'ready';
  counts?: Partial<Record<GuideRecord, number>>;
};
export function workspaceGuideScope({userId,organizationId,role,demo=false}: WorkspaceGuideIdentity) {
  return userId && organizationId ? JSON.stringify([userId,organizationId,role,demo]) : null;
}
export function workspaceGuideStorageKey(scope: string | null) {
  return scope ? `scale:workspace-guide:v1:${scope}` : null;
}

type StepDefinition = {module: string; title: string; description: string; record?: GuideRecord; canCreate?: boolean};
export type WorkspaceGuideStep = StepDefinition & {
  state: 'available' | 'unknown' | 'loading' | 'error' | 'empty' | 'present';
  statusLabel: string;
};

export function workspaceGuideSteps(identity: WorkspaceGuideIdentity, data?: WorkspaceGuideData): WorkspaceGuideStep[] {
  const {role,demo=false}=identity;
  const scope=workspaceGuideScope(identity);
  const setup=['owner','admin'].includes(role);
  const clients=['owner','admin','management','sales'].includes(role);
  const production=['owner','admin','management','production'].includes(role);
  const steps: StepDefinition[]=[];
  if(setup) steps.push(
    {module:'Configuración',title:'Tu empresa',description:'Revisá los datos que aparecerán en tus presupuestos.'},
    {module:'Invitaciones',title:'Accesos del equipo',description:demo?'Explorá cómo funcionan los accesos. La demo no crea invitaciones externas.':'Invitá al equipo y elegí sus permisos desde Invitaciones.'},
  );
  if(clients || role==='viewer') steps.push({module:'Clientes',title:clients?'Tu primer cliente':'Consultar clientes',description:clients?'Agregá un cliente o revisá sus datos antes de crear trabajo.':'Consultá los clientes disponibles para tu rol.',record:'clients',canCreate:clients});
  if(production || role==='viewer') steps.push({module:'Proyectos',title:production?'Organizar un proyecto':'Consultar proyectos',description:production?'Con un cliente creado, definí un proyecto, su carpeta de Drive y las aprobaciones.':'Consultá los proyectos y sus enlaces de trabajo.',record:'projects',canCreate:production});
  if(production || ['editor','viewer'].includes(role)) steps.push({module:'Producción',title:production?'Tu primera pieza':role==='editor'?'Tu trabajo asignado':'Consultar producción',description:production?'Con un proyecto creado, agregá una orden con responsable y fecha de entrega.':role==='editor'?'Elegí Trabajo diario para revisar tus piezas, checklist y comentarios.':'Abrí una pieza para consultar sus detalles y su estado.',record:'orders',canCreate:production});
  if(['owner','admin','management','finance','sales'].includes(role)) steps.push({module:'Presupuestos',title:'Preparar una propuesta',description:'Elegí un cliente, revisá los ítems y guardá un borrador. Compartirlo es una acción posterior.'});
  if(role==='sales') steps.push({module:'Pipeline',title:'Seguir oportunidades',description:'Revisá las oportunidades y su próxima acción.'});
  if(role==='finance') steps.push(
    {module:'Finanzas',title:'Revisar cuentas y movimientos',description:'Consultá las cuentas, facturas y cobros de la agencia.'},
    {module:'Informes',title:'Consultar resultados',description:'Revisá los informes y compará importes por moneda.'},
  );
  return steps.filter(step=>visibleModule(step.module,role)).map(step=>{
    if(!step.record) return {...step,state:'available',statusLabel:'Disponible'};
    if(!scope || !data || data.scope!==scope || data.status==='unknown') return {...step,state:'unknown',statusLabel:'Datos aún no disponibles'};
    if(data.status==='loading') return {...step,state:'loading',statusLabel:'Cargando datos…'};
    if(data.status==='error') return {...step,state:'error',statusLabel:'No se pudieron actualizar los datos'};
    const count=data.counts?.[step.record];
    if(count===undefined || !Number.isSafeInteger(count) || count<0) return {...step,state:'unknown',statusLabel:'Datos aún no disponibles'};
    return {...step,state:count===0?'empty':'present',statusLabel:demo?(count===0?'Sin registros de ejemplo':'Datos de ejemplo disponibles'):(count===0?'Sin registros todavía':'Registros disponibles')};
  });
}

/** Existing records are evidence of data, never evidence that a person completed a lesson. */
export function suggestedWorkspaceGuideStep(steps: WorkspaceGuideStep[]) {
  return steps.find(step=>step.canCreate && step.state==='empty') || steps[0];
}
