/**
 * Espejo del contrato de permisos del Core API para lo que la interfaz
 * renderiza. El API es la fuente autoritativa: `permissions.js` define
 * capacidad → roles por defecto y revalida cada petición; acá solo se decide
 * qué control se dibuja.
 *
 * Reglas del contrato:
 * - Un rol sin la capacidad no ve el control: se omite, nunca se deshabilita.
 * - El dueño conserva siempre todas las capacidades.
 * - Una empresa puede ajustar los defaults en Roles y permisos; cuando el API
 *   devuelve el flag efectivo (`can_manage`, `can_reserve`, `financeAllowed`)
 *   ese flag manda sobre este espejo.
 * - Los topes de lote son los máximos que acepta cada endpoint en una sola
 *   llamada; la interfaz los informa y no ofrece más de lo que el API acepta.
 */

export const CAPABILITY_ROLES = {
 'members.manage': ['owner','admin','management'],
 'settings.manage': ['owner','admin'],
 'activity.view': ['owner','admin'],
 'metrics.view': ['owner','admin'],
 'visitors.view': ['owner','admin'],
 'company.create': ['owner','admin'],
 'clients.manage': ['owner','admin','management','sales','finance','collaborator'],
 'projects.manage': ['owner','admin','management','sales','production','collaborator'],
 'projects.edit': ['owner','admin','management','production','collaborator'],
 'work-orders.manage': ['owner','admin','management','production','collaborator'],
 'work-orders.edit': ['owner','admin','management','production','editor','collaborator'],
 'assignees.manage': ['owner','admin','management','production','collaborator'],
 'work-checklists.view': ['owner','admin','management','production','editor','collaborator'],
 'checklists.edit': ['owner','admin','management','production','editor','collaborator'],
 'commercial.manage': ['owner','admin','management','finance','sales','collaborator'],
 'budgets.manage': ['owner','admin','management','finance','sales','production','collaborator'],
 'commercial-terms.manage': ['owner','admin','management','sales'],
 'billing.view': ['owner','admin','management','finance','sales'],
 'finance.view': ['owner','admin','finance'],
 'accounts.manage': ['owner','admin','finance'],
 'invoices.manage': ['owner','admin','management','finance','sales'],
 'payments.manage': ['owner','admin','finance'],
 'transfers.manage': ['owner','admin','finance'],
 'commissions.manage': ['owner','admin','finance'],
 'reports.view': ['owner','admin','finance','sales'],
 'expenses.manage': ['owner','admin','finance'],
 'inventory.view': ['owner','admin','management','finance','sales','production','editor','viewer','collaborator'],
 'inventory.manage': ['owner','admin','management','production','finance','collaborator'],
 'inventory.book': ['owner','admin','management','production','collaborator'],
 'studio.manage': ['owner','admin','management','sales','production','collaborator'],
 'portal.manage': ['owner','admin','management','production','collaborator'],
 'salary.view': ['owner','admin','finance'],
} as const;

export type Capability = keyof typeof CAPABILITY_ROLES;

export function roleCan(role: string | null | undefined, capability: Capability){
 if(!role) return false;
 if(role === 'owner') return true;
 const roles: readonly string[] | undefined = CAPABILITY_ROLES[capability];
 return roles ? roles.includes(role) : false;
}

/** Tipos de la papelera del API (`record-lifecycle.js`: archiveKinds) → capacidad que los habilita. */
export const ARCHIVE_KIND_CAPABILITIES={
 clients:'clients.manage',
 projects:'projects.edit',
 'work-orders':'work-orders.manage',
 leads:'commercial.manage',
 plans:'budgets.manage',
 budgets:'budgets.manage',
 inventory:'inventory.manage',
 collaborators:'members.manage',
 accounts:'accounts.manage',
} as const;

/** La papelera se ve si el rol puede archivar al menos un tipo; el API filtra los tipos. */
export function canSeeTrash(role: string | null | undefined){
 return (Object.values(ARCHIVE_KIND_CAPABILITIES) as Capability[]).some(capability => roleCan(role, capability));
}

/** El workspace completo de Equipo es para quienes gestionan personas o ven salarios. */
export function canOpenPeopleWorkspace(role: string | null | undefined){
 return roleCan(role, 'members.manage') || roleCan(role, 'salary.view');
}

/** Topes por llamada de los endpoints de lote del dominio. */
export const BATCH_LIMITS = {
 clients: 50,
 inventory: 50,
 projects: 50,
 reservationItems: 50,
 reservationResponsibles: 30,
 planner: 100,
} as const;

/** Recorta una selección al tope del endpoint y avisa si hubo que recortar. */
export function limitSelection(ids: readonly string[], limit: number){
 const unique = [...new Set(ids)];
 return {selection: unique.slice(0, limit), capped: unique.length > limit};
}
