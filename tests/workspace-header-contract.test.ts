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

test("workspace header shows the signed-in company once and the sidebar keeps only the profile", () => {
  assert.doesNotMatch(source, /className="sidebar-company"/);
  assert.match(source, /<WorkspacePresence compact/);
  assert.doesNotMatch(mobileNavigation, /sidebar-company/);
});

test("workspace header retains visible focus, 40px desktop controls, 44px mobile targets, and reduced motion", () => {
  assert.match(density, /\.workspace-topbar :is\(button,a\):focus-visible\{outline:3px/);
  assert.match(density, /topbar-utility-actions>\.workspace-search-trigger\{min-width:min\(220px,28vw\);min-height:40px/);
  assert.match(density, /topbar-utility-actions>\.notification-trigger\{width:40px;min-width:40px;min-height:40px/);
  assert.match(density, /@media\(max-width:760px\)\{[\s\S]*?\.control-shell \.topbar-utility-actions>\.workspace-search-trigger,\.control-shell \.topbar-utility-actions>\.notification-trigger\{width:44px;min-width:44px;min-height:44px/);
  assert.match(density, /@media\(max-width:520px\)\{[\s\S]*?\.control-shell \.topbar-presence\{display:none\}/);
  assert.match(density, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(mobileNavigation, /\.workspace-topbar/);
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
  order(superadmin, 'className="platform-admin-agency-cards"', 'platform-admin-subscription-form');
  order(superadmin, 'platform-admin-subscription-form', 'className="platform-admin-two-columns"');
  assert.match(superadmin, /<h2>Agencias y suscripciones<\/h2>/);
});
