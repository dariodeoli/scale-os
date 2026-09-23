import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../app/scale-workspace.tsx", import.meta.url),
  "utf8",
);
const drawer = readFileSync(
  new URL("../app/mobile-navigation.tsx", import.meta.url),
  "utf8",
);
const globals = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const uiSystem = readFileSync(
  new URL("../app/ui-system.css", import.meta.url),
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
  order(source, 'topbar-workspace-context', 'topbar-utilities');
  order(source, 'topbar-company', 'topbar-presence');
  order(source, 'topbar-status', 'topbar-utility-actions');
  order(source, '<WorkspaceSearch', '<NotificationBell');
  assert.match(source, /postLoginDestination\(search:string\)/);
  assert.match(source, /scaleBilling'\)\|\|query\.get\('billing/);
});

test("workspace header shows the signed-in company once and the sidebar keeps only the profile", () => {
  assert.doesNotMatch(source, /className="sidebar-company"/);
  assert.match(source, /<WorkspacePresence compact/);
  assert.doesNotMatch(drawer, /sidebar-company/);
});

test("workspace header retains visible focus, 40px desktop controls, 44px mobile targets, and reduced motion", () => {
  // El foco visible vive en la hoja global; el v2 no lo pisa.
  assert.match(globals, /button:focus-visible,input:focus-visible,textarea:focus-visible,a:focus-visible\{outline:3px solid var\(--focus-ring\)/);
  assert.match(source, /\[&>\*\]:min-h-10 \[&>\*\]:min-w-10/, "topbar utilities keep 40px desktop targets");
  assert.match(source, /max-md:\[&>\*\]:min-h-11 max-md:\[&>\*\]:min-w-11/, "topbar utilities keep 44px mobile targets");
  assert.match(source, /topbar-presence min-w-0 shrink-0 max-\[520px\]:hidden/, "presence hides on the smallest screens");
  assert.match(source, /motion-reduce:\[&_\*\]:transition-none/, "the header honors reduced motion");
  assert.match(uiSystem, /prefers-reduced-motion:reduce/, "the shared sheet keeps a reduced-motion block");
  assert.doesNotMatch(drawer, /\.workspace-topbar/);
});

test("mobile workspace header keeps the subscription notice visible in the compact status row", () => {
  assert.match(
    source,
    /topbar-status flex items-center gap-2 max-md:col-span-full max-md:row-start-2/,
    "the status takes its own row on mobile",
  );
  assert.match(source, /topbar-status[\s\S]*?SubscriptionNotice/, "the compact row keeps the subscription notice");
  assert.doesNotMatch(drawer, /subscription-notice[\s\S]*?hidden/);
});

test("the company name truncates in the topbar and wraps inside the switcher", () => {
  assert.match(
    source,
    /topbar-company min-w-0 \[&_\.company-name\]:truncate/,
    "a long company name truncates in the topbar instead of widening the shell",
  );
  const operations = readFileSync(new URL("../app/operations.tsx", import.meta.url), "utf8");
  assert.match(operations, /<button className="workspace" title=\{name\}/, "the company switcher keeps its hover label");
  const operationsCss = readFileSync(new URL("../app/operations.css", import.meta.url), "utf8");
  assert.match(operationsCss, /\.company-choice-row\{display:flex/, "the company switcher row wraps instead of overflowing the dialog");
  assert.match(operationsCss, /\.company-choice-row>\.choice\{flex:1 1 12rem;min-width:0;text-align:left;white-space:normal/, "the company option wraps its full name");
});

test("manual subscription management renders immediately after agency records", () => {
  order(superadmin, 'className="platform-admin-agency-cards"', 'platform-admin-subscription-form');
  order(superadmin, 'platform-admin-subscription-form', 'className="platform-admin-two-columns"');
  assert.match(superadmin, /<h2>Agencias y suscripciones<\/h2>/);
});
