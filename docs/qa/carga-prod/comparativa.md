# Comparativa antes/después — carga producción-like (#108)

Pila local (API 3977 + front 3077 + proxy 3078), PostgreSQL 55477 con volumen sembrado (org 9: 320 clientes, 80 proyectos, 1580 piezas, 6852 filas de auditoría, 407 ítems de inventario).

## Endpoints (mediana de 12 corridas, compresión real de red)

| Endpoint | Uso | p50 antes | p95 antes | p50 después | p95 después | Transfer. antes | Transfer. después | Decodif. antes | Decodif. después | Δ decodif. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/auth/me` | sesión | 4 ms | 14 ms | 6 ms | 23 ms | 0.7 KB | 0.7 KB | 0.7 KB | 0.7 KB | +0 % |
| `/api/agency/team` | Equipo | 5 ms | 6 ms | 7 ms | 15 ms | 59.5 KB | 1.1 KB | 162.6 KB | 7.9 KB | -95 % |
| `/api/agency/clients?fields=id,name,email,active,logo_url,color_key` | Clientes (chrome) | 3 ms | 4 ms | 8 ms | 22 ms | 4.0 KB | 4.0 KB | 47.7 KB | 47.7 KB | +0 % |
| `/api/agency/clients` | Clientes (completo) | 5 ms | 6 ms | 6 ms | 8 ms | 5.8 KB | 5.8 KB | 197.4 KB | 197.4 KB | +0 % |
| `/api/agency/projects?fields=id,name,client_id,client_name,work_order_count` | Proyectos (chrome) | 3 ms | 5 ms | 4 ms | 6 ms | 1.1 KB | 1.1 KB | 8.2 KB | 8.2 KB | +0 % |
| `/api/agency/projects` | Proyectos (completo) | 6 ms | 7 ms | 8 ms | 11 ms | 60.6 KB | 2.1 KB | 361.9 KB | 32.3 KB | -91 % |
| `/api/agency/work-orders?limit=300&fields=id,title,status,project_id,project_name,client_name,due_date` | Órdenes (ventana shell) | 5 ms | 7 ms | 6 ms | 32 ms | 3.8 KB | 3.8 KB | 50.5 KB | 50.5 KB | +0 % |
| `/api/agency/control-center` | Centro de control | 3 ms | 7 ms | 6 ms | 29 ms | 0.4 KB | 0.4 KB | 0.4 KB | 0.4 KB | +0 % |
| `/api/agency/dashboard` | Tablero | 5 ms | 9 ms | 10 ms | 30 ms | 0.4 KB | 0.4 KB | 2.6 KB | 2.6 KB | +0 % |
| `/api/agency/activity?limit=20&offset=0` | Actividad (ventana) | 12 ms | 14 ms | 21 ms | 78 ms | 0.3 KB | 0.3 KB | 4.1 KB | 4.1 KB | +0 % |
| `/api/agency/trash?limit=50&offset=0` | Papelera (ventana) | 3 ms | 4 ms | 5 ms | 6 ms | 0.3 KB | 0.3 KB | 0.3 KB | 0.3 KB | +0 % |
| `/api/agency/productivity/history?limit=10&offset=0` | Historial (ventana) | 4 ms | 6 ms | 7 ms | 12 ms | 0.4 KB | 0.4 KB | 2.9 KB | 2.9 KB | +0 % |
| `/api/agency/invite-links` | Invitaciones | — | — ms | — | — ms | — KB | — KB | — KB | — KB | — |
| `/api/agency/access-requests` | Solicitudes | — | — ms | — | — ms | — KB | — KB | — KB | — KB | — |
| `/api/agency/presence/usage` | Presencia · uso | 4 ms | 6 ms | 6 ms | 11 ms | 58.8 KB | 0.5 KB | 79.9 KB | 2.5 KB | -97 % |
| `/api/agency/notifications?status=all` | Bandeja | 3 ms | 3 ms | 4 ms | 10 ms | 0.4 KB | 0.4 KB | 8.1 KB | 8.1 KB | +0 % |
| `/api/agency/permissions` | Permisos | 2 ms | 2 ms | 3 ms | 4 ms | 1.3 KB | 1.3 KB | 5.9 KB | 5.9 KB | +0 % |
| `/api/agency/settings` | Configuración | 2 ms | 2 ms | 4 ms | 6 ms | 0.2 KB | 0.2 KB | 0.2 KB | 0.2 KB | +0 % |
| `/api/agency/exchange-rates` | Cotizaciones | 2 ms | 2 ms | 4 ms | 8 ms | 0.2 KB | 0.2 KB | 0.2 KB | 0.2 KB | +0 % |
| `/api/platform/overview` | Superadmin · resumen | 2 ms | 6 ms | 2 ms | 13 ms | 0.1 KB | 0.1 KB | 0.1 KB | 0.1 KB | +0 % |
| `/api/platform/agencies?limit=50` | Superadmin · agencias | 2 ms | 3 ms | 2 ms | 3 ms | 0.4 KB | 0.4 KB | 0.4 KB | 0.4 KB | +0 % |
| `/api/platform/users?limit=50` | Superadmin · usuarios | 3 ms | 4 ms | 3 ms | 4 ms | 0.4 KB | 0.4 KB | 0.4 KB | 0.4 KB | +0 % |
| `/api/platform/coupons?limit=50` | Superadmin · cupones | 3 ms | 4 ms | 2 ms | 8 ms | 0.1 KB | 0.1 KB | 0.1 KB | 0.1 KB | +0 % |
| `/api/platform/audit?limit=50` | Superadmin · auditoría | 3 ms | 4 ms | 3 ms | 5 ms | 0.1 KB | 0.1 KB | 0.1 KB | 0.1 KB | +0 % |

## Pantallas (CDP: 40 ms/10 Mbps escritorio y 80 ms/1.6 Mbps móvil)

| Pantalla | Ancho | Red | Peso antes | Peso después | Δ | Lista lista antes | Lista lista después | load antes | load después |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| equipo | 1440×900 | 40ms/10000kbps | 192 KB | 77 KB | -60 % | 178 ms | 181 ms | 132 ms | 131 ms |
| actividad | 1440×900 | 40ms/10000kbps | 191 KB | 76 KB | -60 % | 186 ms | 181 ms | 64 ms | 62 ms |
| historial | 1440×900 | 40ms/10000kbps | 193 KB | 18 KB | -91 % | 180 ms | 177 ms | 58 ms | 56 ms |
| invitaciones | 1440×900 | 40ms/10000kbps | 6 KB | 6 KB | -0 % | 177 ms | 175 ms | 55 ms | 54 ms |
| permisos | 1440×900 | 40ms/10000kbps | 133 KB | 16 KB | -88 % | 173 ms | 179 ms | 53 ms | 55 ms |
| papelera | 1440×900 | 40ms/10000kbps | 132 KB | 15 KB | -88 % | 182 ms | 183 ms | 60 ms | 60 ms |
| preferencias | 1440×900 | 40ms/10000kbps | 132 KB | 15 KB | -89 % | 172 ms | 183 ms | 56 ms | 59 ms |
| configuracion | 1440×900 | 40ms/10000kbps | 133 KB | 16 KB | -88 % | 180 ms | 186 ms | 58 ms | 62 ms |
| superadmin | 1440×900 | 40ms/10000kbps | 4 KB | 4 KB | +0 % | 174 ms | 172 ms | 62 ms | 60 ms |
| equipo | 390×844 | 80ms/1600kbps | 192 KB | 17 KB | -91 % | 218 ms | 230 ms | 96 ms | 106 ms |
| actividad | 390×844 | 80ms/1600kbps | 191 KB | 16 KB | -91 % | 216 ms | 218 ms | 94 ms | 94 ms |
| historial | 390×844 | 80ms/1600kbps | 193 KB | 18 KB | -91 % | 225 ms | 232 ms | 103 ms | 106 ms |
| invitaciones | 390×844 | 80ms/1600kbps | 6 KB | 6 KB | +0 % | 228 ms | 261 ms | 103 ms | 120 ms |
| permisos | 390×844 | 80ms/1600kbps | 133 KB | 16 KB | -88 % | 227 ms | 265 ms | 105 ms | 138 ms |
| papelera | 390×844 | 80ms/1600kbps | 132 KB | 15 KB | -88 % | 223 ms | 396 ms | 102 ms | 129 ms |
| preferencias | 390×844 | 80ms/1600kbps | 132 KB | 15 KB | -89 % | 228 ms | 266 ms | 105 ms | 123 ms |
| configuracion | 390×844 | 80ms/1600kbps | 133 KB | 16 KB | -88 % | 222 ms | 258 ms | 100 ms | 127 ms |
| superadmin | 390×844 | 80ms/1600kbps | 4 KB | 4 KB | +0 % | 123 ms | 122 ms | 124 ms | 122 ms |

\* En Equipo/Actividad la primera visita incluye las fotos del equipo (que ahora se piden una vez y quedan cacheadas): en la visita siguiente esas pantallas pesan 17 KB y 16 KB (ver `mediciones-despues.json`, pasada móvil con las mismas fotos).

