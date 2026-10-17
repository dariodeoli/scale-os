# Unificación local de UI — ScaleOS

Issue: https://github.com/dariodeoli/scale-os/issues/241
Rama: codex/ui-unificacion-local. Base: origin/main 0310a41b.

## Qué cambió

La implementación prioriza la aplicación existente. Se auditó antes de editar y antes de comparar OwnCoding UI. Se conservaron contratos comerciales y se consolidaron modelos locales, en lugar de crear componentes por acción o pantalla.

- 422 botones nativos de acción migrados a Button;14 archivos que importaban Button externo ahora usan el canónico local. Variantes, tamaños, loading, disabled, íconos, form/type/ref y tokens compartidos.
- Input/Textarea locales:43 inputs y25 textareas nativos adicionales migrados, además de equivalentes externos y los4 campos semánticos. Las props/eventos/refs y el valor se conservan.
- 10 fechas/horas migradas a DateInput/TimeInput/DateTimeInput sin conversión UTC.
- SearchField unificado en19 consumidores/20 instancias; callback de valor, limpiar sin submit/foco y retiro de padding compensatorio.
- Teléfono alineado a12 códigos del API sin cortar dígitos; prefijos desconocidos visibles. Email con máximo 254 e IDs únicos según contrato real.
- Editor valida metadata declarada, fechas imposibles y HH:mm modificados; respeta defaults históricos intactos, bloqueo de contraseña e integerOnly del consumidor.
- Lookups genéricos proponen cambios y exigen Aplicar/Descartar. La confirmación existente de RUC se conserva como único paso, sin pedir dos veces. Las respuestas tardías no pisan lo manual; no encontrado y errores conservan borrador.
- PlainSelect existente mejora opciones disabled, búsqueda por datos configurables, loading/error/vacío, Escape/Tab/flechas. Logos usan FotoPerfil; se separó su política pura de la UI de auditoría.
- Biblioteca interna tipada app/ui, catálogo opt-in y documentación de canónicos/contratos/migraciones/riesgos.

El archivo migration-241.json enumera105 archivos con adopción del modelo. El inventario inicial118 archivos/518 botones también incluye widgets de navegación/selección/calendarios que conservan su semántica propia; no se atribuye una conversión indiscriminada de todo HTML.

## Canónicos conservados y diferencias deliberadas

Dialog es la base de modal/drawer/confirmaciones; SaveActions mantiene el form asociado aunque el footer viva en un portal. FotoPerfil es la base de identidad. ui-v2 conserva listas/celdas/alineación/estados, y ui-system.css los tokens de superficies/densidad. notify/NotificationCenter sigue siendo un solo circuito.

PersonSelect (combobox) y AssigneePicker (multiselección de responsables) no se reemplazan por apariencia: tienen contratos de teclado y reglas diferentes. Las reglas de activos, permisos, rol, identificadores y fuentes de datos permanecen fuera de los fundamentos compartibles. No se crea una supuesta relación ciudad/departamento sin catálogo respaldado.

## Cómo revisar

Activar SCALE_UI_CATALOG=1 y abrir /ui-catalog en el servidor local. Sin esa variable, la ruta devuelve 404. El catálogo contiene ejemplos aislados, props, estados y reglas correctas/incorrectas; no llama a APIs de clientes. Instrucciones exactas en app/ui/README.md.

Auditoría: AUDITORIA.md, CAMPOS.md, CONSUMIDORES.md. Evidencia real de navegador: VALIDACION-CHROME.md. Publicación y límites de compatibilidad: PUBLICACION.md.

## Pendientes reales

- Corregir el parser de cantidad con coma entre total y payload de presupuestos.
- Resolver guardado parcial ficha+plan mediante prevalidación/transacción y comunicación de resultados.
- Acreditar procedencia de fotos en consumidores que omiten verified antes de cambiar confianza.
- Fuente respaldada para relaciones geográficas y búsqueda/deduplicación general por email/teléfono.
- Paridad y revisión del paquete público/consumidores externos antes de liberar una versión compartida.
- Verificación autenticada de todos los tenants/roles/módulos en entorno de integración y posterior despliegue autorizado.

No se modificó producción ni se liberó una versión de OwnCoding UI. Este trabajo es una implementación local con PR para revisión; el issue sigue abierto por los pendientes.

## Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| npm run test:release-regression | PASS completo:243 entradas/44 fragmentos; incluye pruebas unitarias/componentes/integración simulada de consumidores |
| npx tsc --noEmit --incremental false | PASS |
| npm run db:generate | PASS; Prisma Client 6.19.2 local |
| npm run build | PASS; BUILD_ID generado |
| node backend/test-ruc.mjs desde backend | PASS con PGlite/proveedor simulado: no encontrado, errores, cuota, unicidad/deduplicación y refresh no destructivo |
| npm run release:check / footer:check | PASS |
| git diff --check | PASS |
| Migrador AST --check | Lista vacía: sin consumidores pendientes del modelo auditado que selecciona |
| Chrome | Claro/oscuro,390/768/1440, borrador/foco/error, confirmación de cierre y teclado de dropdown; ver VALIDACION-CHROME.md |
| Lint independiente | No disponible: el repo no declara script ni configuración de lint. La etapa de Next no se presenta como sustituto |

La revisión de OwnCoding UI se hizo al final y detectó contratos distintos en variantes/loading/ref y callback de búsqueda. La propuesta de publicación está preparada, pero no se publicó un paquete ni se cambió la dependencia. Los adaptadores comerciales permanecen en Scale.
