# SSO empresarial (SAML/OIDC) — evaluación para #159, Fase 2

Evaluación solicitada por el dueño: SSO empresarial para clientes/agencias con
dominio propio. No se implementa nada hasta su aprobación.

## Situación actual

- Login social Google + (Fase 1 de #159) Microsoft y Apple, y correo/contraseña.
- Identidades sociales en `user_social_identities` (proveedor + subject), con
  vinculación por correo verificado.
- `oauth_states` ya guarda `organization_slug` (hoy vacío) y soporta contextos
  (trial, invitación, portal, re-auth).
- Límites actuales para multi-tenant: redirect URIs y allowlists por env fijo
  (`allowedOrigins`, `clientOrigins`), sin metadata por organización.

## Opciones

| Opción | Costo | Esfuerzo | Ventaja | Riesgo |
|---|---|---|---|---|
| **OIDC por organización** (Entra ID, Google Workspace) | US$ 0–6/usuario/mes (el IdP del cliente ya existe) | Medio (2–3 semanas): routing por dominio verificado, discovery/metadata, JIT provisioning, pruebas por IdP | Estándar moderno, sin XML, reutiliza `user_social_identities` con `provider='oidc:<org-slug>'` | Verificación de dominio, altas/bajas JIT, soporte por IdP |
| **SAML 2.0 propio** | US$ 0 (código) + mantenimiento | Alto (5–8 semanas): firma/validación XML, metadata, attribute mapping, casos borde de cada IdP | Compatibilidad con enterprise legacy | Superficie de seguridad grande y costosa de mantener |
| **Broker (WorkOS/Scalekit/SSOJet)** | US$ 125–299/mes + por conexión según volumen | Bajo (3–5 días): el broker normaliza SAML/OIDC | Time-to-market y cobertura SAML sin mantener XML | Dependencia y costo recurrente; datos de identidad por un tercero |
| **Self-hosted (Keycloak)** | VPS US$ 10–20/mes + mantenimiento | Medio-alto: operar, actualizar y respaldar otro servicio | Control total, sin costo por usuario | Otro sistema crítico que operar y parchear |

## Recomendación

1. **Fase 2A — OIDC por organización** (primero Entra ID y Google Workspace):
   - `organization_identity_providers` (org, tipo, issuer, client, metadata) +
     `organization_email_domains` (dominio verificado → org).
   - Login: si el correo pertenece a un dominio verificado, se ofrece/forza el
     IdP de esa organización; JIT crea la membresía con el rol mínimo (`viewer`)
     y la administración la ajusta (o queda pendiente de aprobación).
   - Reutiliza el módulo social (`provider='oidc:<org>'`), con redirect URI
     dinámica y allowlist de orígenes por organización.
2. **Fase 2B — SAML solo por demanda pagada**, y vía broker (WorkOS o similar)
   para no mantener XML propio. Se activa cuando un cliente lo exija por
   contrato.

## Costos de referencia (2026)

| Proveedor | Referencia |
|---|---|
| Entra ID / Google Workspace | Incluido en la suscripción del cliente (US$ 0 para Scale) |
| Okta / Auth0 B2B | ~US$ 2/usuario/mes · planes B2B desde ~US$ 150/mes |
| WorkOS | ~US$ 125/mes base + conexiones según volumen |
| Keycloak self-hosted | VPS US$ 10–20/mes + operación |

## Prerrequisitos técnicos (ya identificados)

- Redirect URIs y orígenes permitidos dinámicos por organización (hoy por env).
- Verificación de dominio (DNS TXT o meta) antes de habilitar el routing.
- SCIM/deprovisionamiento opcional (fase posterior si un cliente lo pide).
- Auditoría de altas/bajas y bitácora de accesos por organización.

## Decisión pedida al dueño

1. ¿Aprobamos Fase 2A (OIDC por organización) como próximo paso, sin SAML?
2. ¿SAML solo vía broker y solo si un cliente pagado lo exige?
3. ¿Presupuesto tope mensual para broker si se activa (referencia US$ 125/mes)?
