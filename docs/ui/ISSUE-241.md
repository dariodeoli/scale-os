## Objetivo

Consolidar la UI existente de ScaleOS antes de buscar/adoptar/publicar cambios en OwnCoding UI. Preservar contratos, permisos, borradores, foco, errores, datos históricos y acciones de negocio. No desplegar ni modificar producción desde esta rama.

## Auditoría

Base origin/main 0310a41b. Inventario estático de118 archivos:518 botones nativos, incluyendo widgets especializados. Matrices completas: docs/ui/AUDITORIA.md, CAMPOS.md, CONSUMIDORES.md e inventory-baseline.json. Auditoría y decisión de canónicos previas a los cambios y a la revisión externa.

## Implementación local

- [x] Button local tipado con variantes/tamaños, íconos, loading/disabled, ancho, type/form/ref. Migrados422 botones nativos de acción, clases dinámicas y los14 consumidores que importaban Button externo. Modelo y tokens comunes; acciones en consumidores.
- [x] Input/Textarea locales con props/ref nativos;4 campos semánticos los componen. Migrados43 inputs y25 textareas nativos adicionales, además de imports equivalentes externos.
- [x] DateInput/TimeInput/DateTimeInput nativos sin conversiones UTC;10 controles temporales migrados. Min/max/step elegidos por consumidor.
- [x] SearchField único:19 consumidores/20 instancias, callbackstring, clear sin submit/foco, etiquetas/disabled/errores y retiro de padding por pantalla.
- [x] PhoneField con12 códigos aceptados por API, prefijo desconocido visible, sin truncado de longitud al montar; email con máximo 254 según API e IDs únicos para sugerencias.
- [x] Editor propaga integerOnly y disabled de contraseña; valida metadata declarada, calendario civil y HH:mm en campos modificados sin rechazar automáticamente defaults históricos intactos.
- [x] Consultas genéricas requieren Aplicar/Descartar; respuesta tardía, proveedor caído y no encontrado conservan datos manuales. Se excluyen claves desconocidas y campos deshabilitados.
- [x] SelectCustom/PlainSelect existente ampliado con datos secundarios, búsqueda por tres datos, logo sobre FotoPerfil, opciones disabled y estados loading/error/vacío. Escape restaura; navegación omite disabled; Tab sale del portal.
- [x] Biblioteca interna app/ui, contratos documentados, un solo FotoPerfil; política de medios separada del render de auditoría para evitar acoplamiento circular.
- [x] Catálogo opt-in /ui-catalog sin API productiva, ejemplos/props/reglas, tema claro/oscuro y prueba de error.

## Canónicos que se conservan

Dialog/ConfirmDialog/SaveActions; FotoPerfil/PersonContainer/ActorIdentity; ui-v2 listas/celdas/estado; tokens panel/ops-card; notify/NotificationCenter; TabScroller/ActionMenu/ViewSwitch. No crear copias por pantalla. PersonSelect es combobox, AssigneePicker es multiselección con reglas de responsables y EntityPicker es composición: mantener distintos contratos de teclado y negocio, no declarar equivalencia por apariencia.

## Contratos de campos

- RUC: normalizador existente, consulta a proveedor separada, sin inventarDV; ClientEditor ya exige confirmación y backend mantiene unicidad por organización. Guardas de no encontrado/errores/borradores en pruebas locales.
- Email:254 según validador/API; no recortar legacy ni sobrescribir con sugerencias.
- Teléfono:PY8/9 dígitos, resto6–12, política local del API; valores desconocidos conservados para corrección explícita.
- Fechas:calendario civilYYYY-MM-DD, sin UTC; horas nuevasHH:mm, segundos históricos intactos cuando no se editan.
- Monto:PYG entero; demás según moneda/endpoint; integerOnly explícito para previsiones/planes. No convertir monedas ni confundir cantidades/porcentajes con dinero.
- Límites:maxLength solo si declarado y respaldado; sin límites inventados de ciudad/código postal/etc.

## Riesgos y pendientes

- [ ] Cantidad con coma en presupuestos usa parsers distintos entre validación/total/payload. Hallazgo documentado; necesita corrección comercial y pruebas propias.
- [ ] Guardado ficha+plan puede ser parcial: prevalidación/transacción debe resolverse fuera de una sustitución visual.
- [ ] Confianza de fotos omitida en algunos consumidores: validar origen antes de cambiar verificado global.
- [ ] No existe catálogo relacional confiable de ciudad/departamento ni lookup general email/teléfono para deduplicación. No inventar integración.
- [ ] Paridad entre combobox/multiselección y eventual modelo público; conservar reglas de responsables fuera de UI compartida.
- [ ] Controles temporales nativos dependen de navegador/locale; no se implementó calendario/rueda propio con confirmación adicional.
- [ ] Revisar compatibilidad externa solo después de consolidación local; transportar candidatos puros al componente existente, no duplicar nombres ni publicar reglas comerciales.
- [ ] Publicación de paquete/consumidores externos, integración y despliegue se verifican por separado. Este issue permanece abierto.

## Verificación y aceptación

Ejecutar suite de regresión completa, tests unitarios/componentes/integración de campos, formularios con errores, foco/teclado/selectores/RUC/monedas; TypeScript, Prisma generate, build/BUILD_ID, release/footer y diffcheck. Verificación real Chrome de claro/oscuro,390/768/1440, dropdown/Tab, form-error/borrador/foco. Registrar honestamente capacidades no probadas. No hay script/configuración de lint independiente en este repositorio: no presentar typecheck como lint.

El PR debe identificar consumidores migrados, evidencias, canónicos separados, validaciones reales y pendientes, sin afirmar producción lista ni cerrar este issue antes de la integración autorizada.
