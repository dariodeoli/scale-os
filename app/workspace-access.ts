import {canSeeTrash, effectiveCapability, roleCan, type Capability} from './capabilities';

/**
 * Módulo del NAV → capacidad del API. Los defaults viven en `capabilities.ts`
 * (espejo de `permissions.js`): acá solo se decide qué entrada se dibuja, y el
 * servidor sigue revalidando cada petición.
 */
export const MODULE_CAPABILITIES: Record<string, Capability> = {
  Actividad: 'activity.view',
  Configuración: 'settings.manage',
  Invitaciones: 'members.manage',
  Finanzas: 'finance.view',
  Pagos: 'payments.manage',
  Comisiones: 'commissions.manage',
  'Roles y permisos': 'settings.manage',
  Previsión: 'finance.view',
  Balance: 'finance.view',
  Informes: 'reports.view',
  Pipeline: 'commercial.manage',
  Mora: 'billing.view',
  Planes: 'budgets.manage',
  Presupuestos: 'budgets.manage',
  Contratos: 'contracts.view',
  Estudio: 'inventory.view',
  Métricas: 'metrics.view',
};

/** Leaf permissions do not expand when menu entries are grouped. Server checks remain authoritative. */
export const visibleModule = (label: string, role: string, overrides?:Record<string,boolean>) => {
  if (label === 'Colaboradores') return false;
  if (label === 'Admin') return false;
  // El historial propio lo entrega el API a cualquier rol; el del equipo suma
  // `work-orders.manage`, que el componente ya consulta para el alcance.
  if (label === 'Historial de trabajo') return true;
  // La papelera se muestra si el rol puede archivar al menos un tipo; el API
  // filtra qué tipos devuelve.
  if (label === 'Papelera') return canSeeTrash(role);
  // Printing operators need their own route, independent of company settings.
  // The API also hard-denies viewer, including explicit role overrides.
  if(label==='Impresión 80 mm')return role!=='viewer'&&(
    effectiveCapability(role,'printing.print',overrides)||effectiveCapability(role,'printing.manage',overrides)
  );
  const capability = MODULE_CAPABILITIES[label];
  if(role!=='owner'&&capability&&overrides&&Object.hasOwn(overrides,capability))return overrides[capability];
  return capability ? roleCan(role, capability) : true;
};
