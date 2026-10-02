// Fuente única de la Actividad legible (#143): traduce tabla + operación de
// `agency_operation_audit` a eventos de negocio («Factura emitida», «Pago
// recibido») y arma el contexto (cliente, referencia, importe) sin exponer
// estados crudos. El detalle técnico se conserva para escritorio.

export type ActivityRecord = {
 id?: unknown;
 table_name?: unknown;
 operation?: unknown;
 record_id?: unknown;
 reference?: unknown;
 subject?: unknown;
 client_name?: unknown;
 amount?: unknown;
 total?: unknown;
 currency?: unknown;
};

type EventCopy = Partial<Record<'INSERT' | 'UPDATE' | 'DELETE', string>>;

const EVENTS: Record<string, EventCopy> = {
 agency_clients: {INSERT: 'Cliente creado', UPDATE: 'Cliente actualizado', DELETE: 'Cliente archivado'},
 agency_archived_records: {INSERT: 'Registro archivado', UPDATE: 'Registro actualizado', DELETE: 'Registro restaurado'},
 agency_projects: {INSERT: 'Proyecto creado', UPDATE: 'Proyecto actualizado', DELETE: 'Proyecto archivado'},
 agency_work_orders: {INSERT: 'Pieza creada', UPDATE: 'Pieza actualizada', DELETE: 'Pieza archivada'},
 agency_order_comments: {INSERT: 'Comentario agregado', UPDATE: 'Comentario actualizado', DELETE: 'Comentario eliminado'},
 agency_project_comments: {INSERT: 'Comentario agregado', UPDATE: 'Comentario actualizado', DELETE: 'Comentario eliminado'},
 agency_work_checklists: {INSERT: 'Checklist creado', UPDATE: 'Checklist actualizado', DELETE: 'Checklist eliminado'},
 agency_work_checklist_items: {INSERT: 'Paso de checklist agregado', UPDATE: 'Paso de checklist actualizado', DELETE: 'Paso de checklist eliminado'},
 agency_budgets: {INSERT: 'Presupuesto creado', UPDATE: 'Presupuesto actualizado', DELETE: 'Presupuesto archivado'},
 agency_plans: {INSERT: 'Plan creado', UPDATE: 'Plan actualizado', DELETE: 'Plan archivado'},
 agency_leads: {INSERT: 'Oportunidad creada', UPDATE: 'Oportunidad actualizada', DELETE: 'Oportunidad eliminada'},
 agency_invoices: {INSERT: 'Factura emitida', UPDATE: 'Factura actualizada', DELETE: 'Factura eliminada'},
 agency_payments: {INSERT: 'Pago recibido', UPDATE: 'Pago actualizado', DELETE: 'Pago eliminado'},
 agency_payment_reversals: {INSERT: 'Pago revertido', UPDATE: 'Reversión actualizada', DELETE: 'Reversión eliminada'},
 agency_expenses: {INSERT: 'Gasto registrado', UPDATE: 'Gasto actualizado', DELETE: 'Gasto revertido'},
 agency_expense_reversals: {INSERT: 'Gasto revertido', UPDATE: 'Reversión de gasto actualizada', DELETE: 'Reversión de gasto eliminada'},
 agency_planned_expenses: {INSERT: 'Gasto planificado creado', UPDATE: 'Gasto planificado actualizado', DELETE: 'Gasto planificado eliminado'},
 bank_accounts: {INSERT: 'Cuenta creada', UPDATE: 'Cuenta actualizada', DELETE: 'Cuenta archivada'},
 account_transfers: {INSERT: 'Transferencia registrada', UPDATE: 'Transferencia actualizada', DELETE: 'Transferencia eliminada'},
 agency_payouts: {INSERT: 'Pago a colaborador registrado', UPDATE: 'Pago a colaborador actualizado', DELETE: 'Pago a colaborador eliminado'},
 agency_commissions: {INSERT: 'Comisión registrada', UPDATE: 'Comisión actualizada', DELETE: 'Comisión eliminada'},
 agency_collaborators: {INSERT: 'Ficha de equipo creada', UPDATE: 'Ficha de equipo actualizada', DELETE: 'Ficha de equipo archivada'},
 agency_job_roles: {INSERT: 'Cargo creado', UPDATE: 'Cargo actualizado', DELETE: 'Cargo eliminado'},
 organization_members: {INSERT: 'Acceso agregado', UPDATE: 'Acceso actualizado', DELETE: 'Acceso quitado'},
 agency_role_permissions: {INSERT: 'Permiso habilitado', UPDATE: 'Permiso actualizado', DELETE: 'Permiso restablecido'},
 agency_settings: {INSERT: 'Configuración actualizada', UPDATE: 'Configuración actualizada', DELETE: 'Configuración actualizada'},
 agency_exchange_rates: {INSERT: 'Cotización guardada', UPDATE: 'Cotización actualizada', DELETE: 'Cotización eliminada'},
 agency_inventory: {INSERT: 'Equipo agregado al inventario', UPDATE: 'Equipo de inventario actualizado', DELETE: 'Equipo archivado'},
 agency_inventory_categories: {INSERT: 'Categoría creada', UPDATE: 'Categoría actualizada', DELETE: 'Categoría eliminada'},
 agency_inventory_reservations: {INSERT: 'Reserva creada', UPDATE: 'Reserva actualizada', DELETE: 'Reserva cancelada'},
 agency_inventory_verifications: {INSERT: 'Equipo verificado', UPDATE: 'Verificación actualizada', DELETE: 'Verificación eliminada'},
 agency_inventory_maintenance: {INSERT: 'Mantenimiento registrado', UPDATE: 'Mantenimiento actualizado', DELETE: 'Mantenimiento eliminado'},
 agency_studio_spaces: {INSERT: 'Espacio creado', UPDATE: 'Espacio actualizado', DELETE: 'Espacio archivado'},
 agency_studio_reservations: {INSERT: 'Reserva de estudio creada', UPDATE: 'Reserva de estudio actualizada', DELETE: 'Reserva de estudio cancelada'},
 agency_client_commercial_terms: {INSERT: 'Plan del cliente acordado', UPDATE: 'Plan del cliente actualizado', DELETE: 'Plan del cliente finalizado'},
 agency_recurring_plans: {INSERT: 'Plan recurrente creado', UPDATE: 'Plan recurrente actualizado', DELETE: 'Plan recurrente eliminado'},
 agency_internal_tasks: {INSERT: 'Pendiente interno creado', UPDATE: 'Pendiente interno actualizado', DELETE: 'Pendiente interno eliminado'},
 agency_work_order_links: {INSERT: 'Enlace agregado a la pieza', UPDATE: 'Enlace actualizado', DELETE: 'Enlace eliminado'},
 agency_project_assignees: {INSERT: 'Responsable agregado al proyecto', UPDATE: 'Responsable actualizado', DELETE: 'Responsable quitado del proyecto'},
 agency_work_order_assignees: {INSERT: 'Responsable agregado a la pieza', UPDATE: 'Responsable actualizado', DELETE: 'Responsable quitado de la pieza'},
 client_portal_deliveries: {INSERT: 'Entrega publicada al cliente', UPDATE: 'Entrega actualizada', DELETE: 'Entrega retirada'},
 client_portal_delivery_decisions: {INSERT: 'El cliente respondió la entrega', UPDATE: 'Respuesta del cliente actualizada', DELETE: 'Respuesta del cliente eliminada'},
 agency_user_profiles: {INSERT: 'Perfil de usuario creado', UPDATE: 'Perfil de usuario actualizado', DELETE: 'Perfil de usuario eliminado'},
};

const VERBS: Record<string, string> = {INSERT: 'creado', UPDATE: 'actualizado', DELETE: 'eliminado'};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : value === null || value === undefined ? '' : String(value).trim());

/** Nombre humano de una tabla sin mapear: `agency_work_order_assignees` → `Work order assignees`. */
export function humanTable(table: string) {
 const clean = table.replace(/^agency_/, '').replace(/^client_portal_/, '').replace(/_/g, ' ').trim();
 return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Registro';
}

export function activityEvent(row: ActivityRecord) {
 const table = text(row.table_name);
 const operation = text(row.operation).toUpperCase();
 const label = EVENTS[table]?.[operation as 'INSERT' | 'UPDATE' | 'DELETE'] || `${humanTable(table)} ${VERBS[operation] || 'actualizado'}`;
 const record = text(row.record_id);
 const reference = text(row.reference);
 const subject = text(row.subject);
 const client = text(row.client_name);
 const amount = text(row.amount) || text(row.total);
 const currency = text(row.currency);
 return {
  label,
  client,
  subject,
  reference,
  amount,
  currency,
  record,
  // El detalle técnico viaja solo a escritorio (y siempre al tooltip).
  technical: [table.replace(/^agency_/, '').replace(/^client_portal_/, ''), operation, record ? `Registro ${record}` : ''].filter(Boolean).join(' · '),
 };
}
