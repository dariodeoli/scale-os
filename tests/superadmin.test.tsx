import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Fuente concatenada del panel global (issue #46): la pantalla se descompuso en
// page + model (tipos y helpers) + states + audit, y los contratos siguen valiendo.
const page = ["page.tsx", "model.tsx", "states.tsx", "audit.tsx", "agencies.tsx", "subscription-dialog.tsx", "access.tsx", "catalog.tsx", "confirm.tsx"]
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
    /\.platform-admin-page :is\(button, a, input, select, textarea\) \{[\s\S]*?min-height: 44px;/,
  );
  assert.match(
    styles,
    /\.platform-admin-page :is\(button, a, input, select, textarea\):focus-visible \{[\s\S]*?outline: 3px solid/,
  );
  assert.match(styles, /\.platform-admin-page \{[\s\S]*?overflow-x: clip;/);
  assert.match(
    styles,
    /@media\s*\(max-width:\s*760px\)\s*\{[\s\S]*?\.platform-admin-table-wrap \{[\s\S]*?display: none;/,
  );
});

test("la vuelta al panel es determinista en SSR y cliente, sin depender de window (#79)", () => {
  assert.match(page, /export function appHome\(\)/);
  assert.match(page, /export function loginReturnPath\(\) \{\s*return appHome\(\);/);
  assert.doesNotMatch(page, /window\.location\.hostname/, "el destino ya no depende del navegador");
  assert.match(page, /process\.env\.NEXT_PUBLIC_APP_ORIGIN/, "el origen se puede configurar por env");
  assert.match(page, /from "\.\.\/brand-metadata"/, "el fallback comparte el origen de la app");
  // Los tres puntos usan el helper: brand, «Panel» del header y «Volver al panel».
  assert.match(page, /<Link href=\{appHome\(\)\} aria-label="Scale OS">/);
  assert.match(page, /<Link className="text-button" href=\{appHome\(\)\}>/);
  assert.match(page, /<Link className="secondary mt-3 inline-flex items-center gap-2" href=\{appHome\(\)\}>/);
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
