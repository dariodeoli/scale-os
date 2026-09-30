import {roleCan} from './permissions.js';

// Minimización de contacto del cliente (Ley 7593/2025, Refs #114): correo,
// teléfono, enlaces de contacto y datos fiscales solo viajan a los roles que
// gestionan clientes (`clients.manage`). El resto recibe la ficha operativa
// para proyectos y piezas con `contact_restricted:true`, de modo que la
// interfaz muestre un estado honesto ("contacto reservado") en lugar de un
// vacío que parezca un dato faltante.
const restrictedFields = ['email', 'phone', 'tax_id', 'legal_name', 'notes', 'social_links', 'ruc_legal_name', 'ruc_tax_state', 'ruc_source'];

/** Copia la fila con los campos de contacto en null si el rol no los necesita. */
export function redactClientContact(row, user) {
  if (!row || roleCan(user, 'clients.manage')) return row;
  const out = {...row, contact_restricted: true};
  for (const field of restrictedFields) if (field in out) out[field] = null;
  return out;
}

/** Aplica la minimización a una lista de clientes. */
export function redactClientContactRows(rows, user) {
  return Array.isArray(rows) ? rows.map(row => redactClientContact(row, user)) : rows;
}
