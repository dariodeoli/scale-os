import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Fuente concatenada del panel global (issue #46): la pantalla se descompuso en
// page + model (tipos y helpers) + states + audit, y los contratos siguen valiendo.
const page = ["page.tsx", "model.tsx", "overview.tsx", "states.tsx", "audit.tsx", "agencies.tsx", "subscription-dialog.tsx", "access.tsx", "catalog.tsx", "confirm.tsx"]
  .map((file) => readFileSync(new URL(`../app/superadmin/${file}`, import.meta.url), "utf8"))
  .join("\n");
const styles = readFileSync(
  new URL("../app/superadmin/platform-admin.css", import.meta.url),
  "utf8",
);

test("superadmin sends a 401 to the clean app login without the next param before an error dashboard", () => {
  assert.match(page, /function loginReturnPath\(\)/);
  assert.doesNotMatch(page, /\?next=\/superadmin/);
  assert.match(
    page,
    /if \(status === 401\) \{[\s\S]*?setError\(""\);[\s\S]*?window\.location\.assign[\s\S]*?router\.replace/,
  );
  assert.match(
    page,
    /const overview\s*=\s*await platformApi<Overview>\(['"]\/api\/platform\/overview['"]/,
  );
  assert.match(
    page,
    /if \(!handlePlatformError\(cause, true\)\)[\s\S]*?"No pudimos cargar el control global/,
  );
});

test("superadmin sends the real re-authentication proof on global deletions", () => {
  // Issue #22: el modal ya no es cosmético; el API exige vista previa + prueba.
  assert.match(page, /\/api\/platform\/destructive\/preview/);
  assert.match(page, /\/api\/auth\/account\/recent-auth\/password/);
  assert.match(page, /confirmation, recentAuthProof \}/);
  assert.match(page, /autoComplete="current-password"/);
  assert.match(page, /authMethod === "password"\s*\? !confirmPassword/);
  assert.match(page, /emailCode\.length !== 8/);
  assert.match(page, /code === "PASSWORD_REAUTH_FAILED"/);
  assert.match(page, /code === "PASSWORD_REAUTH_UNAVAILABLE"/);
  assert.match(page, /code === "RECENT_AUTH_REQUIRED"/);
  assert.equal((page.match(/proofPayload/g) ?? []).length, 3, "una definición y los dos envíos con prueba");
  assert.match(page, /method: "DELETE", body: JSON\.stringify\(proofPayload\)/);
  assert.match(page, /method: "DELETE",\n\s+body: JSON\.stringify\(proofPayload\),/);
});

test("superadmin hides every mutation control from a viewer and keeps the panel on action 403s", () => {
  // Issue #22: viewer nunca ve acciones; un 403 de acción no desmonta el panel.
  assert.match(page, /const writable = myRole === "admin"/);
  assert.match(page, /function handlePlatformError\(cause: unknown, fromLoad = false\)/);
  assert.match(page, /if \(!fromLoad\) return false;/);
  assert.match(page, /if \(!handlePlatformError\(cause, true\)\)/);
  assert.match(page, /if \(!writable\) return;/, "manageSubscription no muta sin rol de escritura del API");
  assert.match(page, /\{writable && subscriptionAgency \? \(/);
  assert.match(page, /\{confirming && writable && \(/);
  assert.match(page, /\{writable && \(\s*<form className="platform-admin-coupon/);
  assert.match(page, /\{writable \? <ListActions>\s*<button\s+type="button"\s+className=\{"text-button " \+/);
  // El acceso manual vive en un solo helper con gate de escritura y se reusa
  // en la tabla y en las tarjetas (una definición, dos contenedores).
  assert.equal((page.match(/\{writable && \(\s*<button\s+type="button"\s+className="text-button platform-admin-inline-action"/g) ?? []).length, 1, "el acceso manual queda detrás de writable");
  assert.equal((page.match(/\{actions\(agency\)\}/g) ?? []).length, 2, "la tabla y las tarjetas comparten las acciones");
  assert.match(page, /\{writable \? <ListActions>\{actions\(agency\)\}<\/ListActions> : null\}/);
  assert.match(page, /\{writable \? <div className="mt-auto/);
});

test("superadmin offers the email code re-authentication for passwordless admins", () => {
  // Follow-up #22: el API ya soporta el código por correo con la misma vista previa.
  assert.match(page, /\/api\/auth\/account\/recent-auth\/email\/request/);
  assert.match(page, /\/api\/auth\/account\/recent-auth\/email\/complete/);
  assert.match(page, /authMethod === "email"\s*\?/);
  assert.match(page, /EMAIL_REAUTH_INVALID/);
  assert.match(page, /autoComplete="one-time-code"/);
  assert.match(page, /setAuthMethod\("email"\)/, "una cuenta sin contraseña cambia al código sin redirigir");
  assert.match(page, /authPreviewId/, "el código reusa la vista previa ya creada");
});

test("superadmin normalizes absent and invalid dashboard metric values", () => {
  assert.match(
    page,
    /subscription\/extend/,
  );
  assert.match(page, /Marcar pago manual/);
  assert.match(page, /Días a sumar/);
  assert.match(page, /Number\.isFinite\(number\)[\s\S]*?: fallback;/);
  assert.match(page, /const total = formatPlatformMetric\(item\.total, ""\);/);
  assert.match(page, /function subscriptionSummary\(rows: unknown\)/);
  assert.doesNotMatch(page, /\$\{row\.total\} \$\{row\.status\}/);
});

test("superadmin keeps its operational controls accessible and responsive", () => {
  assert.match(
    styles,
    /\.platform-admin-page :is\(button, a, input, select, textarea\):focus-visible \{[\s\S]*?outline: 3px solid/,
  );
  assert.match(styles, /\.platform-admin-page \{[\s\S]*?overflow-x: clip;/);
  // Targets móviles del panel (el escritorio usa el control de 40 px del sistema).
  assert.match(styles, /\.platform-admin-actions \.secondary \{ flex: 1; min-height: 44px \}/);
  assert.match(
    styles,
    /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.platform-admin-table-wrap \{[\s\S]*?display: none;/,
  );
  // Densidad (#97/#102): ritmo de página por token, encabezado de 56 px alineado
  // con las cards y sin aire extra arriba.
  assert.match(styles, /padding: var\(--ui-space-2, 8px\) var\(--ui-page-padding, 16px\) var\(--ui-space-6, 24px\)/);
  assert.match(styles, /min-height: 56px/);
  assert.match(styles, /border-radius: var\(--ui-radius-card, 12px\)/);
  assert.match(page, /className="platform-admin-page control-shell"/);
});

test("la vuelta al panel es determinista en SSR y cliente, sin depender de window (#79)", () => {
  assert.match(page, /export function appHome\(\)/);
  assert.match(page, /export function loginReturnPath\(\) \{\s*return appHome\(\);/);
  assert.doesNotMatch(page, /window\.location\.hostname/, "el destino ya no depende del navegador");
  assert.match(page, /process\.env\.NEXT_PUBLIC_APP_ORIGIN/, "el origen se puede configurar por env");
  assert.match(page, /from "\.\.\/brand-metadata"/, "el fallback comparte el origen de la app");
  // Los tres puntos usan el helper: brand, «Panel» del header y «Volver al panel».
  assert.match(page, /<Link className="platform-admin-brand" href=\{appHome\(\)\} aria-label="Scale OS">/);
  assert.match(page, /<Link className="secondary" href=\{appHome\(\)\}>/);
  assert.match(page, /<Link className="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8" href=\{appHome\(\)\}>/);
});

test("superadmin panel uses the shared v2 surface and the one notification system (issue #80)", () => {
  // Jerarquía ejecutiva del sistema: KPIs, paneles, listas densas y chips
  // compartidos; sin toasts ni chips propios del panel.
  assert.match(page, /from "\.\.\/ui-v2"/);
  assert.match(page, /<KpiStrip aria-label="Resumen de plataforma">/);
  assert.match(page, /<Kpi label="Agencias activas"/);
  assert.match(page, /<Kpi label="Suscripciones"/);
  assert.match(page, /<ListGrid label="Agencias y suscripciones"/);
  assert.match(page, /<ListGrid label="Accesos entre agencias"/);
  assert.match(page, /<ListGrid label="Cupones"/);
  assert.match(page, /<ListGrid label="Actividad de administración global"/);
  assert.match(page, /<ListActions>/);
  assert.match(page, /className="panel/);
  assert.match(page, /useDenseTableFit/);
  assert.match(page, /notify\(\{\s*tone: "success"/);
  assert.match(page, /notify\(\{\s*tone: "error"/);
  assert.doesNotMatch(page, /platform-admin-status-note/);
  assert.doesNotMatch(page, /platform-admin-badge/);
  assert.doesNotMatch(page, /platform-admin-stat-card/);
  assert.doesNotMatch(styles, /platform-admin-stat-card|platform-admin-badge|platform-admin-status-note/);
});

test("rediseño #102: consola con secciones, carga de la app y título único", () => {
  // Consola: encabezado compacto + barra de secciones con contadores + vistas.
  assert.match(page, /<div className="platform-admin-tabs silent-scroll">/, "la barra de secciones es un contenedor sin la regla legacy `nav button`");
  assert.match(page, /ariaLabel="Secciones del panel global"/);
  for (const view of ["resumen", "agencias", "cupones", "accesos", "auditoria"]) {
    assert.match(page, new RegExp(`\\{id: "${view}", label:`), `la vista ${view} existe`);
  }
  assert.equal((page.match(/\{view === "/g) ?? []).length, 5, "cada sección renderiza su vista");
  assert.match(page, /<PlatformOverview state=\{state\} audit=\{state\.audit\} onGoTo=\{setView\} bootstrap=\{bootstrap\}\/>/);
  // Carga inicial con el skeleton propio del panel (#155 C).
  assert.match(page, /import \{PlatformAccessDenied, PlatformAdminSkeleton, PlatformNotices, PlatformRedirecting\} from "\.\/states"/);
  assert.match(page, /if \(busy && !state && !error && !redirecting && !accessDenied\) return <PlatformAdminSkeleton\/>/);
  assert.doesNotMatch(page, /<KpiStrip[\s\S]{0,2000}?loading/, "las métricas no se inventan durante la carga");
  // Estado del encabezado: rol + última actualización en 24 h.
  assert.match(page, /platformTime\(updatedAt\)/);
  // #147: el acceso denegado no se anuncia «Solo lectura» y no ofrece refresco;
  // el motivo del 403 conserva el contexto en el estado y en «Volver al panel».
  assert.match(page, /accessDenied \? <StateChip tone="bad">Acceso denegado<\/StateChip>/);
  assert.match(page, /myRole \? <StateChip tone=\{writable \? "ok" : "info"\}/);
  assert.match(page, /\{!accessDenied && <button/);
  assert.match(page, /<PlatformAccessDenied message=\{accessMessage\}\/>/);
  assert.match(page, /setAccessMessage\(cause instanceof Error \? cause\.message : ""\)/);
  assert.match(readFileSync(new URL('../app/superadmin/states.tsx', import.meta.url), 'utf8'), /\{message \|\| "Tu sesión está activa/);
  assert.match(page, /className="platform-admin-identity"/, "marca, rótulo y título comparten la fila del encabezado");
});

test("rediseño #102: ninguna capacidad del panel se pierde", () => {
  // Endpoints y contratos intactos.
  for (const endpoint of [
    "/api/platform/overview",
    "/api/platform/agencies?limit=50",
    "/api/platform/users?limit=50",
    "/api/platform/coupons?limit=50",
    "/api/platform/audit?limit=50",
    "/api/platform/bootstrap-status",
    "/api/platform/destructive/preview",
    "/api/platform/users/",
    "/api/platform/coupons/",
    "subscription/extend",
    "/subscription`",
  ]) {
    assert(page.includes(endpoint), `el endpoint ${endpoint} sigue en el panel`);
  }
  // Agencias: gestionar suscripción (acción primaria) + eliminar en el ⋯.
  assert.match(page, /Gestionar suscripción/);
  assert.match(page, /Eliminar agencia/);
  // Cupones: crear + pausar/reactivar.
  assert.match(page, /Crear cupón/);
  assert.match(page, /"Pausar" : "Reactivar"/);
  // Accesos: admin global, solo lectura, quitar y eliminar.
  assert.match(page, /Hacer admin global/);
  assert.match(page, /Solo lectura/);
  assert.match(page, /Quitar acceso/);
  assert.match(page, /Eliminar mi cuenta/);
  assert.match(page, /Eliminar usuario/);
  // Confirmación reforzada + re-autenticación + auditoría con filtros.
  assert.match(page, /Escribí <strong>\{target\}<\/strong> para confirmar/);
  assert.match(page, /PlatformConfirmDialog/);
  assert.match(page, /ariaLabel="Buscar en la auditoría"/);
  assert.match(page, /<Select aria-label="Filtrar por acción"/);
  // Permisos: viewer nunca ve controles mutantes (mismo gate de siempre).
  assert.match(page, /const writable = myRole === "admin"/);
});

test("rediseño #155 fase 2: resumen útil, orden de secciones y estados propios", () => {
  // A · Resumen con riel de atención/atajos, tres paneles y suscripciones.
  assert.match(page, /export function platformAttention/);
  assert.match(page, /Requiere tu atención/);
  assert.match(page, /Atajos/);
  assert.match(page, /Suscripciones por estado/);
  assert.match(page, /xl:grid-cols-\[minmax\(0,1fr\)_22rem\]/);
  assert.match(page, /id: "bootstrap"/);
  // B · Orden aprobado (personas antes que catálogo) y tabs con indicador.
  assert.ok(page.indexOf('{id: "accesos", label:') < page.indexOf('{id: "cupones", label:'), "Accesos antes que Cupones");
  assert.match(page, /platform-admin-tabs-wrap/);
  assert.match(styles, /\.platform-admin-tabs \[aria-pressed="true"\] \{ box-shadow: inset 0 -2px 0 0 rgb\(var\(--c-fono\)\) \}/);
  assert.match(styles, /\.platform-admin-tabs-wrap::after/);
  // C · Skeleton propio, avisos con borde de contraste y recuperación.
  assert.doesNotMatch(page, /LoadingScreen/);
  assert.match(readFileSync(new URL("../app/superadmin/states.tsx", import.meta.url), "utf8"), /export function PlatformAdminSkeleton/);
  assert.match(page, /onRetry=\{\(\) => void load\(\)\}/);
  assert.match(readFileSync(new URL("../app/superadmin/states.tsx", import.meta.url), "utf8"), /border-warn-text\/45/);
  // D · Acción primaria visible + ⋯ del sistema y tarjetas de 200 px.
  assert.match(readFileSync(new URL("../app/superadmin/agencies.tsx", import.meta.url), "utf8"), /<ActionMenu/);
  assert.match(readFileSync(new URL("../app/superadmin/agencies.tsx", import.meta.url), "utf8"), /min-h-\[200px\]/);
  assert.match(readFileSync(new URL("../app/superadmin/agencies.tsx", import.meta.url), "utf8"), /No hay agencias que coincidan con el filtro/);
  // Mobile del encabezado en 3 filas y contador de toolbar en su línea.
  assert.match(styles, /\.platform-admin-identity h1 \{ overflow: hidden; font-size: clamp\(15px, 5vw, 17px\)/);
  assert.match(styles, /\.platform-admin-page \[data-toolbar="filtros"\] > p \{ order: 3; width: 100%/);
});

test("rediseño #102: densidad y filtros de las listas del panel", () => {
  // Toolbars de lista: búsqueda + filtro + contador, sin card contenedora.
  assert.equal((page.match(/<FilterToolbar summary=/g) ?? []).length, 3, "agencias, accesos y auditoría usan la toolbar del sistema");
  assert.equal((page.match(/data-toolbar="filtros"/g) ?? []).length, 0, "la toolbar real sale del primitivo (no se duplica el hook)");
  assert.match(page, /<FilterToolbar summary=\{`\$\{visible\.length\} de \$\{state\.agencies\.length\}`\}>/);
  // Los formularios de alta (cupones) viven en una fila del sistema.
  assert.match(page, /className="platform-admin-coupon"/);
  assert.match(styles, /\.platform-admin-coupon \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/);
  // Sin `min-height` grande en tarjetas del panel.
  assert.doesNotMatch(styles, /min-height:\s*(1[5-9][0-9]|2[0-9][0-9])px/);
});
