// Synthetic API fixture for the real local superadmin route, never production.
export const auditMetadata = {reason: 'Mobile readability '.repeat(20), days: 30};
export const adminResponses = {
  '/api/platform/overview': {agencies: {total: 0, active: 0}, users: {total: 50}, coupons: {total: 0, active: 0}, subscriptions: []},
  '/api/platform/agencies': {agencies: []},
  '/api/platform/users': {users: Array.from({length: 50}, (_, index) => ({id: index + 1, email: `reader-${index + 1}@example.com`, active_agencies: 1, platform_admin: false}))},
  '/api/platform/coupons': {coupons: []},
  '/api/platform/audit': {actions: [{id: '1', actor_email: 'administrator-with-long-name@example.com', action: 'platform.agency.subscription.extend', target_type: 'agency', target_id: '27', created_at: '2026-10-05T15:00:00Z', metadata: auditMetadata}]},
  '/api/auth/me': {user: {id: 1, platform_role: 'viewer'}},
  '/api/platform/bootstrap-status': {initialized: true},
};
export default [];
