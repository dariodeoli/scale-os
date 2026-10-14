import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// «Mis datos» llamaba a /api/privacy/my-data, que el API no expone: el 404 dejaba
// la vista en «modo puente» para siempre. Ahora usa las rutas reales del titular.
const root = join(__dirname, '..');
const backend = readFileSync(join(root, 'backend/personal-data.js'), 'utf8');
const mePaths = JSON.parse((backend.match(/const mePaths=(\[[^\]]+\])/)?.[1] ?? '[]').replace(/'/g, '"')) as string[];
assert.ok(mePaths.length >= 4, 'se leen las rutas del titular del backend');

const storage = new Map<string, string>();
Object.assign(globalThis, {window: globalThis, localStorage: {getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => {storage.set(key, value);}, removeItem: (key: string) => {storage.delete(key);}}});
const calls: {url: string; method: string; body: unknown}[] = [];
const apiMe = {
  notice: {version: '2026-09-30-v1'},
  subject: {kind: 'user', id: '7', name: 'Titular'},
  // El API devuelve del más nuevo al más viejo.
  consents: [
    {id: '3', purpose: 'contact', notice_version: '2026-09-30-v1', source: 'self', granted_at: '2026-10-02T12:00:00.000Z', revoked_at: '2026-10-05T12:00:00.000Z', revoke_reason: 'Revocado por el titular'},
    {id: '2', purpose: 'service', notice_version: '2026-09-30-v1', source: 'registration', granted_at: '2026-10-01T12:00:00.000Z', revoked_at: null},
    {id: '1', purpose: 'account', notice_version: '2026-09-30-v1', source: 'registration', granted_at: '2026-10-01T12:00:00.000Z', revoked_at: null},
  ],
  requests: [{id: 9, request_type: 'rectification', status: 'in_review', details: 'Corregir apellido', resolution: null, rejection_reason: null, received_at: '2026-10-03T12:00:00.000Z', due_at: '2026-11-02T12:00:00.000Z', resolved_at: null, overdue: false, days_left: 19}],
  export: {path: '/api/privacy/me/export'},
};
(globalThis as {fetch: unknown}).fetch = async (input: string, init: RequestInit = {}) => {
  const method = init.method || 'GET', url = String(input);
  calls.push({url, method, body: init.body ? JSON.parse(String(init.body)) : null});
  const path = url.replace(/^\/core-api/, '').split('?')[0];
  if (!mePaths.includes(path)) return new Response(JSON.stringify({error: 'No encontrado'}), {status: 404});
  if (path === '/api/privacy/me' && method === 'GET') return Response.json(apiMe);
  if (path === '/api/privacy/me/requests' && method === 'POST') return Response.json({request: {id: 10, request_type: 'suppression', status: 'received', details: 'Todo', rejection_reason: null, received_at: '2026-10-14T12:00:00.000Z', due_at: '2026-11-13T12:00:00.000Z'}}, {status: 201});
  if (path === '/api/privacy/me/consents/revoke' && method === 'POST') return Response.json({ok: true, revoked: 2, purposes: ['service', 'billing']});
  return new Response('{}', {status: 405});
};

async function main() {
  const privacy = await import('../app/privacy-data');
  for (const key of ['myData', 'requests', 'revoke', 'export'] as const) assert.ok(mePaths.includes(privacy.PRIVACY_API_PATHS[key]), `${key} (${privacy.PRIVACY_API_PATHS[key]}) es una ruta real del API del titular`);
  assert.equal(privacy.PRIVACY_API_PATHS.myData, '/api/privacy/me');

  const data = await privacy.loadPrivacyData();
  assert.equal(calls[0].url, '/core-api/api/privacy/me', '«Mis datos» consulta la ruta real');
  assert.equal(data.source, 'api', 'con el API real la vista sale del modo puente');
  assert.equal(data.exportPath, '/api/privacy/me/export', 'la descarga apunta al export real');
  assert.deepEqual(data.consents.map(row => [row.finalidad, row.aceptado]), [['cuenta-y-prestacion', true], ['operacion-agencia', true], ['contacto-comercial', false]], 'consentimientos traducidos a las finalidades de la vista, en orden cronológico');
  assert.equal(data.consents[2].fecha, '2026-10-05T12:00:00.000Z', 'una revocación muestra su fecha');
  assert.deepEqual(data.requests, [{id: '9', tipo: 'rectificacion', estado: 'en_revision', created_at: '2026-10-03T12:00:00.000Z', due_at: '2026-11-02T12:00:00.000Z', detalle: 'Corregir apellido'}], 'solicitudes traducidas con estado y SLA');

  const request = await privacy.requestPrivacyAction('supresion', 'Todo');
  const posted = calls.at(-1)!;
  assert.deepEqual([posted.url, posted.method, posted.body], ['/core-api/api/privacy/me/requests', 'POST', {type: 'suppression', details: 'Todo'}], 'el pedido usa el contrato real del titular');
  assert.deepEqual([request.id, request.tipo, request.estado], ['10', 'supresion', 'recibida']);

  assert.equal(await privacy.revokePrivacyConsent('operacion-agencia', false), 'api', 'la revocación la confirma el servidor');
  const revoke = calls.at(-1)!;
  assert.equal(revoke.url, '/core-api/api/privacy/me/consents/revoke');
  assert.deepEqual((revoke.body as {purpose: unknown}).purpose, ['service', 'billing'], 'la finalidad de la vista se traduce a las del API');
  assert.equal(privacy.pendingPrivacyConsents().length, 0, 'con el API disponible no se encola nada en el dispositivo');
  assert.ok(!calls.some(call => call.url.includes('/my-data')), 'nunca se llama a la ruta inexistente /api/privacy/my-data');
  console.log('PASS: «Mis datos» usa /api/privacy/me, /me/requests, /me/consents/revoke y /me/export del API real y sale del modo puente');
}
void main().catch(error => { console.error(error); process.exit(1); });
