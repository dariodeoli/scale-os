import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {PRIVACY_NOTICE, PRIVACY_NOTICE_PATH, PRIVACY_NOTICE_URL, PRIVACY_SECTIONS, PRIVACY_RIGHTS_CHANNEL, PRIVACY_PURPOSES} = require('../app/privacy-notice') as typeof import('../app/privacy-notice');
const {maskEmail, maskPhone, maskTaxId, maskPii, PiiTexto} = require('../app/list-format') as typeof import('../app/list-format');
const {canSeeClientContact} = require('../app/capabilities') as typeof import('../app/capabilities');
const {PRIVACY_API_PATHS, PRIVACY_API_ISSUE} = require('../app/privacy-data') as typeof import('../app/privacy-data');
const PrivacyPolicyPage = (require('../app/privacidad/page') as {default: () => React.ReactElement}).default;

/* ------------------------------------------------------------------ Aviso */

test('aviso: versión, fecha y estructura mínima de la Ley 7593/2025', () => {
 assert.match(PRIVACY_NOTICE.version, /^v\d+$/, 'el aviso tiene versión visible');
 assert.match(PRIVACY_NOTICE.fecha, /^\d{4}-\d{2}-\d{2}$/, 'el aviso tiene fecha de publicación');
 const ids = PRIVACY_SECTIONS.map(section => section.id);
 for (const id of ['responsable', 'datos', 'finalidades', 'consentimiento', 'destinatarios', 'conservacion', 'derechos', 'seguridad', 'menores', 'cambios', 'autoridad', 'contacto']) {
  assert(ids.includes(id), `el aviso cubre la sección ${id}`);
 }
 const text = PRIVACY_SECTIONS.flatMap(section => [...section.paragraphs, ...(section.items || [])]).join(' ');
 assert(text.includes('30 días corridos'), 'el plazo de respuesta es ≤30 días corridos');
 assert(text.includes('ANPDP'), 'la autoridad de control (ANPDP/MITIC) queda visible');
 assert(text.includes('revocar'), 'la revocación está explicada en el aviso');
 assert.equal(PRIVACY_NOTICE_PATH, '/privacidad', 'la ruta pública es permanente y sin datos personales');
 assert.equal(PRIVACY_API_ISSUE, 112, 'el pendiente de la base técnica queda ligado al issue #112');
 assert(PRIVACY_RIGHTS_CHANNEL.whatsappUrl.startsWith('https://'), 'el canal de derechos es real y enlazable');
});

test('aviso: la página pública renderiza las secciones, la versión y el canal', () => {
 const html = renderToStaticMarkup(<PrivacyPolicyPage/>);
 assert(html.includes('Política de Privacidad'), 'la página pública existe');
 assert(html.includes(`Aviso ${PRIVACY_NOTICE.version}`), 'la versión vigente es visible');
 assert(html.includes(PRIVACY_NOTICE.fechaLabel), 'la fecha de la versión es visible');
 assert(html.includes('ANPDP'), 'la autoridad de control aparece en la página');
 assert(html.includes('canal-derechos'), 'el canal de derechos se dibuja con las vías reales');
 assert(html.includes(PRIVACY_RIGHTS_CHANNEL.whatsappLabel), 'el canal alternativo real está enlazado');
 assert(!html.includes('mailto:'), 'sin buzones inventados');
 assert(!/href="[^"]*[?&](email|mail|nombre|telefono)=/i.test(html), 'la URL del aviso no lleva datos personales');
});

test('aviso: enlaces permanentes en pie, portal, status y middleware', () => {
 const bridge = file('app/workspace-footer.tsx');
 assert(bridge.includes('href="/privacidad"'), 'el pie del marco interno enlaza el aviso');
 assert(bridge.includes('PRIVACY_NOTICE_URL'), 'la landing usa la URL absoluta del aviso');
 const landing = file('public/scale-os.html');
 const footer = landing.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0] || '';
 assert(footer.includes('Privacidad'), 'la landing publica el enlace en su pie');
 for (const href of footer.matchAll(/href="([^"]+)"/g)) assert(href[1].startsWith('#') || href[1].startsWith('https://'), `la landing no rompe su contrato de enlaces: ${href[1]}`);
 assert(file('app/access-layout.tsx').includes('WorkspaceFooter'), 'las superficies de acceso heredan el pie con el enlace');
 assert(file('app/cliente/layout.tsx').includes('/privacidad') && file('app/cliente/layout.tsx').includes('PRIVACY_RIGHTS_CHANNEL'), 'el portal del cliente ofrece aviso y canal de derechos');
 assert(file('app/status/page.tsx').includes('/privacidad'), '/status enlaza el aviso');
 assert(file('app/workspace-guide.tsx').includes('/privacidad'), 'la guía del panel enlaza el aviso');
 const middleware = file('middleware.ts');
 assert(middleware.includes("path==='/privacidad'"), 'el aviso se sirve en los hosts públicos');
});

/* ---------------------------------------------------------- Consentimiento */

test('consentimiento: casillas explícitas, sin premarcar, con versión y enlace', () => {
 const registration = file('app/registro/page.tsx');
 assert(registration.includes('ConsentimientoDatos'), 'el registro usa el objeto compartido de consentimiento');
 assert(registration.includes('[privacyConsent,setPrivacyConsent]=useState(false)'), 'la casilla de registro arranca sin marcar');
 assert(registration.includes('if(!privacyConsent)'), 'el registro no avanza sin la aceptación');
 assert(registration.includes('version={PRIVACY_NOTICE.version}'), 'la versión del aviso se muestra al aceptar');
 assert(registration.includes('politicaUrl="/privacidad"'), 'el enlace a la política vive fuera del label');

 const teamInvite = file('app/invitacion/page.tsx');
 assert(teamInvite.includes('ConsentimientoDatos') && teamInvite.includes('[dataConsent,setDataConsent]=useState(false)'), 'la invitación de equipo pide consentimiento explícito');
 assert(teamInvite.includes('if(!requireConsent())') && teamInvite.includes('event.preventDefault()'), 'el camino de Google también exige la aceptación');
 assert(teamInvite.includes('privacy:consentRecord()'), 'la invitación registra finalidad, versión, canal y fecha');

 const portalInvite = file('app/cliente/invitacion/page.tsx');
 assert(portalInvite.includes('[dataConsent,setDataConsent]=useState(false)') && portalInvite.includes('portal-consent'), 'el portal usa su sistema visual con casilla sin premarcar');
 assert(portalInvite.includes("if(!dataConsent)"), 'el portal no activa el acceso sin consentimiento');
 assert(portalInvite.includes('onClick={continueWithGoogle}') && portalInvite.includes('queuePrivacyConsent'), 'el camino de Google del portal exige y registra la aceptación');
 assert(!/checked=\{true\}|defaultChecked/.test(registration + teamInvite + portalInvite), 'ninguna casilla de datos viaja premarcada');
});

test('consentimiento: la aceptación se registra por API o en el puente local, nunca se inventa', async () => {
 const storage = new Map<string, string>();
 Object.assign(globalThis, {window: globalThis, localStorage: {getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => {storage.set(key, value);}, removeItem: (key: string) => {storage.delete(key);}}});
 (globalThis as {fetch: unknown}).fetch = async () => new Response('{}', {status: 404});
 const privacyData = await import('../app/privacy-data');
 const result = await privacyData.registerPrivacyConsent({finalidad: 'cuenta-y-prestacion', canal: 'test', titular: 'persona@ejemplo.com'});
 assert.equal(result, 'local', 'sin API la aceptación real queda en la cola del dispositivo');
 const pending = privacyData.pendingPrivacyConsents();
 assert.equal(pending.length, 1);
 assert.equal(pending[0].version, PRIVACY_NOTICE.version, 'el registro local conserva la versión del aviso');
 assert(pending[0].fecha && !Number.isNaN(new Date(pending[0].fecha).getTime()), 'el registro local conserva la fecha real');

 const bridge = await privacyData.loadPrivacyData();
 assert.equal(bridge.source, 'bridge', 'sin API «Mis datos» cae al puente documentado');
 assert.equal(bridge.exportPath, null, 'sin API no se ofrece una descarga inexistente');
 assert.equal(bridge.requests.length, 0, 'sin API no se inventan solicitudes');
 await assert.rejects(() => privacyData.requestPrivacyAction('supresion', 'prueba'), {name: 'PrivacyApiUnavailableError'}, 'sin API no se simula la solicitud');

 (globalThis as {fetch: unknown}).fetch = async () => new Response(JSON.stringify({consents: [{finalidad: 'cuenta-y-prestacion', aceptado: true, version: 'v1', fecha: '2026-09-30T12:00:00.000Z', canal: 'api'}], requests: [{id: '1', tipo: 'acceso', estado: 'recibida', created_at: '2026-09-30T12:00:00.000Z', due_at: '2026-10-30T12:00:00.000Z'}]}), {status: 200, headers: {'Content-Type': 'application/json'}});
 const viaApi = await privacyData.loadPrivacyData();
 assert.equal(viaApi.source, 'api', 'con la base de #112 «Mis datos» usa la respuesta del servidor');
 assert.equal(viaApi.requests.length, 1, 'las solicitudes reales se muestran con su estado');
 assert.equal(PRIVACY_API_PATHS.myData, '/api/privacy/my-data', 'el contrato de #112 queda declarado en un solo módulo');
});

/* --------------------------------------------------------------- Permisos */

test('permisos: el contacto del cliente se enmascara por rol y el valor real no llega al DOM', () => {
 for (const role of ['viewer', 'production', 'editor']) assert.equal(canSeeClientContact(role), false, `${role} ve el contacto enmascarado`);
 for (const role of ['owner', 'admin', 'management', 'sales', 'finance', 'collaborator']) assert.equal(canSeeClientContact(role), true, `${role} conserva el contacto que necesita para operar`);
 assert.equal(maskEmail('juana.perez@agencia.com'), 'j•••@agencia.com');
 assert.equal(maskPhone('+595 981 123 456'), '+595 ••• ••56');
 assert.equal(maskTaxId('80012345-6'), '•••••••5-6');
 assert.equal(maskPii('email', ''), '');

 const masked = renderToStaticMarkup(<PiiTexto kind="email" value="juana.perez@agencia.com" masked/>);
 assert(!masked.includes('juana.perez@agencia.com'), 'el correo real no viaja al DOM enmascarado');
 assert(!masked.includes('juana'), 'tampoco la parte local completa');
 assert(masked.includes('Dato protegido'));
 const full = renderToStaticMarkup(<PiiTexto kind="telefono" value="+595 981 123 456"/>);
 assert(full.includes('+595 981 123 456'), 'los roles con permiso ven el dato completo');

 const clients = file('app/sections/clientes.tsx');
 assert(clients.includes('canSeeClientContact(role)') && clients.includes('masked={!canSeeContact}'), 'la lista de clientes aplica el enmascarado por rol');
 assert(!clients.includes("title={client.email ||"), 'el correo completo no queda en el title de la lista');
 assert(file('app/scale-workspace.tsx').includes('canSeeClientContact(user?.role)'), 'la búsqueda del panel no indexa el correo completo para roles sin permiso');
 assert(file('app/productivity-ui.tsx').includes('canSeeContact'), 'la ficha del cliente respeta el mismo criterio');
});

test('finalidades y transparencia contextual: cada captura declara el para qué', () => {
 assert(PRIVACY_PURPOSES.length > 0 && PRIVACY_PURPOSES.every(purpose => purpose.detalle.length > 10), 'cada finalidad explica su para qué');
 assert(PRIVACY_PURPOSES.every(purpose => typeof purpose.esencial === 'boolean'), 'las finalidades se separan por carácter esencial');
 assert(file('app/suite.tsx').includes('AvisoPrivacidad'), 'el alta/edición de cliente avisa la finalidad del tercero');
 assert(file('app/sections/pipeline.tsx').includes('AvisoPrivacidad'), 'el alta de oportunidad avisa la finalidad');
 assert(file('app/daily-controls.tsx').includes('conciliar los movimientos de esta empresa'), 'la importación de extractos avisa su uso');
 assert(file('app/my-profile.tsx').includes('Usamos la foto para identificarte'), 'la foto explica su finalidad');
 assert(file('app/client-ruc.tsx').includes('/privacidad'), 'la consulta de RUC enlaza el aviso');
});

/* -------------------------------------------------------------- Mis datos */

test('«Mis datos»: derechos, SLA y supresión con confirmación reforzada', () => {
 const panel = file('app/my-data.tsx');
 for (const kind of ['acceso', 'rectificacion', 'supresion', 'oposicion']) assert(panel.includes(`'${kind}'`), `el panel ofrece el derecho de ${kind}`);
 assert(panel.includes('PRIVACY_RIGHTS_CHANNEL.slaDias'), 'el SLA visible sale de la fuente única');
 assert(panel.includes('Venció hace') && panel.includes('Vence en'), 'los estados muestran el vencimiento real');
 assert(panel.includes("confirmation.trim()!=='Suprimir'"), 'la supresión exige la palabra de confirmación');
 assert(panel.includes('historial financiero y contable auditable se conserva'), 'la supresión explica la excepción fiscal');
 assert(panel.includes('registerPrivacyConsent') || panel.includes('revokePrivacyConsent'), 'la revocación usa el registro con trazabilidad');
 assert(panel.includes('#112'), 'el pendiente de la base técnica se declara en la vista');
 assert(panel.includes('Derechos con registro en preparación') && panel.includes('Próximamente'), 'sin API los derechos no se ofrecen como activos: se marcan próximamente (#147)');
 assert(panel.includes('estos pedidos se registran por el canal alternativo'), 'sin API el camino real es el canal de derechos');

 const profile = file('app/my-profile.tsx');
 assert(profile.includes('data-profile-section="data"'), 'el perfil tiene la sección de privacidad');
 assert(profile.includes('MyDataPanel'), 'el perfil abre «Mis datos»');
 assert(profile.includes('PRIVACY_RIGHTS_CHANNEL.slaDias'), 'el perfil toma el plazo de la fuente única');
});

test('sin PII en títulos ni URLs de las superficies nuevas', () => {
 const page = file('app/privacidad/page.tsx');
 assert(page.includes('export const metadata'), 'la página declara su título propio');
 assert(!page.includes('searchParams'), 'el aviso no lee datos del query string');
 assert(!page.includes('document.title'), 'el aviso no escribe títulos con datos');
 const panel = file('app/my-data.tsx');
 assert(!/href=\{`[^`]*\$\{[^}]*email/i.test(panel), '«Mis datos» no arma URLs con el correo');
});
