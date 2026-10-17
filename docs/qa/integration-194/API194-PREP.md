# Backend194 listo y casos nuevos preparados

El integrador congeló fuente funcional `6e43d30f5363fd656c1c281750ee836957da7194` y preparó un único bump194. Se apagó exclusivamente el launcher anterior374466 y se inició `/workspace/.qa-tools/ui-final241/start-api194-root.py`, ahora apuntando directamente al backend del checkout del integrador `/workspace/.worktrees/integration194/backend` y a sus dependencias reales OwnCoding0.68.19. No se editaron sus fuentes.

Readiness ejecutada: health200/database ready/release1.0.194;116 filas en schema_migrations, incluidas `20261018_client_contacts.sql` y `20261018_workspace_preferences.sql`; auth/me200 de demoA, ordinary, contractOne y contractReadonly. Datos/sesiones originales conservados. Launcher398179, PostgreSQL398194, sesión93570. Next3013 sigue reservado al integrador, sin frontend iniciado por QA. Otros servicios3008/4109/55449 intactos.

## Ajuste de fixture184

Finance tiene clients.manage permitido por defecto en esta versión. Se agregó overridefalse explícito sólo en la organización ordinary sintética del actor contractReadonly. Se creó por POST local la ficha «Cliente sintético QA194 acceso» (ID81), con canales ficticios, y se verificó que el GET de contactos del **mismo cliente/empresa** devuelve403 con ese actor. El dueño ordinary conserva acceso. Descriptor privado600: `contact-fixture194.json`; no se imprimen ni versionan tokens, correos de login o contraseñas. No se enviaron invitaciones ni proveedores.

## Runners preparados, aún no ejecutados

| Runner | Casos previstos |
| --- | --- |
| `browser.mjs` |36 escenarios visuales250/249/206,3temas×390/1440; Resumen compacto con1preview, expansión/lista conservaIDs y vencidas; EstudioHoy/Mes; Contratos0/1/4/readonly0, teclado/foco, descarte local |
| `api-domains.mjs` |184CRUD/403/404/409/principal intacto y limpieza;186scopes/guard409/persistencia y restauración;208catalog no oficial, par inválido400, manual y revisión409 con restauración |
| `preferences-browser.mjs` |Dos contextos nuevos sinStorage mismoactor, otra demo aislada; inicio/filtros persistidos; erroresGET/PATCH503 **inyectados** y retry conserva valor; entrada raíz, deep link y teclado evita redirect tardío; restaura preferencias iniciales |
| `contacts-locality-browser.mjs` |ContactosUI1440/390 conCRUD real, conflicto409 real provocado desde segunda llamada local y recarga explícita; actor denegado; catálogo263, selección/par bloqueado/manual,400 **inyectado** y409 real conservan borrador; guardar y restaurar |
| `contracts-import-browser.mjs` |Después del recorrido de conteos: importa primer modelo en ordinary vacío, edición sin guardar, crea/reabre el mismo borrador porID; limpieza SQL local sólo de IDs nuevos sin versiones emitidas, nunca deshabilita guard de snapshots |

Todos exigen QA_RUN_APPROVED=1 y SHA compilado informado por el integrador. Sólo se ejecutó `node --check` de los cinco archivos. Las aserciones DOM todavía no se acreditan contra el build: los fallos de selector se distinguirán de defectos del producto cuando se ejecute. No hay un resultado global PASS anticipado.

## Orden y límites

Esperar BUILD_ID/startNext y confirmar rewritesloopback; ejecutar matriz de conteos primero. Después, casos API y UI de mutación de forma **secuencial**, sin solapar restauraciones de perfiles/preferencias. #207 lo ejecuta contract_commercial con su tarea separada; este runner no muta sus tareas. La comparación de performance usa el baseline193 previo; no atribuir la desaparición de loader a contenido financiero listo.

Se bloquean hosts externos y escrituras por defecto; los runners de mutación permiten únicamente los endpoints manuales locales de su caso y auditan el resto, incluidos analytics/presence bloqueados. Los fallos503/400 de transporte inyectados se etiquetan como tales; los409 y CRUD se validan con API/DB reales. Restaurar valores no borra la historia ni devuelve los contadores/revisiones al pasado. Si antes no había fila de preferencias/perfil, la restauración puede conservar una fila con contenido por defecto: informar ese efecto de fixture, sin manipular trackers.

No ejecutar mientras el integrador construye ni arrancar un Next alterno. No se contactó producción, OAuth, correo ni IA. Este documento reemplaza el estado backend193 de la preparación inicial; `SETUP.md` conserva ese punto histórico.
