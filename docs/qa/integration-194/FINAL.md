# QA local integrada194

🟢 Hecho. Chromium real contra Next production del integrador3013, BUILD_ID `idq89FzslJpah3GGyKU5u`. Fuente funcional de inicio del build `bf7ae3983582c6fd6ae36cb8c3e58aa1e3339b4b`, con metadata194 preparada; el integrador confirmó el commit posterior de release `e74eab6a4a50d140ce5dc887ea8f8c34cc3039e9` sin cambios funcionales. API local4115/PG55450: health200, database ready,1.0.194 y116migraciones. SDK servido OwnCoding0.68.19. Rewrites `/core-api`, `/p` y `/review` comprobadas exclusivamente a4115.

🔵 Validado en este candidato:

| Evidencia | Resultado observado |
| --- | --- |
| Matriz #250/#206/#249,390/1440×claro/oscuro/contraste | **36 escenarios,163/163 PASS** |
| API real #184/#186/#208 | **19/19 PASS**, restauraciones200 |
| Preferencias #186, contextos nuevos y cuenta real local | **14/14 PASS**, preferencias restauradas |
| Contactos #184, UI1440/390+actor denegado | **13 comprobaciones completas PASS**, extraídas del run bruto que después se detuvo por selector de localidad |
| Localidad #208, repetición exclusiva1440/390 | **12/12 PASS**, perfil restaurado200 |
| Importación de modelo/crear y reabrir borrador #250 | **6/6 PASS**, fixture0plantillas/0contratos restaurada |

No se observó un defecto de producto pendiente en estos flujos. No se anuncia un único proceso global verde: el run mixto de contactos/localidad conserva `passed:false` por errores del harness descritos abajo. Los subconjuntos posteriores se acreditan por sus JSON, sin reescribir los fallos originales.

## Criterios acreditados

#250: header con una sola acción Nuevo contrato; dueño sin plantillas ve botón deshabilitado con explicación asociada y gestión abierta;1/4 plantillas arrancan con gestión secundaria cerrada. Readonly no recibe acciones imposibles ni instrucciones de crear. Summary nativo funciona por teclado; abrir/cancelar preview devuelve foco al trigger. El borrador local sobrevive «Seguir editando» y se descarta sólo tras confirmar. Después del recorrido de conteos se importó el primer modelo por POST201; su editor contenía el texto real, gestión siguió abierta y Nuevo contrato quedó habilitado. Se creó un borrador201 y se reabrió el **mismo ID** mediante GET. No se emitió PDF/versión nueva. Limpieza SQL local sólo de los IDs nuevos sin versiones emitidas; no se desactivó inmutabilidad ni se tocó la fixture emitida de contractOne. Create/templates_manage están acoplados a contracts.manage; no se inventaron actores create-only/manage-only.

#206: preview de una tarea, Hoy3 y vencida1; expandir y cambiar a lista conserva los mismos IDs; la vencida es otra tarea. Primer pliegue móvil muestra tareas compactas y señales operativas. Sin mutaciones de tareas; #207 avanzado corresponde al agente comercial, con tenant propio, y no forma parte de este informe.

#249: Hoy móvil muestra sólo las dos reservas del17 según America/Asuncion; Mes completo conserva las tres, incluida la del18. Teclado y overflow de documento correctos en la matriz. ProbeDOM adicional390 claro, scrollY0: primera reserva y563,78125/bottom757,625; Hoy44×44 en y503,78125. La comparación visual histórica disponible usa `/tmp/scale241-app-final/screens/390-light-estudio.png` del build **0afdbd08**, no193final. `screens-index.json` registra SHA256 before/after y el límite: sirve como antes/después visual, no como comparación controlada de193 ni prueba de causalidad/performance.

#184: contacto hijo creado/actualizado/eliminado por UI en ambos tamaños. Una segunda llamada local avanzó la versión; el PATCH obsoleto devolvió409 real, conservó el borrador y exigió confirmación para reemplazarlo por la versión actual antes de guardar. Actor finance con override **clients.manage=false** en la misma organización muestra contenido reservado y ninguna acción de agregar. API confirmó403/tenant ajeno404 y principal intacto. Los contactos originales quedaron iguales; no se borró historia/auditoría.

#186: dos contextos sin localStorage con el mismo actor recuperan inicio desde servidor; filtros de responsable/semana se guardan mediante UI. Otra demo permanece aislada. PATCH503 y GET503 fueron **inyectados en transporte**, no fallos espontáneos del backend; valor local pendiente sobrevivió recarga, Reintentar lo guardó y un tercer contexto limpio lo leyó. Entrar a raíz usa inicio guardado; enlace explícito gana y una interacción de teclado previa impide redirect tardío. No se probó OAuth real. Las preferencias se restauraron al terminar.

#208: catálogo263 identificado como heredado/no oficial, selección rellena y bloquea par ciudad/departamento; manual vuelve a permitir edición. API rechazó un par incompatible400 real. UI conservó borrador ante400 **inyectado** y409 **real** por revisión concurrente; tras recargar expresamente permitió guardar localidad manual con procedencia manual. Contenido original restaurado; revisiones/auditoría permanecen.

## Intentos del harness y repeticiones parciales

| Archivo bruto preservado | Motivo observado | Corrección y alcance repetido |
| --- | --- | --- |
| `harness-initial-email.json` |0checks: el campo canónico de correo es input[type=email] etiquetado porID y no tiene name=email | Selector propio corregido; primera ejecución de los casos CRUD aún no acreditados |
| `contacts-raw-harness-locality.json` |13checks de contactos +1catálogo PASS; después selector de localidad no encontraba el sufijo accesible «· Opcional» | Se reconoció ese sufijo; **sólo localidad** se repitió; no se duplicó el CRUD verde |
| `harness-uncorrected-400.json` |3checks PASS; el runner esperaba reenviar un campo con error400 sin corregirlo y no observó otro PATCH | Se editó la ciudad para corregir el error antes del envío con revisión obsoleta; sólo localidad se repitió y pasó12checks |

`contacts-accepted-subset.json` conserva las13 aserciones ya completadas y referencia al resultado bruto, con rawOverallPassed:false. No es un nuevo replay inventado. El probe de localidad capturó el mensaje «Revisá la ciudad»/400 antes de corregirla; el error de validación de producto era el comportamiento esperado.

## Archivos, pruebas y límites

📁 Runners y JSON en esta carpeta. `matrix-results.json`, `preferences-results.json`, `locality-results.json`, `contract-import-results.json` y los brutos anteriores conservan evidencia. Sólo se ejecutaron estos casos focales y sus node--check; gates globales/CI pertenecen al integrador.

🧪 Todos los navegadores propios finalizaron. Cero errores runtime y cero proveedores externos en los casos observados. Analytics/presence se bloquearon y auditaron; sus errores de recurso se conservan donde corresponden y **no se afirma consola global limpia**. Mutaciones permitidas únicamente en endpoints manuales locales del caso, secuenciales y restauradas; las restauraciones no rebobinan versiones ni borran auditoría. Si antes no había fila de preferencias/perfil puede quedar una fila con valores restaurados. Ningún tenant real, correo, publicación, IA ni OAuth.

Capturas seleccionadas y hashes: `screens-index.json`; PNG permanecen en `/tmp`, sin force-add, conforme al ignore que protege el contexto de Coolify. Screenshots contienen sólo fixtures sintéticas y no tokens. No se reproducen aquí mediciones de performance #254: corresponden al agente encargado y se hicieron en ventana separada después de cerrar estos browsers.

🚀 Deploy: no ejecutado desde QA. Next3013 es propiedad del integrador y se conserva. API/PG propios quedan disponibles hasta su señal de limpieza. Esta evidencia acredita el candidato local y no sustituye CI, merge ni smoke de producción.
