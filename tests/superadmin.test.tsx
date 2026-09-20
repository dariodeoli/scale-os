import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(
  new URL("../app/superadmin/page.tsx", import.meta.url),
  "utf8",
);
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
    /if \(!handlePlatformError\(cause\)\)[\s\S]*?"No pudimos cargar el control global/,
  );
});

test("superadmin sends the real re-authentication proof on global deletions", () => {
  // Issue #22: el modal ya no es cosmético; el API exige vista previa + prueba.
  assert.match(page, /\/api\/platform\/destructive\/preview/);
  assert.match(page, /\/api\/auth\/account\/recent-auth\/password/);
  assert.match(page, /confirmation, recentAuthProof \}/);
  assert.match(page, /autoComplete="current-password"/);
  assert.match(page, /!confirmPassword \|\|/);
  assert.match(page, /code === "PASSWORD_REAUTH_FAILED"/);
  assert.match(page, /code === "PASSWORD_REAUTH_UNAVAILABLE"/);
  assert.match(page, /code === "RECENT_AUTH_REQUIRED"/);
  assert.equal((page.match(/proofPayload/g) ?? []).length, 3, "una definición y los dos envíos con prueba");
  assert.match(page, /method: "DELETE", body: JSON\.stringify\(proofPayload\)/);
  assert.match(page, /method: "DELETE",\n\s+body: JSON\.stringify\(proofPayload\),/);
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
