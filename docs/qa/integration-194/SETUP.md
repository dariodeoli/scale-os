# Preparación de QA integrada194

Estado histórico inicial193; readiness actualizada a backend194 en [API194-PREP.md](API194-PREP.md). Frontend/recorrido todavía no ejecutados. Rama aislada `codex/qa-integration194`, worktree `/workspace/.worktrees/qa-integration194`, backend desde `origin/main` `2ecdc7f38f466f29a37194783726b985583a5b0e` (193). Dependencias enlazadas a las instalaciones locales existentes; no se modificaron fuentes de producto ni configuraciones compartidas.

| Recurso propio | Valor |
| --- | --- |
| API loopback / interno | 4115 / 4116 |
| PostgreSQL17 | 55450 |
| Launcher / sesión | PID374466 /12779 |
| PostgreSQL | PID374482 |
| Datos preservados | `/workspace/.qa-tools/ui-final241/database/data` |
| Lanzador privado | `/workspace/.qa-tools/ui-final241/start-api194.py` |
| Log privado600 | `/tmp/scale-integration194-api.log` |
| Next3013 | Libre, reservado al integrador; no se inició |

El nuevo lanzador apunta al backend193 de este worktree, evitando el checkout antiguo de QA191. Health200, database ready, metadata1.0.193; sesión demoA auth/me200. API/PG de3008/4109/55449 ajenos se conservaron. El log contiene credencial sintética de arranque: no volcarlo completo.

## Fixtures acreditadas por API

| Contexto | Datos | Archivo privado de sesión600 |
| --- | --- | --- |
| demoA existente | 3 tareas propias Hoy17/10/2026;1 vencida16/10;2 reservas17/10 y1 el18/10;4 plantillas/4 contratos | `demoA-session` |
| Dueño local ordinary | 0 plantillas/0 contratos | `ordinary-session` |
| Demo contractOne nueva | 1 plantilla/1 contrato con versión emitida de ejemplo preservada | `contractOne-session` |
| Finance local sólo lectura | 0 plantillas/0 contratos; contracts.view=true,create/manage/issue=false | `contractReadonly-session` |

Los archivos están bajo `/workspace/.qa-tools/ui-final241/`, no se versionan tokens, credenciales ni respuestas auth privadas. `fixtures194.json` y `readiness194-private.json` conservan descriptores locales600. Las reservas usan timestamps reales de la fixture,12:00Z/17:00Z del17 y13:00Z del18; la prueba debe mostrarlas en America/Asuncion y no comparar strings UTC con fecha civil sin conversión.

La fixture de una plantilla se creó como demo local nueva y se retiraron sólo sus borradores/plantillas no referenciadas. Una primera preparación intentó retirar la versión emitida de ejemplo: la guarda de inmutabilidad rechazó la operación y la transacción completa hizo rollback. No se deshabilitaron triggers ni se alteraron snapshots emitidos; esa demo inicial sin uso conserva su TTL. El actor readonly se agregó por SQL únicamente a la organización ordinary sintética, con hash de credencial local y login local; no se envió invitación/correo. Los overrides finance están limitados a esa organización local.

La API actual une create y templates_manage a `contracts.manage`: no se inventa una fixture real create-only/manage-only que el contrato no expone. Para readonly se acreditó la configuración efectiva con GET; la UI todavía no se probó.

## Protocolo cuando llegue el candidato

Esperar SHA integrado, BUILD_ID y señal del integrador. No iniciar Next ni compilar por cuenta propia mientras3013 está reservado. Comprobar rewrites `/core-api`, `/p` y `/review` exclusivamente a4115 antes del navegador. Informar el backend193 y frontend194 por separado si la metadata difiere.

- #206 Resumen:390/1440×claro/oscuro/contraste, primer pliegue y prioridad de tareas, vencida/Hoy; checklist y navegación conservan identidad real, no se confunden tareas internas y piezas.
- #249 Estudio: misma matriz, reserva de Hoy17 frente a18, legibilidad/densidad, foco y teclado sin reprogramar por accidente; conservar fechas originales.
- #250 Contratos:0/1/4 plantillas y readonly0; header Nuevo contrato, explicación accesible cuando no hay plantilla, gestión secundaria y permisos; teclado, foco, borrador e importación sólo sintéticos. Las capturas comparativas193 de0/1 no existen en este ciclo: no afirmar un before/after que no se capturó. Las capturas finales se generan sólo sobre candidato servido.
- #254 dependencia/carga: comparación acotada contra baseline193 registrado en `docs/qa/performance-initial-load-252/`, logos reales complete/naturalWidth y recursos bancarios diferidos; informar condiciones y contenido listo, no sólo desaparición del loader. El timestamp de auth es desde navegación, no RTT del backend.

Bloquear hosts externos y auditar analytics/presence separadamente. Bloquear escrituras por defecto; permitir sólo las mutaciones manuales locales estrictamente necesarias para los casos autorizados, con before/after y restauración del contenido sin borrar historia. Ningún OAuth, correo, proveedor de IA, publicación o tenant real. No presentar los guards de pruebas o mocks como QA del candidato integrado.

## Arranque y limpieza propios

```bash
python3 /workspace/.qa-tools/ui-final241/start-api194.py
```

Antes de reiniciar, comprobar que este launcher ya no esté vivo; no arrancar dos contra el mismo PG. Para apagar este arranque, comprobar PID/argumentos y enviar SIGTERM exclusivamente a374466; el launcher cierra su API/proxy/PG y preserva datos. No ejecutar kill global ni tocar los servicios ajenos o el futuro Next del integrador.
