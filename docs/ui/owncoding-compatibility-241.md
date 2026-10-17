# Compatibilidad OwnCoding / Scale — #241, fase 7

Revisión posterior al piloto publicado **v0.68.17**, OwnCoding
`ce28d33b879571801b7b27124483bd84e830ad63` ([PR #56](https://github.com/dariodeoli/owncoding-ui/pull/56)).
Snapshot Scale `dee254c1`: todavía fija v0.68.16; la actualización al tag17
se realiza en la rama del consumidor, fuera de esta auditoría documental.
No se cambian componentes, dependencias, versiones ni reglas de negocio.

La mayor reutilización inmediata ya existe: bancos y superficies compartidas.
Los demás candidatos requieren verificar contratos; una UI parecida no basta.

| Candidato externo y fuente | Contrato relevante / uso Scale | Dictamen |
| --- | --- | --- |
| [BancoCombobox](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/BancoCombobox.jsx) | value/onChange(string), onSelect(name), catálogo por props; onIdentitySelect opt-in. Scale `app/workspace-forms.tsx` ya lo usa con RHF setValue y pending. Texto libre permitido. | **Reuso existente.** Conservar institución escrita; resolver un alias histórico no acredita titularidad ni conexión bancaria. |
| [BancoLogo / MedioPagoLogo](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/BancoLogo.jsx), [segunda marca](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/MedioPagoLogo.jsx) | banco/marca, variante compacto/horizontal, decorativo, soloCatalogo. Assets locales autorizados o fallback tipográfico documentado. Balance ya usa BancoLogo (`app/finance-balance.tsx`). MedioPagoLogo representa marca, no el tipo genérico CARD/TRANSFER. | **BancoLogo ya reutilizado.** MedioPagoLogo sólo cuando exista marca real aportada por la app; no inferir marca desde método de pago ni inventar logos. |
| [CityAutocomplete](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/CityAutocomplete.jsx) | value, onChange(text), onSelect(city,department), onIdentitySelect; buscar async opcional. onSelect también ocurre al teclear y en blur exacto; texto desconocido puede emitir departamento vacío. Máximo visual100 por defecto. | **Diferido.** Scale guarda ciudad/departamento manuales120 (`app/client-editor-data.ts`). Requiere política explícita de revisión que preserve ambos valores y asociaciones confirmadas; no vaciar departamento manual ni acortar datos. |
| [RucField](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/RucField.jsx) | consultar async por props, resultado sólo se aplica tras confirmación; descarta resultados stale. Default8 dígitos de base sanitiza; modo9 explícito conserva identidad estricta. No consulta por sí solo. | **Diferido.** Scale `app/client-ruc.tsx` + LookupField/LookupReview ya conservan revisión, procedencia, abort y aplicación acotada a tax_id/legal_name. No sustituir por default8 sin acreditar equivalencia RAW/validación, refs, errores, consentimiento y conflicto con edición manual. |
| [createOwnDataRucProvider / mappers](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/types/index.d.ts#L2041), [documentación](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/docs/OWNDATA-RUC.md) | Inyecta lookup; exige envelope de identidad, procedencia/cuota/entorno. No concede acceso al proveedor ni inventa contactos. El resultado UI es name/fullRuc/ownData, no RucRecord Scale. | **Adaptación diferida.** El transporte autenticado y los secretos siguen en backend Scale (`backend/ruc-lookup.js`); no trasladarlos al navegador ni confundir este helper con el provider backend homónimo. Mapear sólo evidencia realmente recibida. |
| [BuscadorCliente](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/BuscadorCliente.jsx) | clientes por props, selectedId, onSelect(cliente), onQueryChange y onCreate opcional; filtro local y posible duplicado. No impone aislamiento ni autoridad de coincidencia. | **Diferido.** Scale `app/client-matches.tsx` consulta coincidencias autorizadas de empresa por correo/RUC/teléfono, informa motivo y abre ficha explícitamente con Selector+foto. No precargar clientes globales, cambiar coincidencia exacta por fuzzy ni convertir contacto compartido en unicidad. |
| [EmailField](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/EmailField.jsx) | value/onChange(string), dominios/sugerir; combobox con estado de teclado y ref interno. No exporta forwardRef al input. | **Diferido.** Scale `app/email-field.tsx` ofrece ref nativo/pending/ARIA/InputBase y datalist; política de sugerencias distinta (`app/field-rules.ts`, sólo tras @). Mantener composición estable; extracción futura debe acreditar ref/foco/submit y límites254, no sólo igualar props de nombre. |
| [PhoneField / CountryPhoneSelect](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/src/components/PhoneField.jsx), [tipos](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/types/index.d.ts#L302) | phone=parte local, onChange(local); DDI/ISO y E164 por callbacks separados. Catálogo internacional configurable, máximo30 local, validación libphonenumber al blur. No forwardRef público al nacional. | **Diferido.** Scale `app/phone-field.tsx` emite string completo, usa doce códigos autorizados, conserva internacional desconocido RAW y ref nacional/pending; `phoneValid` aplica contrato API propio. No cambiar representación persistida ni exigir E164/ISO como efecto de reemplazo visual. Ya reutiliza parseTelefono/componerTelefono/soloDigitos. |
| [Card / DataTable](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/types/index.d.ts#L157) | Card HTMLAttributes; DataTable<Row> columns/rows/render, mobileCard, getRowKey y loading. Datos/acciones llegan por props. | **Reuso existente exacto.** `app/ui/surface.tsx` y `app/ui/collection.tsx` reexportan ambos. No trasladar permisos, consultas ni semántica contable a una tabla genérica. |
| [Checkbox / Switch](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/types/index.d.ts#L1022) | checked + onChange(event), disabled y accesibilidad; Checkbox admite indeterminate. | **Reuso existente exacto.** `app/ui/choice.tsx` reexporta el renderer. Conservar permisos y consentimientos explícitos en cada consumidor; no reinterpretar callbacks como boolean sin adaptador. |

## Identidad de catálogos y límites

[CATALOG-IDENTITIES](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/docs/CATALOG-IDENTITIES.md) documenta32 instituciones
y263 etiquetas de localidades heredadas. Los IDs son internos OwnCoding, no
códigos oficiales; los registros no acreditan vigencia bancaria, autoridad
municipal ni permisos de logos. Resolver localidad requiere ciudad/departamento
compatibles: ambiguo devuelve ambiguous, combinación contradictoria unknown.
No asumir que la primera coincidencia es correcta. Mantener entradas originales
junto a cualquier ID nuevo, y conservar texto libre desconocido.

`owncoding-ui/utils` ofrece los resolvers puros sin requests; el subpath
`financial-metadata` contiene metadata, mientras `financial` agrega arte visual.
El uso de logo o catálogo no prueba una integración financiera ni proveedor live.

## Evidencia y decisión

Se inspeccionaron exports/tipos/fuentes fijados al SHA anterior y los consumidores
Scale citados; esta fase no ejecuta proveedores, navegador de producción ni una
nueva suite. Los contratos tienen pruebas versionadas en OwnCoding:
[catálogos/ambigüedad](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/test/catalog-identities.test.jsx),
[bancos/logos](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/test/banco-combobox-branding.test.jsx),
[RUC](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/test/ruc-field.test.jsx),
[adaptador OwnData](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/test/owndata-ruc-provider.test.jsx),
[teléfono internacional](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/test/telefono-internacional.test.jsx) y
[campos](https://github.com/dariodeoli/owncoding-ui/blob/ce28d33b879571801b7b27124483bd84e830ad63/test/campos-formulario.test.jsx).
Son evidencia de los contratos locales con fixtures, no de autorización o
funcionamiento actual de un servicio externo. La propuesta del piloto está en `docs/ui/portable-components-241.md`; sus
resultados sobre el paquete17 corresponden al handoff versionado del consumidor,
separado de esta revisión documental.

No se recomienda una segunda sustitución automática. Mantener el reuso existente;
si se aprueba otro piloto, primero cerrar una brecha concreta de contrato y
acreditar equivalencia en consumidor aislado. Editor, ActorIdentity/política
media, permisos, endpoints, cuentas/contratos emitidos y reglas comerciales
siguen fuera de la biblioteca genérica.
