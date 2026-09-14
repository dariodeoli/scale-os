import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../app/scale-workspace.tsx", import.meta.url),
  "utf8",
);
const density = readFileSync(
  new URL("../app/workspace-density.css", import.meta.url),
  "utf8",
);
const mobileNavigation = readFileSync(
  new URL("../app/mobile-navigation.css", import.meta.url),
  "utf8",
);
const superadmin = readFileSync(
  new URL("../app/superadmin/page.tsx", import.meta.url),
  "utf8",
);

function order(haystack: string, first: string, second: string) {
  assert.ok(haystack.indexOf(first) >= 0, `missing ${first}`);
  assert.ok(haystack.indexOf(second) >= 0, `missing ${second}`);
  assert.ok(haystack.indexOf(first) < haystack.indexOf(second), `${first} must precede ${second}`);
}

test("workspace header groups company, presence, status, search, and notifications without changing return handling", () => {
  order(source, 'className="topbar-workspace-context"', 'className="topbar-utilities"');
  order(source, 'className="topbar-company"', 'className="topbar-presence"');
  order(source, 'className="topbar-status"', 'className="topbar-utility-actions"');
  order(source, '<WorkspaceSearch', '<NotificationBell');
  assert.match(source, /postLoginDestination\(search:string\)/);
  assert.match(source, /scaleBilling'\)\|\|query\.get\('billing/);
});

test("workspace header retains visible focus, 44px controls, compact responsive status, and reduced motion", () => {
  assert.match(density, /\.workspace-topbar :is\(button,a\):focus-visible\{outline:3px/);
  assert.match(density, /topbar-utility-actions>\.workspace-search-trigger\{min-width:min\(244px,30vw\);min-height:44px/);
  assert.match(density, /topbar-utility-actions>\.notification-trigger\{width:44px;min-width:44px;min-height:44px/);
  assert.match(density, /@media\(max-width:520px\)\{\n \.control-shell \.topbar-presence\{display:none\}/);
  assert.match(density, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(mobileNavigation, /topbar-company[^}]*display:none/);
});

test("mobile workspace header keeps the subscription notice visible in the compact status row", () => {
  assert.match(
    density,
    /@media\(max-width:760px\)\{[\s\S]*?\.control-shell \.workspace-topbar \.topbar-status\{display:flex;grid-column:1\/-1;grid-row:2/,
  );
  assert.doesNotMatch(
    mobileNavigation,
    /@media\(max-width:760px\)\{[\s\S]*?\.workspace-topbar \.subscription-notice[^}]*display:none/,
  );
});

test("manual subscription management renders immediately after agency records", () => {
  order(superadmin, 'className="platform-admin-agency-cards"', 'platform-admin-section platform-admin-subscription');
  order(superadmin, 'platform-admin-section platform-admin-subscription', 'className="platform-admin-two-columns"');
  assert.match(superadmin, /<h2>Agencias y suscripciones<\/h2>/);
});
