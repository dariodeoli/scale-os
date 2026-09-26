// Capa de datos del directorio de clientes (SOS-COM, campaña #41/#43).
// Lógica pura y tipos locales; la vista y el fetch viven en los componentes.
// Los campos disponibles del API se listan en el spec de #43 (§1.2): acá se
// declaran tal cual (los internos —organization_id, reporting_version— quedan fuera).
import { clientState } from "./client-status";

/** Campos que la fila/cuadrícula pinta hoy; el resto del endpoint es opcional. */
export type DirectoryClient = {
  active: boolean;
  email: string | null;
  lifecycle_status?: string;
  name: string;
  phone: string | null;
};

/**
 * Campos reales de `GET /api/agency/clients` (fila `agency_clients.*` +
 * `has_recurring_price`) que el rediseño v2 muestra y hoy no se pintan en la
 * lista. Tipos locales hasta que el rediseño migre la vista.
 */
export type DirectoryClientRecord = {
  id: string | number;
  name: string;
  legal_name?: string | null;
  email: string | null;
  phone: string | null;
  tax_id?: string | null;
  active: boolean;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  lifecycle_status?: string;
  logo_url?: string | null;
  color_key?: string | null;
  social_links?: { website?: string; instagram?: string; whatsapp?: string; other?: { label: string; url: string }[] } | null;
  customer_kind?: 'unknown' | 'company' | 'professional' | 'individual' | 'other' | null;
  service_plan_id?: string | number | null;
  relationship_started_on?: string | null;
  has_recurring_price?: boolean;
  ruc_legal_name?: string | null;
  ruc_tax_state?: string | null;
  ruc_source?: string | null;
  ruc_refreshed_at?: string | null;
};

// Guarda de entrada (issue #65): un campo `null`/`undefined` del API se
// normaliza a texto vacío en vez de tirar `normalize` sobre undefined.
export const normalizeSearch = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");

export function filterClientDirectory<T extends DirectoryClient>(
  clients: readonly T[],
  query: string,
  lifecycleStatus: string,
): T[] {
  const term = normalizeSearch(query);

  return clients.filter((client) => {
    if (lifecycleStatus && clientState(client).value !== lifecycleStatus)
      return false;
    if (!term) return true;

    return [client.name, client.email, client.phone]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeSearch(value).includes(term));
  });
}

/** “Mostrando N clientes de M clientes”, con singular/plural real. */
export function directorySummaryText(resultCount: number, totalCount: number): string {
  const clientLabel = resultCount === 1 ? "cliente" : "clientes";
  const totalLabel = totalCount === 1 ? "cliente" : "clientes";
  return `Mostrando ${resultCount} ${clientLabel} de ${totalCount} ${totalLabel}`;
}
