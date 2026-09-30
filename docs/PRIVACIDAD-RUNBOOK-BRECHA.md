# Runbook de brechas de seguridad (≤ 72 h)

> **Operativo desde ya.** Objetivo: detectar, contener, evaluar y notificar una
> brecha de datos personales en **≤ 72 horas** desde que Scale OS toma
> conocimiento, según la Ley N° 7593/2025. Mantener este documento junto al
> manual de incidentes de `backend/OPERATIONS.md`.

## 0. Roles

| Rol | Quién | Responsabilidad |
| --- | --- | --- |
| Coordinador de incidente | [dueño o responsable designado] | Decide alcance, notificaciones y comunicación |
| Responsable técnico | [guardia técnica] | Contiene, investiga y documenta evidencia |
| Contacto ANPDP | `privacidad@scaleparaguay.com` | Presenta la notificación formal |
| Comunicación a titulares | Coordinador | Redacta y envía el aviso a los afectados |

## 1. Detección (0–4 h)

Fuentes: alertas de Coolify, `/health`, logs JSON (`request_error`,
`slow_query`, `maintenance_failed`, `privacy_retention_failed`), reportes de
usuarios, avisos de proveedores (Google, correo, hosting) y la bitácora
`personal_data_access_log` (accesos anómalos a exports/consentimientos).

Registrar de inmediato: **hora UTC de conocimiento**, quién lo detectó, síntoma y
sistemas afectados.

## 2. Contención (0–12 h)

1. Revocar sesiones y credenciales comprometidas sin borrar evidencia:
   `delete from sessions where ...` o bloqueo del usuario/portal afectado.
2. Rotar secretos expuestos (`INVITE_LINK_SECRET`, `DATABASE_URL`, claves de
   correo y OAuth) **desde Coolify**; nunca en el repositorio.
3. Aislar el servicio si siguiera expuesto y, si hace falta, pasar a
   mantenimiento manteniendo la base.
4. Preservar evidencia: exportar logs del rango afectado, `pg_dump` de la tabla
   comprometida y capturas del panel. No ejecutar `delete`/`update` amplios.
5. Activar el canal de incidentes [WhatsApp/teléfono] con el coordinador.

## 3. Evaluación (12–48 h)

Completar la ficha:

| Campo | Valor |
| --- | --- |
| Fecha/hora de conocimiento (UTC) | |
| Fecha/hora de la brecha (estimada) | |
| Causa raíz | |
| Categorías de datos | |
| Volumen estimado de titulares | |
| Agencias afectadas | |
| Riesgo para derechos (bajo/medio/alto) | |
| Medidas de contención | |
| Datos ya notificados a terceros | |

Criterio de notificación a la ANPDP: riesgo para los derechos y libertades de los
titulares (acceso no autorizado a contacto/identidad/facturación, credenciales,
datos de portal). Ante duda razonable, **notificar igual** y documentarlo.

## 4. Notificación (≤ 72 h)

### A la ANPDP (MITIC)

Formato del art. 40 de la ley: identidad y contacto del responsable; descripción
de la brecha; fecha y duración; categorías y número aproximado de titulares;
consecuencias; medidas adoptadas. Enviar por el canal oficial vigente
[canal ANPDP a confirmar] y adjuntar la ficha de la §3.

### A los titulares

Solo si hay riesgo alto: lenguaje claro, qué pasó, qué datos, qué riesgos, qué
hicimos y qué pueden hacer (rotar contraseñas, vigilar comunicaciones). No se
notifica de a uno si el aviso público alcanza y el contacto directo es
desproporcionado; dejar constancia de la decisión.

### A las agencias

El titular de los datos de clientes suele ser cada agencia (responsable). Scale OS
notifica a la agencia afectada y le entrega la ficha y el texto base.
[Definir modelo de carta a agencias.]

## 5. Cierre (≤ 30 días)

- Documentar la causa raíz, la corrección aplicada y las pruebas de regresión.
- Verificar por contenido que la corrección está en `main` (o fuera de
  producción).
- Archivar ficha, notificaciones y evidencia durante [plazo a definir, sugerido
  5 años] en [ubicación].
- Revisar si corresponde actualizar el RAT, la evaluación de riesgo o las
  políticas.

## 6. Simulacro y mantenimiento

- Simulacro semestral de detección → notificación en 72 h (mesa).
- Revisar este runbook tras cada incidente real y cada cambio de infraestructura.
- Los contactos y canales se verifican junto con `DEPLOYMENT.md` en cada release
  mayor.
