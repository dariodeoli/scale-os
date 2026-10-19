// Synthetic rows reused from the existing domain contract tests. No production data.
export const days = Array.from({length: 7}, (_, i) => `2026-10-${String(8 + i).padStart(2, '0')}`);
export const totals = {views: 40, visitors: 25, avg_seconds: 75, timed: 30, avg_scroll: 62, scrolled: 30, s25: 28, s50: 20, s75: 12, s100: 6, mobile: 18, cta_clicks: 9, signups: 2};
export const traffic = {
  range: {from: '2026-10-08', to: '2026-10-14', days: 7, previous_from: '2026-10-01', previous_to: '2026-10-07', today: '2026-10-14', timezone: 'America/Asuncion'},
  landing: {
    today: {day: '2026-10-14', views: 7, visitors: 5},
    totals, previous: {...totals, views: 32, visitors: 25, avg_seconds: 60, cta_clicks: 0},
    daily: days.map((day, i) => ({day, views: i + 3, visitors: i + 2, avg_seconds: 60 + i, avg_scroll: 50 + i, cta_clicks: i % 2})),
    pages: [{path: '/', views: 35, visitors: 22, avg_seconds: 80, avg_scroll: 64}, {path: '/scale-os.html', views: 5, visitors: 3, avg_seconds: 40, avg_scroll: 30}],
    referrers: [{domain: 'google.com', views: 20, visitors: 14}, {domain: null, views: 15, visitors: 9}],
    ctas: [{cta: 'trial', clicks: 5, previous: 0, visitors: 4}, {cta: 'demo', clicks: 3, previous: 0, visitors: 3}, {cta: 'contact', clicks: 1, previous: 0, visitors: 1}, {cta: 'whatsapp', clicks: 0, previous: 0, visitors: 0}],
  },
  demo: {
    totals: {started: 6, views: 30, demos_with_views: 5, avg_seconds: 410, timed_demos: 5, role_changes: 4},
    previous: {started: 3, views: 12, demos_with_views: 3, avg_seconds: 300, timed_demos: 3},
    kinds: [{kind: 'publica', started: 5, previous: 3}, {kind: 'privada', started: 1, previous: 0}],
    daily: days.map((day, i) => ({day, started: i % 3})),
    roles: [{role: 'finance', changes: 3, demos: 2}, {role: 'editor', changes: 1, demos: 1}],
    screens: [{path: '/produccion', views: 14, demos: 5, avg_seconds: 95}, {path: '/finanzas', views: 6, demos: 3, avg_seconds: 50}],
    conversion: {measurable: false, reason: 'La demo es anónima y el registro vive en app.scaleparaguay.com: no se cruzan identidades entre ambos.'},
  },
};
export const usage = {
  range: {from: '2026-10-08', to: '2026-10-14', days: 7, previous_from: '2026-10-01', previous_to: '2026-10-07', timezone: 'America/Asuncion'},
  totals: {unique_users: 12, recurring_users: 5, sessions: 40, previous_unique_users: 10, previous_sessions: 50, previous_recurring_users: 5, active_now: 2},
  daily: days.map((day, i) => ({day, users: i + 1, sessions: i + 2, recurring: i % 2, previous_day: `2026-10-0${i + 1}`, previous_users: i, previous_sessions: i})),
  has_data: {sessions: true, users: true},
  signups: days.map((day, i) => ({day, users: i % 2, agencies: i % 3 === 0 ? 1 : 0})),
  hourly: Array.from({length: 24}, (_, hour) => ({hour, users: hour % 5})),
  monthly: [{month: '2026-07', signups: 3, active_users: 9}, {month: '2026-08', signups: 4, active_users: 11}, {month: '2026-09', signups: 5, active_users: 13}, {month: '2026-10', signups: 2, active_users: 12}],
  agencies: [
    {id: 1, name: 'Agencia Norte', active7: 3, active30: 6, sessions: 20, last_seen_at: '2026-10-14T15:00:00Z', owner: {name: 'Ana Dueña', avatar_url: null, email: 'ana@norte.example'}},
    {id: 2, name: 'Agencia Sur', active7: 1, active30: 2, sessions: 9, last_seen_at: '2026-10-10T15:00:00Z', owner: null},
  ],
  users: [{id: 7, name: 'Beto Pérez', avatar_url: null, email: 'beto@norte.example', agency: 'Agencia Norte', last_seen_at: '2026-10-14T15:00:00Z', sessions: 4}],
};
export const long = 'Queremos ordenar la producción de 14 clientes y dejar de usar planillas. ' + 'Detalle '.repeat(40);
export const inquiries = [
  {id: 3, name: 'Ana Benítez', company: 'Estudio Audiovisual', email: 'ana@estudio.example', whatsapp: '+595 981123456', message: long, consent: true, source: 'landing', source_url: null, status: 'new', note: null, handled_at: null, handled_by_email: null, created_at: '2026-10-14T15:00:00Z'},
  {id: 2, name: 'Compras Coop', company: 'Cooperativa', email: 'compras@coop.example', whatsapp: null, message: '', consent: true, source: 'landing', source_url: null, status: 'contacted', note: 'Llamar el lunes', handled_at: '2026-10-14T16:00:00Z', handled_by_email: 'platform@scale.example', created_at: '2026-10-13T15:00:00Z'},
];
export const errors = [
  {id: 7, source: 'web', message: 'TypeError: Cannot read properties of undefined (reading \'map\')', route: '/clientes/:id', occurrences: 1284, first_seen_at: '2026-10-13T10:00:00Z', last_seen_at: '2026-10-14T15:00:00Z', status: 'new', resolved_at: null, resolved_by_email: null},
  {id: 5, source: 'api', message: 'HTTP 500 · No se pudo completar la solicitud', route: '/api/agency/budgets/:id', occurrences: 3, first_seen_at: '2026-10-12T10:00:00Z', last_seen_at: '2026-10-13T09:00:00Z', status: 'resolved', resolved_at: '2026-10-13T12:00:00Z', resolved_by_email: 'platform@scale.example'},
];
export const reports = [
  {id: 11, category: 'error', message: 'Al guardar el presupuesto aparece un error y no se guarda.', route: '/presupuestos/:id', app_version: '1.0.187', status: 'new', note: null, handled_at: null, handled_by_email: null, created_at: '2026-10-14T15:00:00Z', organization_name: 'Estudio Audiovisual', user_email: 'ana@estudio.example', user_name: 'Ana Benítez'},
  {id: 10, category: 'sugerencia', message: 'Estaría bueno exportar el kanban.', route: '/produccion', app_version: null, status: 'in_progress', note: 'Lo vemos en la próxima', handled_at: '2026-10-14T16:00:00Z', handled_by_email: 'platform@scale.example', created_at: '2026-10-13T15:00:00Z', organization_name: null, user_email: null, user_name: null},
];
export const items = [
  {id: 7, title: 'Nueva vista de producción', message: 'Probá el tablero nuevo.', kind: 'novedad', priority: 1, organization_id: null, organization_name: null, starts_at: '2026-10-14T12:00:00Z', ends_at: null, published_at: '2026-10-14T12:00:00Z', created_at: '2026-10-14T12:00:00Z', status: 'active', audience_users: 3, reads: 1, read_pct: 33.3},
  {id: 6, title: 'Cambio de plan', message: 'Solo Norte.', kind: 'aviso', priority: 3, organization_id: 9, organization_name: 'Agencia Norte', starts_at: '2026-10-13T12:00:00Z', ends_at: '2026-10-20T12:00:00Z', published_at: null, created_at: '2026-10-13T12:00:00Z', status: 'draft', audience_users: 1, reads: 0, read_pct: 0},
];
