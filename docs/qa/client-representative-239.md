# Clientes: responsable legal e identidad — #239 / editor económico #238

## Comportamiento

La ficha y el editor muestran el logo/foto circular canónico, el nombre legal del cliente (razón social, con respaldo en el nombre comercial) y el responsable legal en columnas. Los roles sin acceso al contacto siguen recibiendo datos legales minimizados; la interfaz muestra «Información reservada».

El checkbox «El responsable legal es el mismo cliente» guarda `legal_representative_same_as_client` como boolean explícito. No se deduce de nombres iguales ni de documentos. Al marcarlo, el nombre del responsable sigue `legal_name.trim() || name.trim()`; el campo queda visible y deshabilitado. Al desmarcarlo puede editarse de forma independiente y renombrar la empresa no vuelve a vincularlo. No copia RUC, CI, cargo ni tipo de parte.

La migración aditiva `20261017_client_representative_link.sql` mantiene registros anteriores en `false`, instala un trigger idempotente y conserva el vínculo en cualquier camino de escritura, incluyendo SQL/importaciones. Si una supresión de datos bloquea la ficha, desactiva la relación y vacía el representante para evitar reconstruir información desde una razón social retenida por obligaciones fiscales. No modifica documentos contractuales emitidos.

El Editor compartido admite casillas y valores derivados; no se añadió un formulario paralelo. Como parte de #238, el mismo editor solicita vigencia del cambio y motivo, conserva el inicio comercial original y envía revisión optimista e identificador idempotente al modificar términos. Las ediciones exclusivas de contacto no exigen motivo. Reintentar el mismo contenido conserva el requestId; cambiar el contenido genera otro. El historial usa la vista común de Finanzas.

La asignación masiva de plan de servicio usa `/reporting`, cambia clasificación y conserva su versión optimista. No modifica precios ni acuerdos de `/commercial-terms`; una prueba acredita esta separación.

## Pruebas focales

- `node backend/test-agency-core-alta.mjs`: PASS. Handlers reales de alta/edición contra PGlite; boolean estricto, checkbox persistente, rename, cambio legal y respaldo al nombre comercial, edición independiente y revinculación, escritura SQL directa, razón social completa de160 caracteres, documentos independientes, restricciones por rol/tenant, minimización y snapshot de contrato emitido intacto. También prueba supresión con retención fiscal e idempotencia de la migración.
- `tsx --test tests/client-editor-184.test.tsx`: 16 PASS. Incluye checkbox y derivación del Editor real, guardar/reabrir/desvincular, documentos omitidos en PATCH parcial, validación económica, fecha de vigencia separada de inicio comercial, idempotencia y edición exclusiva de contacto.
- `tsc --noEmit --incremental false`: PASS.
- Sintaxis backend y `git diff --check`: PASS.

Logs locales: `/tmp/scale239-backend-final.log`, `/tmp/scale239-client-editor.log` y `/tmp/scale239-tsc-final.log`.

## Integración y límites

El integrador registra la migración después de `20261017_client_legal_profile.sql`; esta rama no modifica el registro central, server.js, versiones ni publicación. La dependencia de vistas económicas es `17abeef8` de Finanzas (copia local equivalente `dc753921`).

QA independiente del popup y del contrato emitido en navegador queda a cargo de legal_profiles sobre el candidato integrado, con fixtures sintéticos, 1366/390 px y ambos temas. No se afirma validación de producción, OAuth o proveedores externos. Los gates agregados, CI, merge y deploy pertenecen al integrador.
