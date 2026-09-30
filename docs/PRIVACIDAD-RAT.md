# Registro de Actividades de Tratamiento (RAT) — Scale OS

> **Borrador técnico.** Base para el registro exigido por la Ley N° 7593/2025.
> El dueño aprueba plazos, responsables y destinatarios finales. Campos entre
> `[...]` a completar. Última revisión de código: v1.0.153 + rama SOS-PLT (#112).

## 1. Identificación

| Campo | Valor |
| --- | --- |
| Responsable | [razón social], RUC [___] |
| Encargado de tratamiento (plataforma) | Scale OS — opera por cuenta e instrucción de cada agencia |
| Responsable de protección de datos | [nombre/cargo], `privacidad@scaleparaguay.com` |
| Autoridad | ANPDP (MITIC) |
| Aviso vigente | `2026-09-30-v1` (`docs/PRIVACIDAD-AVISO-v1.md`) |
| Decisiones automatizadas | No hay decisiones con efecto jurídico ni perfilado; la impugnación se atiende por el canal ARSOP |

## 2. Actividades de tratamiento

| # | Actividad | Finalidad | Titulares | Datos | Base legal | Destinatarios | Conservación | Dónde vive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Cuenta y acceso | `account` | Equipo, clientes del portal | Nombre, correo, foto, sesiones, credenciales (hash) | Contrato / consentimiento | Infraestructura y correo (`PRIVACIDAD-ENCARGADOS.md`) | Mientras dure la cuenta + 30 días de respaldos | `users`, `sessions`, `user_personal_identities` |
| 2 | Operación de agencia (CRM) | `service` | Clientes, prospectos | Nombre/razón social, RUC, correo, teléfono, notas, proyectos, presupuestos, piezas | Contrato / consentimiento declarado por la agencia | Proveedores de infraestructura | Leads inactivos: anonimizar 730 d; clientes: mientras dure la relación (facturas según obligación fiscal) | `agency_clients`, `agency_leads`, `agency_projects`, `agency_work_orders`, `agency_budgets` |
| 3 | Facturación y cobros | `billing` | Clientes | Razón social, RUC, facturas, pagos, saldos | Obligación legal / contrato | Estudio contable de cada agencia [___] | [plazo fiscal aplicable, sugerido 5 años] | `agency_invoices`, `agency_payments`, `bank_accounts` |
| 4 | Portal del cliente | `portal` | Usuarios del portal | Nombre, correo, entregas vistas, comentarios, decisiones, descargas | Contrato | Infraestructura | Igual que la relación comercial | `client_portal_users`, `client_portal_*` |
| 5 | Contacto del sitio | `contact` | Visitantes que consultan | Nombre, empresa, correo, teléfono, mensaje | Consentimiento | Equipo comercial de Scale | Oportunidad inactiva: anonimizar 730 d | `agency_leads` (origen `landing`) |
| 6 | Métricas y presencia | Interés legítimo (agregado) | Visitantes | Eventos de uso, sesión aleatoria sin IP | Interés legítimo | — | Presencia 30 d; uso 90 d (`MAINTENANCE_*`) | `events`, `live_visitor_sessions`, `agency_presence_tabs`, `agency_usage_sessions` |
| 7 | Comunicaciones y avisos | `service` | Equipo, clientes | Correo, asunto y cuerpo de avisos operativos | Contrato | Relay de correo | Notificaciones leídas/resueltas: 365 d | `agency_notifications`, `auth_email_verifications` |
| 8 | Invitaciones y accesos | `account` | Postulantes, invitados | Nombre, correo, estado de solicitud | Contrato | Relay de correo | Solicitudes decididas: 365 d; enlaces e invitaciones cerradas: 365 d | `agency_invite_links`, `agency_access_requests`, `client_portal_invites` |
| 9 | Auditoría y cumplimiento | Interés legítimo / legal | Todos | Quién hizo o vio qué (referencias, no contenido) | Interés legítimo / obligación legal | — | Actividad operativa: 1825 d; bitácora PDP y consentimientos: [definir, sugerido mientras exista la relación + 5 años] | `agency_operation_audit`, `personal_data_access_log` |
| 10 | Respaldos | Continuidad | Todos | Copia completa de la base | Interés legítimo / contrato | [proveedor de respaldo externo — **pendiente de activación**] | [rotación a definir] | Snapshot del volumen Postgres |

## 3. Retención declarada (código)

`backend/personal-data-retention.js` define la política y el job. Valores por
defecto (ajustables por variable de entorno), hoy en modo **reporte**:

| Política | Entidad | Acción | Días | Variable |
| --- | --- | --- | --- | --- |
| `leads_inactive` | `agency_leads` sin actividad y sin conversión | Anonimizar | 730 | `PRIVACY_RETENTION_LEADS_DAYS` |
| `notifications` | `agency_notifications` leídas/resueltas | Purgar | 365 | `PRIVACY_RETENTION_NOTIFICATIONS_DAYS` |
| `access_requests` | `agency_access_requests` decididas | Purgar | 365 | `PRIVACY_RETENTION_ACCESS_REQUESTS_DAYS` |
| `email_verifications` | `auth_email_verifications` usadas/vencidas | Purgar | 30 | `PRIVACY_RETENTION_VERIFICATIONS_DAYS` |
| `portal_resets` | `client_portal_password_resets` vencidas | Purgar | 30 | `PRIVACY_RETENTION_PORTAL_RESETS_DAYS` |
| `portal_invites` | `client_portal_invites` cerradas | Purgar | 365 | `PRIVACY_RETENTION_PORTAL_INVITES_DAYS` |
| `audit_activity` | `agency_operation_audit` | Purgar | 1825 | `PRIVACY_RETENTION_AUDIT_DAYS` |

Ya activas en el job de mantenimiento: `MAINTENANCE_ENABLED`, presencia 30 d,
uso 90 d, sesiones 7 d, throttles y flujos destructivos vencidos.

**Pendiente del dueño:** aprobar los plazos (o fijarlos por contrato con cada
agencia) y cambiar `PRIVACY_RETENTION_MODE=execute`. Hasta entonces las corridas
solo cuentan candidatos y quedan en `personal_data_retention_runs`.

## 4. Consentimientos registrados

`personal_data_consents` guarda: titular (`subject_kind` + `subject_id`),
finalidad, base legal, **versión del aviso**, origen, fecha/hora, evidencia
(método de verificación, declaración de la agencia) y revocación. Un solo
consentimiento vigente por titular y finalidad. La bitácora
`personal_data_access_log` registra otorgamientos, revocaciones, exports,
supresiones y lecturas de salarios.

## 5. Puntos de captura cubiertos

| Punto | Finalidades | Origen | Nota |
| --- | --- | --- | --- |
| Registro (Google y correo) | `account`, `service` | `registration` | Requiere aceptación explícita del aviso (front #113) |
| Invitaciones (Google y correo) | `account`, `service` | `invitation` / `invitation_approval` | Se registra al reclamar y al aprobar |
| Alta de oportunidad/cliente del CRM | `contact` / `service` | `crm_lead` / `crm_client` | La agencia declara la base legal (`lawful_basis`) |
| Formulario del sitio | `contact` | `landing` | Autorización de contacto obligatoria |
| Portal del cliente | `portal` | `client_portal` | Se registra al aceptar la invitación |
| Conversión de oportunidad a cliente | Conserva las finalidades del lead | `lead_conversion` | Idempotente |

## 6. Transferencias internacionales

Ver `PRIVACIDAD-ENCARGADOS.md`. Cada proveedor declara región, garantías y si
trata datos por cuenta de Scale OS o de cada agencia. **Pendiente:** confirmar
regiones y cláusulas con el dueño antes de publicar el aviso.
