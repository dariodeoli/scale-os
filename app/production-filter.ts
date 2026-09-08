type ProjectClient = { id: string | number; client_id: string | number };

/** Filter by stable IDs, never by client names (which can be duplicated). */
export function filterProductionOrders<T extends { project_id: string | number }>(
  orders: T[],
  projects: ProjectClient[],
  clientId: string,
): T[] {
  if (!clientId) return orders;
  const projectIds = new Set(
    projects.filter(project => String(project.client_id) === clientId).map(project => String(project.id)),
  );
  return orders.filter(order => projectIds.has(String(order.project_id)));
}
