import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import postcss from 'postcss';

const read = name => postcss.parse(readFileSync(new URL(`../app/${name}`, import.meta.url), 'utf8'));
const ui = read('ui-system.css'), density = read('workspace-density.css');
const declarations = rule => Object.fromEntries(rule.nodes.filter(n => n.type === 'decl').map(n => [n.prop, n.value]));
function ruleFor(ast, selector, mobile = false) {
  let found;
  ast.walkRules(rule => {
    const isMobile = rule.parent.type === 'atrule' && rule.parent.params === '(max-width:760px)';
    if (rule.selector === selector && isMobile === mobile) found = declarations(rule);
  });
  assert.ok(found, `Missing ${mobile ? 'mobile ' : ''}rule: ${selector}`);
  return found;
}

test('shared hierarchy inherits existing brand and radius tokens', () => {
  const tokens = ruleFor(ui, ':root');
  assert.equal(tokens['--ui-focus'], 'var(--brand-700)');
  assert.equal(tokens['--ui-radius-control'], 'var(--radius-sm)');
  assert.equal(tokens['--ui-radius-surface'], 'var(--radius-md)');
  assert.ok(parseInt(tokens['--ui-page-title-size']) > parseInt(tokens['--ui-heading-size']));
  ui.walkDecls(/^--brand-/, () => assert.fail('Shared refinement must inherit the brand'));
});

test('financial values wrap without hiding significant digits', () => {
  const selector = ':is(.control-shell,.unified-dialog) :is(.metric strong,.financial-amounts,.financial-amounts>*,.payment-row>strong,.reports-tiles article>strong,.pipeline-overview article strong)';
  const amount = ruleFor(ui, selector);
  assert.equal(amount['white-space'], 'normal');
  assert.equal(amount.overflow, 'visible');
  assert.equal(amount['text-overflow'], 'clip');
  assert.equal(amount['overflow-wrap'], 'anywhere');
  assert.equal(amount['font-variant-numeric'], 'tabular-nums');
  assert.equal(ruleFor(ui, '.control-shell .metric').overflow, 'visible');
});

test('production containers expand vertically instead of constraining card height', () => {
  for (const selector of ['.control-shell.production-board-mode>.content', '.control-shell .production-focus .kanban', '.control-shell .production-focus .column']) {
    const rule = ruleFor(ui, selector);
    assert.equal(rule.height, 'auto');
    assert.equal(rule['max-height'], 'none');
    assert.notEqual(rule.overflow, 'hidden');
  }
  // Horizontal overflow belongs to the board, while columns stay unbounded.
  const production = read('production-focus.css');
  assert.equal(ruleFor(production, '.control-shell .production-focus .kanban')['overflow-x'], 'auto');
  assert.equal(ruleFor(production, '.control-shell .production-focus .column').overflow, 'visible');
});

test('mobile controls include selectors, disclosures and small icon actions', () => {
  const scope = ':is(.control-shell,.unified-dialog,.photo-dialog)';
  assert.equal(ruleFor(ui, `${scope} :is(button,select,.ops-select-trigger,summary,a.primary,a.secondary,a.text-button)`, true)['min-height'], '44px');
  assert.equal(ruleFor(ui, `${scope} :is(button.icon-button,.assignee-remove)`, true)['min-width'], '44px');
  assert.equal(ruleFor(ui, '.control-shell .production-toolbar .ops-select-trigger', true)['min-height'], '44px');
  assert.equal(ruleFor(ui, '.control-shell .demo-tools>select', true)['font-size'], '16px');
  assert.equal(ruleFor(density, '.demo-tools>.demo-badge,.demo-tools>.demo-reset,.demo-tools>select', true)['min-height'], '44px');
  assert.equal(ruleFor(density, '.demo-tools', true)['flex-wrap'], 'wrap');
});

test('keyboard focus remains visible without changing geometry', () => {
  const focus = ruleFor(ui, ':is(.control-shell,.unified-dialog,.photo-dialog) :focus-visible');
  assert.equal(focus.outline, '2px solid var(--ui-focus)');
  assert.equal(focus['outline-offset'], '3px');
  ui.walkRules(rule => {
    if (!/:focus-visible|:hover/.test(rule.selector)) return;
    for (const prop of ['height', 'width', 'padding', 'font-size', 'font-weight']) assert.equal(declarations(rule)[prop], undefined);
  });
});
