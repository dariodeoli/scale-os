# Scale 1.0.194 — operación y rendimiento

Candidato validado localmente sobre main 193 (`2ecdc7f38f466f29a37194783726b985583a5b0e`). PR, CI, merge y publicación pendientes al redactar. Todavía no se inició un deploy 194.

## Cambios

Contratos prioriza Nuevo contrato (#250); Estudio móvil abre en Hoy (#249); Resumen muestra una tarea compacta y permite ampliar la misma lista/cuadrícula (#206). Se agregan contactos secundarios (#184), preferencias persistentes (#186), selección de localidad con procedencia y carga manual (#208), y logos bancarios diferidos (#254). Se conserva la evidencia pública de 193 y la [auditoría histórica del backlog](audits/194-backlog-status.md).

La localidad seleccionada valida ID, pareja ciudad/departamento y versión del catálogo heredado. El catálogo no se presenta como oficial. Los valores manuales y la procedencia se conservan.

## Dependencia compartida

OwnCoding UI 0.68.19: PR upstream #62 integrado en `7cf63ad530384b2887551ddb50c9261270762202`; CI del candidato 39070853594 y de main 39071017582 aprobados. Tag anotado publicado una sola vez: objeto `4646afaed33f4416f1c83cdfbb2018b1001489ab`, destino `7cf63ad`. APIs legacy conservadas, 89 recursos y 108 casos SSR equivalentes; presupuestos anteriores intactos. La galería web no fue desplegada ni acreditada.

Frontend y backend instalan el tag Git fijo, con resolución comprobada a `7cf63ad`. El primer lockfile frontend reutilizaba 18 pese a pedir 19; se regeneró mediante instalación explícita y se comprobó la versión instalada antes del build. [Prueba del paquete publicado](integration-194/published-package19.json): los 89 recursos instalados coinciden por SHA-256 con el baseline. No se afirma identidad binaria de los 273 archivos: los 53 grupos diferidos reciben nombres de chunk distintos por rutas virtuales absolutas de source maps; sus módulos de runtime y recursos coinciden. No se reescribió el tag.

El candidato específico 193+208 pasó 59 scripts backend y el build Docker completo Node 24 Alpine con git/SDK 19. Su runtime sin red importó los módulos reales. Se usó CA pública temporal mediante secreto BuildKit, conservando TLS y checksums. Esa imagen no se presenta como imagen del árbol combinado 194.

## Gates del candidato combinado

- Regresión frontend: **266 entradas en 48 fragmentos, PASS**.
- Backend completo: **61 scripts, exit 0**, incluidos bootstrap 116, contactos, preferencias y localidad.
- Build Next 15.5.24: **exit 0**, 64 páginas, BUILD_ID `idq89FzslJpah3GGyKU5u`. Fuente del primer build al iniciar la compilación: `bf7ae3983582c6fd6ae36cb8c3e58aa1e3339b4b`; la metadata 194 ya estaba presente al compilar. Esa matriz precede a la corrección puntual del tamaño del logo descrita abajo. API local 4115 con metadata 194; los tres rewrites apuntan exclusivamente a ese puerto.
- Guard inicial: login 1.229.115 B raw / 369.149 B gzip calculado, 21 scripts; status 649.121 / 195.894 B, 14 scripts; registro 919.154 / 279.390 B, 17 scripts. Sin arte financiero inicial ni ampliación de presupuestos. Versión y footer: PASS.
- **17 grupos de navegador canónicos, PASS**. Dos herramientas CSS resolvían React desde backend 19 para componentes frontend 18; ahora renderer y componentes usan React del frontend, conservando Puppeteer del backend y todas las comprobaciones.
- Bootstrap 116 focal en **PGlite y PostgreSQL 17.11 real, PASS**: conserva 110→111→114 y agrega 114→116, con contactos/preferencias poblados, snapshots y tracker preservados tras reinicios.

Se aplicó un único bump a 194. La preparación se detuvo en una comprobación histórica de tareas; la prueba ahora exige permiso y vista completa. También se documentó el segundo cálculo civil Date.UTC de Estudio, sin usar el reloj UTC para fechas por defecto, y se amplió el fixture bootstrap anterior sin perder sus fronteras históricas. Se repitieron los gates afectados; no se repitió el bump. Commit de versión: `e74eab6a`.

## Aceptación funcional local

- API 194: **19 comprobaciones PASS** de CRUD, permisos y CAS de contactos; scope y persistencia de preferencias; selección/manual/400/409 de localidad. Fixtures restauradas. [Resultados](integration-194/API-RESULTS.md).
- App compilada: **163 comprobaciones en 36 escenarios PASS**, 390/1440 y temas claro/oscuro/contraste: Contratos con 0/1/4 plantillas y solo lectura, Resumen compacto/lista/cuadrícula, Estudio Hoy/Mes. Sin errores runtime ni proveedores externos.
- Flujos adicionales: preferencias entre contextos **14 PASS**, contactos **13 comprobaciones UI PASS**, localidad **12 PASS**, contratos **6 PASS** con importación, reapertura del mismo ID y restauración. Los primeros intentos fallaron por selectores o esperas del harness: EmailField compuesto, sufijo Opcional y reenvío tras 400 sin corregir el campo. Se conservaron esos intentos y se repitieron sólo los subsets afectados; no se cambió el producto para satisfacer selectores.
- #207: **119/119 PASS** en 1440/390 con navegación SPA, un único GET documental, timeOrigin y marcador de sesión estables. Checklist, reprogramación, completado y restauración se reflejan entre Resumen/lista/cuadrícula y Proyecto, conservando IDs, CAS, refetch y contadores. Fixture sintética propia restaurada sin borrar historial; sin POST de UI, errores runtime ni proveedores.

Las capturas corresponden al candidato identificado. El baseline visual histórico de Estudio pertenece al build `0afdbd08`, no al SHA final publicado 193. Las imágenes quedan fuera del repositorio según `.gitignore`; se conservan rutas, hashes y métricas en los informes.

## Rendimiento de Balance

Medición local después de finalizar los gates y otros Chromium, con las mismas condiciones del baseline: 1,6 Mbps, 150 ms y CPU ×4. Balance usable en **5,101 s escritorio / 5,126 s móvil**, frente a 14,442 / 14,311 s del precursor 193 `21fe88ad`: reducción aproximada del **64–65 %**. JavaScript al deadline: 451.411 / 443.315 B de red CDP frente a 2.255.720 B, aproximadamente **80 % menos**.

La comparación no es contra el SHA publicado 193 exacto ni mide producción. Continental estaba fuera de pantalla: se reveló después del deadline más 2 s y se verificó decode real, 201×40, además del crop visible de 52,4375×10,4375 px dentro de ambos viewports. Esa espera de 2 s no es latencia de la app. No había solicitudes JavaScript en vuelo al medir; no hubo errores de página ni hosts externos. El informe específico distingue deadline, carga final, bytes comprimidos y recursos originales. El grupo bancario servido mide 10.713 B descomprimidos, 6.938 B de cuerpo gzip y 8.096 B de red CDP, que incluye cabeceras y overhead.

La revisión visual anterior descubrió un defecto preexistente en el consumidor: `alto="24px"` se interpretaba como clase CSS y dejaba la imagen en 0×0 aunque decode() aprobara. Se corrigió a la clase canónica `h-6` en `aabcaee3`; no se cambió el tag del SDK. El build final **GqJFkxpQNFfrgoIPojWVw**, fuente `aabcaee3`, pasó build y guard inicial. Los focales de Finanzas y las 30 comprobaciones de arquitectura/acciones pasaron; conserva 602 acciones canónicas, 55 widgets estructurales exactos y cero sitios sin revisar. La medición de esta sección corresponde al build final, con tamaño positivo y visibilidad real, sin overrides CSS. Se conserva el resultado previo de tamaño cero y el intento del harness que midió posición antes de estabilizar el scroll. La regresión frontend completa se volvió a iniciar sobre la corrección final; su cierre y CI se registrarán en el PR.

## Límites externos

No se acreditan OAuth real, proveedores comerciales Groq/OwnData, conciliación operativa, Search Console, impresión/escaneo físico, causa de la caída de Coolify ni planificador persistente de agentes. Sus seguimientos permanecen abiertos. El acceso público 193 fue comprobado nuevamente con HTTP 200 y database ready el 17/10/2026 a las 21:16 UTC (18:16 en Asunción). No se atribuye un SHA a contenedores cuando el proveedor no lo expone.
