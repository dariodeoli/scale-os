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

test("superadmin sends a 401 to the fixed internal login return path before an error dashboard", () => {
  assert.match(page, /const LOGIN_RETURN_PATH\s*=\s*"\/\?next=\/superadmin";/);
  assert.match(
    page,
    /if \(status === 401\) \{[\s\S]*?setError\(""\);[\s\S]*?router\.replace\(LOGIN_RETURN_PATH\);/,
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

test("superadmin normalizes absent and invalid dashboard metric values", () => {
  assert.match(
    page,
    /function formatPlatformMetric\(value: unknown, fallback = "—"\)/,
  );
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
    /@media \(max-width: 760px\) \{[\s\S]*?\.platform-admin-table-wrap \{[\s\S]*?display: none;/,
  );
});
