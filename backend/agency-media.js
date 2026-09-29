import crypto from 'node:crypto';

// Medios de identidad (#108): las fotos y logos guardados como `data:` viajan en
// los listados y multiplican el payload (una foto por persona/cliente en cada
// lectura). Este endpoint las sirve una sola vez, con ETag y caché privada, y
// los listados devuelven la URL interna en vez del base64.
//
// La URL es interna (`/core-api/...`): el front la dibuja en un `<img>` del
// mismo origen, la cachea el navegador y deja de repetirse en cada pantalla.
// Los enlaces externos (https) se conservan tal cual.

/** Ruta interna del medio; el `v` cambia con el contenido para cachear sin riesgo. */
export function mediaUrl(kind, id, value) {
  const version = crypto.createHash('sha1').update(String(value ?? '')).digest('hex').slice(0, 10);
  return `/core-api/api/agency/media/${kind}/${encodeURIComponent(String(id))}?v=${version}`;
}

/** Convierte un `data:` en URL del medio; deja intactos los enlaces externos. */
export function mediaPhoto(kind, id, value) {
  const photo = typeof value === 'string' ? value.trim() : '';
  // Sólo formatos servibles por el endpoint y con id numérico: el resto se conserva.
  if (!photo || !/^data:image\/(?:png|jpeg|webp);base64,/.test(photo) || !/^\d+$/.test(String(id))) return photo || null;
  return mediaUrl(kind, id, photo);
}

/** Aplica el mapeo a un arreglo JSON de personas (`{id, photo_url, ...}`). */
export function mediaPeople(value) {
  if (!Array.isArray(value)) return value;
  return value.map(person => person && typeof person === 'object'
    ? {...person, photo_url: mediaPhoto('person', person.id, person.photo_url)}
    : person);
}

const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const MIME = {png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp'};

/** `GET /api/agency/media/:kind/:id` — bytes del medio con caché privada. */
export async function agencyMedia({req,res,url,db,session}) {
  const match = url.pathname.match(/^\/api\/agency\/media\/(person|collaborator|client)\/(\d+)$/);
  if (!match) return false;
  const fail = (status, message) => { res.writeHead(status, {'Content-Type': 'application/json'}); res.end(JSON.stringify({error: message})); return true; };
  if (req.method !== 'GET') return fail(405, 'Método no permitido');
  const user = await session(req);
  if (!user) return fail(401, 'No autenticado');
  const [, kind, rawId] = match;
  const id = String(BigInt(rawId));
  const row = kind === 'client'
    ? (await db.query('select logo_url from agency_clients where id=$1 and organization_id=$2', [id, user.organization_id])).rows[0]
    : kind === 'collaborator'
      ? (await db.query('select photo_url from agency_collaborators where id=$1 and organization_id=$2', [id, user.organization_id])).rows[0]
      : (await db.query('select photo_url from organization_person_identity where user_id=$1 and organization_id=$2', [id, user.organization_id])).rows[0];
  const stored = typeof row?.logo_url === 'string' ? row.logo_url : typeof row?.photo_url === 'string' ? row.photo_url : null;
  if (!stored) return fail(404, 'El medio no existe');
  const data = stored.match(DATA_IMAGE);
  if (!data) {
    // Enlace externo guardado: se redirige para no duplicar el binario.
    res.writeHead(302, {'Location': stored, 'Cache-Control': 'private, max-age=300'});
    res.end();
    return true;
  }
  const bytes = Buffer.from(data[2], 'base64');
  const etag = `"${crypto.createHash('sha1').update(bytes).digest('hex')}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, {'ETag': etag, 'Cache-Control': 'private, max-age=86400, immutable'});
    res.end();
    return true;
  }
  res.writeHead(200, {
    'Content-Type': MIME[data[1]],
    'Content-Length': bytes.length,
    'Cache-Control': 'private, max-age=86400, immutable',
    'ETag': etag,
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(bytes);
  return true;
}
