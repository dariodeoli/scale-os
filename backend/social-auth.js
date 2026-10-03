import crypto from 'node:crypto';

// SSO Fase 1 (#159): registro de proveedores sociales, PKCE/nonce, canje de
// código y vinculación de identidades por correo verificado. Google sigue con
// su ruta histórica; Microsoft y Apple usan este módulo.
export const SOCIAL_PROVIDERS = ['google', 'microsoft', 'apple'];

const fail = (message, status = 400, code = '') => { throw Object.assign(Error(message), {status, code}); };
const b64url = value => Buffer.from(value).toString('base64url');

/** Configuración por proveedor desde entorno (null si falta lo imprescindible). */
export function socialProviderConfig(provider, env = process.env) {
  if (provider === 'google') {
    return env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri: env.GOOGLE_REDIRECT_URI || 'https://admin.scaleparaguay.com/api/auth/google/callback'}
      : null;
  }
  if (provider === 'microsoft') {
    return env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET
      ? {clientId: env.MICROSOFT_CLIENT_ID, clientSecret: env.MICROSOFT_CLIENT_SECRET, tenant: env.MICROSOFT_TENANT_ID || 'common', redirectUri: env.MICROSOFT_REDIRECT_URI || 'https://admin.scaleparaguay.com/api/auth/microsoft/callback'}
      : null;
  }
  if (provider === 'apple') {
    return env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY
      ? {clientId: env.APPLE_CLIENT_ID, teamId: env.APPLE_TEAM_ID, keyId: env.APPLE_KEY_ID, privateKey: env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), redirectUri: env.APPLE_REDIRECT_URI || 'https://admin.scaleparaguay.com/api/auth/apple/callback'}
      : null;
  }
  return null;
}

/** Estado público para `/api/auth/providers` (nunca expone secretos). */
export function socialProvidersStatus(env = process.env) {
  return Object.fromEntries(SOCIAL_PROVIDERS.map(provider => [provider, Boolean(socialProviderConfig(provider, env))]));
}

/** PKCE S256: verifier random + challenge para el authorize. */
export function pkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  return {verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url')};
}

export function pkceChallenge(verifier) {
  return crypto.createHash('sha256').update(String(verifier)).digest('base64url');
}

/** URL de autorización con state, nonce y PKCE. */
export function socialAuthorizeUrl(provider, {state, redirectUri, codeChallenge, nonce}, env = process.env) {
  const config = socialProviderConfig(provider, env);
  if (!config) fail('Proveedor no configurado', 503, 'PROVIDER_UNAVAILABLE');
  if (provider === 'microsoft') {
    const params = new URLSearchParams({client_id: config.clientId, response_type: 'code', redirect_uri: redirectUri, response_mode: 'query', scope: 'openid email profile', state, code_challenge: codeChallenge, code_challenge_method: 'S256', nonce, prompt: 'select_account'});
    return `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/authorize?${params}`;
  }
  if (provider === 'apple') {
    const params = new URLSearchParams({client_id: config.clientId, response_type: 'code', redirect_uri: redirectUri, response_mode: 'form_post', scope: 'name email', state, code_challenge: codeChallenge, code_challenge_method: 'S256', nonce});
    return `https://appleid.apple.com/auth/authorize?${params}`;
  }
  fail('Proveedor sin authorize propio', 400, 'PROVIDER_UNAVAILABLE');
}

/**
 * Client secret de Apple: JWT ES256 firmado con la clave privada .p8
 * (`iss`=Team ID, `sub`=Service ID, `aud`=Apple, 5 minutos de vida).
 */
export function appleClientSecret({clientId, teamId, keyId, privateKey}, now = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({alg: 'ES256', kid: keyId, typ: 'JWT'}));
  const payload = b64url(JSON.stringify({iss: teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: clientId}));
  const data = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(data), {key: privateKey, dsaEncoding: 'ieee-p1363'}).toString('base64url');
  return `${data}.${signature}`;
}

/** Payload de un id_token (se usa solo con tokens recibidos por TLS directo del proveedor). */
export function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !parts[1]) fail('El proveedor devolvió un token inválido.', 401, 'TOKEN_INVALIDO');
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    fail('El proveedor devolvió un token inválido.', 401, 'TOKEN_INVALIDO');
  }
}

async function postForm(fetchImpl, url, fields) {
  const response = await fetchImpl(url, {method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}, body: new URLSearchParams(fields)});
  if (!response.ok) fail('No se pudo validar el acceso con el proveedor.', 401, 'TOKEN_RECHAZADO');
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object') fail('El proveedor no devolvió una respuesta válida.', 502, 'RESPUESTA_INVALIDA');
  return data;
}

async function getJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, {headers});
  if (!response.ok) fail('No se pudo obtener el perfil del proveedor.', 502, 'PERFIL_INVALIDO');
  const data = await response.json().catch(() => null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('El proveedor no devolvió un perfil válido.', 502, 'PERFIL_INVALIDO');
  return data;
}

/**
 * Canjea el código y devuelve `{subject,email,emailVerified,name,picture}`.
 * Microsoft: el correo del userinfo OIDC se considera verificado por el IdP.
 * Apple: email_verified del id_token es obligatorio.
 */
export async function exchangeSocialCode(provider, {code, redirectUri, codeVerifier, nonce, fetchImpl = fetch, env = process.env} = {}) {
  const config = socialProviderConfig(provider, env);
  if (!config) fail('Proveedor no configurado', 503, 'PROVIDER_UNAVAILABLE');
  if (!code) fail('El proveedor no devolvió un código de acceso.', 400, 'CODIGO_AUSENTE');
  if (provider === 'microsoft') {
    const token = await postForm(fetchImpl, `https://login.microsoftonline.com/${config.tenant}/oauth2/v2.0/token`, {client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: codeVerifier});
    if (typeof token.access_token !== 'string' || !token.access_token) fail('Microsoft no devolvió un acceso válido.', 502, 'ACCESO_INVALIDO');
    const profile = await getJson(fetchImpl, 'https://graph.microsoft.com/oidc/userinfo', {Authorization: `Bearer ${token.access_token}`});
    const email = String(profile.email || profile.preferred_username || '').trim().toLowerCase();
    if (!profile.sub || !email) fail('Microsoft no confirmó un correo.', 401, 'CORREO_NO_VERIFICADO');
    return {subject: String(profile.sub), email, emailVerified: true, name: String(profile.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120), picture: null};
  }
  if (provider === 'apple') {
    const clientSecret = appleClientSecret({clientId: config.clientId, teamId: config.teamId, keyId: config.keyId, privateKey: config.privateKey});
    const token = await postForm(fetchImpl, 'https://appleid.apple.com/auth/token', {client_id: config.clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: codeVerifier});
    const payload = decodeJwtPayload(token.id_token);
    if (payload.iss !== 'https://appleid.apple.com' || payload.aud !== config.clientId || !(Number(payload.exp) * 1000 > Date.now())) fail('Apple devolvió un token inválido.', 401, 'TOKEN_INVALIDO');
    if (nonce && payload.nonce && payload.nonce !== nonce) fail('El nonce de Apple no coincide.', 401, 'NONCE_INVALIDO');
    const email = String(payload.email || '').trim().toLowerCase();
    const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
    if (!payload.sub || !email || !emailVerified) fail('Apple no confirmó un correo verificado.', 401, 'CORREO_NO_VERIFICADO');
    return {subject: String(payload.sub), email, emailVerified: true, name: '', picture: null};
  }
  fail('Proveedor desconocido', 400, 'PROVIDER_DESCONOCIDO');
}

/**
 * Resuelve la identidad: (1) subject ya vinculado; (2) correo verificado que
 * coincide con un usuario existente → crea el vínculo. Sin usuario, null.
 */
export async function resolveSocialIdentity(db, {provider, subject, email, emailVerified}) {
  if (!provider || !subject) fail('Identidad social inválida', 400, 'IDENTIDAD_INVALIDA');
  const linked = (await db.query('select user_id from user_social_identities where provider=$1 and subject=$2', [provider, subject])).rows[0];
  if (linked) {
    await db.query('update user_social_identities set last_login_at=now() where provider=$1 and subject=$2', [provider, subject]);
    return {userId: linked.user_id, linkedExisting: true};
  }
  if (!emailVerified || !email) return null;
  const user = (await db.query('select id from users where lower(email)=lower($1)', [email])).rows[0];
  if (!user) return null;
  const saved = (await db.query(`insert into user_social_identities(user_id,provider,subject,email_at_link,last_login_at)
    values($1,$2,$3,$4,now()) on conflict(provider,subject) do update set last_login_at=now()
    returning user_id`, [user.id, provider, subject, email])).rows[0];
  return {userId: saved.user_id, linkedExisting: true, linkedNow: String(saved.user_id) === String(user.id)};
}
