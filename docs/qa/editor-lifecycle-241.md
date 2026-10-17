# #241 · Editor, errores y consultas confirmables

Base `d564b38f`. Lote local de formularios, sin cambios de negocio, backend, dependencias ni publicación externa.

## Contrato conservado y ampliado

- `Editor` sigue siendo RHF/Zod y mantiene `Dialog`/`SaveActions`, secciones y borradores. `Field.maxLength` explícito ahora se verifica también en schema, sin inventar límites para campos que no lo declaran.
- Date valida día civil real; time exige HH:mm. `Field.min/max` son límites inclusivos opcionales del consumidor para esos dos tipos. Reutiliza `app/ui/temporal-value.ts` del lote temporal; no usa UTC ni calcula defaults de fecha.
- Al fallar validación abre sección/paso y espera a que termine el estado pending antes de enfocar el control real, incluidos selector, email, dinero o teléfono. En teléfono prioriza el número nacional sobre el selector de país.
- API conserva `Error.message`. Sólo si hay `fieldErrors:{clave:mensajeString}` explícito entrega además `ApiFieldError.fieldErrors`, descartando arrays, objetos y claves inseguras. Editor admite únicamente campos conocidos; mantiene el error de ese campo hasta modificar su valor. No infiere campos desde mensajes traducidos. Los handlers actuales con sólo `{error}` siguen mostrando el error general.
- PasswordField recibe disabled durante el guardado; usa API compatible del lote de campos base. Contraseña nueva/existente y políticas de backend siguen en el consumidor.
- `Field.lookup.run(value, context?)` conserva consumidores antiguos de un argumento; contexto añade signal y snapshot. Se invalida consulta al cambiar su origen, reemplazarla, guardar o desmontar. Una respuesta que quiere modificar un campo editado después de consultar se descarta entera y explica que se conservaron las ediciones. Sólo `lookup.onApplied` posterior a esa comprobación registra la aplicación efectiva.
- RUC mantiene proveedor/normalización/confirmación existentes; no agrega datos inexistentes. La tarjeta se cancela al cambiar el RUC y una razón social editada durante revisión no se sobrescribe. Consultar no guarda ni bloquea la carga manual.
- `useSingleFlightSubmit` mantiene bloqueo síncrono previo a validación, y previene submit nativo incluso en el segundo intento que se descarta.

## Evidencia local

Dependencias verificadas junto al lote: campos base `9e283168` y helper temporal de `fa0da218`. El integrador incorpora esos commits por sus ramas originales; el helper no se duplica en este lote.

```
node_modules/.bin/tsx --test tests/editor-contracts-241.test.tsx tests/shared-editor.test.tsx tests/client-editor-184.test.tsx tests/client-reporting.test.tsx tests/ui-fields.test.tsx
# 29 tests PASS
node_modules/.bin/tsc --noEmit --incremental false
# exit 0
node tests/editor-focus-browser-241.test.mjs
# Chromium real 390px PASS
```

El navegador usa React/RHF/Dialog y controles reales en loopback, sin API ni proveedores externos. Comprueba foco en selector inválido de sección móvil oculta, selección por teclado, foco en teléfono nacional, error backend explícito/reintento, conflicto de lookup sin sobrescribir y confirmación al cancelar borrador. Las pruebas de componente verifican límites, fecha imposible/año bisiesto/rangos/hora, persistencia del error hasta corregir campo, cancelación al cambiar RUC/guardar/desmontar, Aplicar después de edición manual, password pending y single-flight.

No se ejecutó build ni regresión completa en este worktree: corresponden al candidato integrado de los lotes #241. No hay prueba nueva contra un proveedor RUC real ni afirmación de deploy. Selector y controles base pueden requerir repetir este harness cuando se integren sus fachadas definitivas.
