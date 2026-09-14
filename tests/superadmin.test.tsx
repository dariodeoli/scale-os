import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const page = readFileSync(
  new URL("../app/superadmin/page.tsx", import.meta.url),
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
