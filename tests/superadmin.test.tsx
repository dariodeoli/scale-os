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
  assert.match(page, /\{writable && \(\s*<form className="platform-admin-coupon"/);
  assert.match(page, /\{writable && \(\s*<button\s+type="button"\s+className=\{"text-button " \+/);
  const manual = page.match(/\{writable && \(\s*<button\s+type="button"\s+className="text-button platform-admin-inline-action"[\s\S]*?\)\}/g) ?? [];
  assert.equal(manual.length, 2, "los dos accesos manuales quedan detrás de writable");
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
