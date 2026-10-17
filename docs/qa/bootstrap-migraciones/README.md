# Bootstrap de migraciones — #235

El arranque reejecutaba la cadena histórica antes de consultar `schema_migrations`. Una base con eventos válidos `ownership.changed` ya no satisfacía la antigua restricción de `20260915_inventory_location_pipeline.sql`; el arranque quedaba en 503 y la migración de precisión monetaria 111 no llegaba a ejecutarse.

`applyCuratedMigrations` conserva el orden de dependencias curado, consulta el tracker y ejecuta únicamente los archivos no registrados. Inserta cada registro después de ejecutar su SQL, dentro de la misma transacción que controla el servidor bajo `scale-core-schema`. Después, el runner existente aplica archivos futuros que no estén listados. El esquema base y la política del archivo opcional Dadoo permanecen sin cambios.

Una instalación sin tracker aplica y registra la cadena, en lugar de declarar aplicadas columnas que todavía no creó. Una base registrada no reejecuta scripts históricos ni actualiza sus timestamps. Ante un fallo, el caller revierte tanto DDL como registros de tracker, incluidas las migraciones nuevas anteriores al fallo.

Validaciones locales realizadas sobre bases descartables:

- Base nueva con las 111 migraciones y reinicio sin pendientes.
- Base previa al tracker conservando un cliente existente, más incorporación del tracker y columnas nuevas.
- Base registrada con 110 archivos y un evento `ownership.changed`: sólo se ejecuta 111; la antigua restricción se demuestra incompatible dentro de una transacción que se revierte.
- Gasto USD `100.25`, inventario, usuario, identidad, filas de auditoría y registros antiguos de tracker preservados durante dos reinicios.
- Archivo futuro no listado ejecutado una sola vez, después de las dependencias curadas.
- Error en la segunda migración nueva: rollback del DDL y del registro de la primera; reintento correcto y siguiente reinicio vacío.
- Contratos de arranque del release, runner existente y auth con VM modules.

Comandos:

```bash
cd backend
node test-bootstrap-migrations.mjs
SCALE_TEST_PG_BIN=/ruta/postgresql/17/bin node test-bootstrap-migrations-postgres.mjs
node test-migrations-runner.mjs
node test-release-migrations.mjs
node --experimental-vm-modules test-auth.mjs
```

PGlite usa almacenamiento temporal que se cierra y vuelve a abrir para reproducir un proceso nuevo. La prueba PostgreSQL 17 crea un clúster propio por socket Unix, sin TCP, con memoria de locks suficiente para las 111 migraciones en una única transacción. Ambas pruebas eliminan sus datos locales al finalizar. No se modifican trazas ni se debilitan restricciones históricas para forzar un arranque.

## Recuperación operativa

Una recuperación de aplicación debe conservar este bootstrap compatible con el tracker
y las migraciones ya aplicadas. Volver al arranque anterior reejecutaría SQL histórico
incompatible con eventos actuales de propiedad. Ante un fallo, priorizar una corrección
hacia adelante o una versión que mantenga este bootstrap; nunca borrar trazas, registros
de migración ni rebajar restricciones para simular un arranque correcto.
