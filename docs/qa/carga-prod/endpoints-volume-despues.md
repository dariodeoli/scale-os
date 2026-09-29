| Endpoint | Uso | p50 | p95 | máx | Peso real (mediana) | Decodificado |
| --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/me` | sesión | 6 ms | 23 ms | 23 ms | 0.7 KB | 0.7 KB |
| `/api/agency/team` | Equipo | 7 ms | 15 ms | 15 ms | 1.1 KB | 7.9 KB |
| `/api/agency/clients?fields=id,name,email,active,logo_url,color_key` | Clientes (chrome) | 8 ms | 22 ms | 22 ms | 4.0 KB | 47.7 KB |
| `/api/agency/clients` | Clientes (completo) | 6 ms | 8 ms | 8 ms | 5.8 KB | 197.4 KB |
| `/api/agency/projects?fields=id,name,client_id,client_name,work_order_count` | Proyectos (chrome) | 4 ms | 6 ms | 6 ms | 1.1 KB | 8.2 KB |
| `/api/agency/projects` | Proyectos (completo) | 8 ms | 11 ms | 11 ms | 2.1 KB | 32.3 KB |
| `/api/agency/work-orders?limit=300&fields=id,title,status,project_id,project_name,client_name,due_date` | Órdenes (ventana shell) | 6 ms | 32 ms | 32 ms | 3.8 KB | 50.5 KB |
| `/api/agency/control-center` | Centro de control | 6 ms | 29 ms | 29 ms | 0.4 KB | 0.4 KB |
| `/api/agency/dashboard` | Tablero | 10 ms | 30 ms | 30 ms | 0.4 KB | 2.6 KB |
| `/api/agency/activity?limit=20&offset=0` | Actividad (ventana) | 21 ms | 78 ms | 78 ms | 0.3 KB | 4.1 KB |
| `/api/agency/trash?limit=50&offset=0` | Papelera (ventana) | 5 ms | 6 ms | 6 ms | 0.3 KB | 0.3 KB |
| `/api/agency/productivity/history?limit=10&offset=0` | Historial (ventana) | 7 ms | 12 ms | 12 ms | 0.4 KB | 2.9 KB |
| `/api/agency/invite-links` | Invitaciones | undefined ms | undefined ms | -Infinity ms | NaN KB | NaN KB |
| `/api/agency/access-requests` | Solicitudes | undefined ms | undefined ms | -Infinity ms | NaN KB | NaN KB |
| `/api/agency/presence/usage` | Presencia · uso | 6 ms | 11 ms | 11 ms | 0.5 KB | 2.5 KB |
| `/api/agency/notifications?status=all` | Bandeja | 4 ms | 10 ms | 10 ms | 0.4 KB | 8.1 KB |
| `/api/agency/permissions` | Permisos | 3 ms | 4 ms | 4 ms | 1.3 KB | 5.9 KB |
| `/api/agency/settings` | Configuración | 4 ms | 6 ms | 6 ms | 0.2 KB | 0.2 KB |
| `/api/agency/exchange-rates` | Cotizaciones | 4 ms | 8 ms | 8 ms | 0.2 KB | 0.2 KB |
| `/api/platform/overview` | Superadmin · resumen | 2 ms | 13 ms | 13 ms | 0.1 KB | 0.1 KB |
| `/api/platform/agencies?limit=50` | Superadmin · agencias | 2 ms | 3 ms | 3 ms | 0.4 KB | 0.4 KB |
| `/api/platform/users?limit=50` | Superadmin · usuarios | 3 ms | 4 ms | 4 ms | 0.4 KB | 0.4 KB |
| `/api/platform/coupons?limit=50` | Superadmin · cupones | 2 ms | 8 ms | 8 ms | 0.1 KB | 0.1 KB |
| `/api/platform/audit?limit=50` | Superadmin · auditoría | 3 ms | 5 ms | 5 ms | 0.1 KB | 0.1 KB |
