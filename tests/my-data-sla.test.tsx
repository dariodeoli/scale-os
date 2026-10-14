import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const {slaLabel} = require('../app/my-data') as typeof import('../app/my-data');

// 22:00 del 13-oct en Asunción (UTC-3) ya es 14-oct en UTC.
const night = new Date('2026-10-14T01:00:00Z');

test('el SLA que vence hoy dice «Vence hoy» a las 22:00 locales (#170)', () => {
  assert.deepEqual(slaLabel('2026-10-13', night), {label: 'Vence hoy', vencido: true});
});

test('el SLA cuenta días de calendario de Asunción, no de UTC', () => {
  assert.equal(slaLabel('2026-10-14', night).label, 'Vence en 1 día');
  assert.equal(slaLabel('2026-10-16', night).label, 'Vence en 3 días');
  assert.equal(slaLabel('2026-10-12', night).label, 'Venció hace 1 día');
});

test('un vencimiento ausente o inválido no inventa un plazo', () => {
  assert.equal(slaLabel('', night).label, 'Sin vencimiento informado');
  assert.equal(slaLabel('no-es-fecha', night).label, 'Sin vencimiento informado');
});
