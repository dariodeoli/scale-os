# Columnas personalizables — Refs #310

Un botón «Editar columnas» permite mostrar/ocultar columnas disponibles, subir/bajar su orden y restaurar el diseño. La primera columna de identidad y las marcadas required permanecen visibles. En tablas con acciones fijas, estas conservan el último lugar y pueden ocultarse. Los datos y permisos no cambian por modificar columnas.

Se guardan en las preferencias existentes del usuario y empresa, con clave propia de cada lista. El hook conserva startup/filtros, copia local, sincronización, error y reintento. Cambiar de sesión cierra el editor anterior para impedir guardar su borrador en otra cuenta.

## Adopción

El [inventario de fuente](adoption.json) identifica52 usos ListGrid y9 DataTable en38 módulos, no61 rutas comprobadas en navegador. ListGrid/ListRow comparten la selección de tracks y celdas; Proyectos resuelve sus tracks CSS variables. Clientes, Producción y Presupuestos usan este patrón. DataTable sigue usando el renderer de owncoding-ui y selecciona el mismo catálogo; las tarjetas móviles personalizadas se mantienen de forma predeterminada, y una configuración explícita usa las tarjetas genéricas canónicas para respetar campos ocultos.

Sólo se habilita dentro del Provider autenticado. Un esquema de tracks no reconocido o una fila con otra cantidad de celdas deshabilita la personalización completa de esa tabla; no se filtran encabezados dejando celdas desalineadas. Las vistas de tarjetas, kanban, calendario y drawers sin columnas no se convierten en tablas. El inventario tiene un layout heredado: el integrador lo adopta con useListColumnConfiguration; no se edita en esta rama para evitar colisión con #311. DataTable permite columnPreferenceKey/columnPreferenceLabel explícitos y ListGrid preferenceKey para identidades estables adicionales.

El hook compartido para layouts heredados recibe label/columns/tracks y devuelve controls/indices/style; encabezados y filas deben usar los mismos índices. No agregar datos arbitrarios: «agregar» significa volver a mostrar una columna del catálogo autorizado.

## Pruebas

-31 pruebas unitarias/hook/adaptadores PASS: catálogo de permisos, identidad, orden, tracks/variables, fallback de filas incompatibles, DataTable/renderer, esquema y preferencias existentes.
-API PGlite PASS: migración aplicada dos veces, payload mayor a1KB, listas independientes, startup/filtros preservados, usuario/tenant, validación y pertenencia activa.
-Migraciones/servidor PASS:117 migraciones registradas en esta rama base.
-Tipos y arquitectura PASS.
-[Navegador real](browser-results.json), componentes canónicos y CSS compilado:320/390/1440, ocultar/reordenar/reset, encabezados/celdas alineados, no overflow documental, recarga persistida, aislamiento de usuario/lista,503 sintético y reintento, cierre del editor al cambiar sesión. [Captura390](dialog-390.png).

El servidor HTTP de la prueba de navegador es sintético; no acredita rutas Next autenticadas, PostgreSQL remoto ni dispositivos físicos. La API se comprueba separadamente con PGlite. El primer ensayo de reintento falló por leer document.body.textContent, que incluía el script inline de la fixture; se corrigió el runner para consultar alertas DOM y no se relajó ninguna aserción del producto. La fixture Tailwind incorpora su source para medir sus tracks reales.

## Migración y publicación

Migración aditiva20261020_list_column_preferences.sql amplía el límite antiguo de preferencias de1KB a64KB en PostgreSQL; PATCH está limitado a32KB,100 listas y32 columnas por lista. No hay nueva tabla ni datos financieros. Se registra en migration-order y server.migrationChain. El integrador debe conciliar las adiciones de migración paralelas de #306/#311.

No se ejecutó build/release completo, merge ni deploy desde este agente. Gate completo, CI y publicación integrados pendientes; no cerrar #310 por este informe.
