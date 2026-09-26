# Novedades de Scale OS

Acumulativo por versión, en lenguaje de producto. Lo mantiene el integrador en cada ciclo `hd`.

## v1.0.126

### Marco y sistema visual

- **El contenido usa todo el ancho**: con el riel normal o colapsado la pantalla se reparte por flex y desaparecen las franjas muertas (hasta 260 px en pantallas anchas y 132 px al colapsar). El riel y el menú móvil cortan en el mismo ancho (768 px): se termina la banda donde se veían los dos menús a la vez.
- **Pie del riel con un solo divisor** (se retiró la raya duplicada heredada) y el ítem activo/hover del nav recupera sus opacidades reales de Tailwind.
- **Botón primario legible**: el texto del CTA violeta sale del token de marca y cumple AA en claro (14,07:1) y oscuro (5,30:1).

### Operaciones

- **Tablero de Producción**: indicador “N de 7 etapas” con flechas para recorrer el riel, contadores que respetan los filtros activos y mensajes claros de carga y vacío (“Nueva pieza”, “Restablecer filtros”) en lugar de un “0 órdenes” engañoso.
- **Inventario**: toolbar en una sola línea (vista, búsqueda, categoría, vista de equipos, selección, contador y acciones) y CTA “Agregar valor” cuando falta el dato monetario.
- **Estudio y Proyectos**: vacíos compactos con CTA primario (“Agregar espacio”, “Nuevo proyecto”); sin espacios ni reservas ya no se dibuja el calendario vacío.

### Finanzas

- **Informes**: el período visible y el anterior se muestran completos y ordenados, con año y último día de cada mes (p. ej. “1 oct. 2025 — 30 sept. 2026”), igual en pantalla y en el PDF.
- **Vacíos con salida**: Finanzas, Mora, Previsión, Comisiones e Informes ofrecen el CTA que resuelve el vacío (registrar cuenta, factura, cobro o comisión; transferir; limpiar filtros; ver el último mes con datos); los estados sin acción posible según el rol quedan honestos y sin botón.

### Plataforma

- **Equipo**: búsqueda, filtros, contador, vista y acciones en una sola fila que envuelve sin huecos; los chips Activos/Inactivos ahora filtran de verdad y el nombre completo se lee hasta en dos líneas en las tarjetas.
- **Vacíos con CTA**: “Agregar primera persona” en Equipo, “Generar enlace” en Invitaciones, reintento en Roles y permisos y “Crear el primer cupón” en Superadmin; donde no hay acción posible, el vacío no ofrece botón.

### Diseño (documentación)

- Publicado el patrón de **tablas densas responsive**: columna de acciones fija por defecto (las acciones no dependen del scroll), menú “⋯” como excepción cuando la fila no entra y vista tarjeta en anchos medios por plantilla.
- Publicado el patrón de **estados vacíos con CTA contextual**; `DESIGN-SYSTEM.md` y el harness visual quedan sincronizados con el corte md único.

## v1.0.125

### Accesibilidad AA (verticales Comercial, Operaciones, Finanzas y Plataforma)

- **Comercial**: las listas de Clientes y Presupuestos anuncian cada dato en su columna y quedan sin violaciones propias de la vertical; el arrastre del pipeline y del compositor de presupuestos se opera por teclado con instrucciones y anuncios en castellano, y las manijas distinguen “Reordenar ítem” de “Reordenar sección”.
- **Comercial**: con “reducir movimiento” activo, las transiciones propias (manijas de arrastre y barras del tablero de crecimiento) quedan apagadas.
- **Operaciones**: los chips de tipo de trabajo del planificador y del detalle se leen correctamente en tema oscuro; los botones de las tarjetas del tablero y el enlace “Drive” ganan área táctil de 44 px en el celular, y cada columna del tablero anuncia su etapa y cantidad.
- **Finanzas**: 15 campos (mes, montos, fechas, referencias, notas, extracto y semana) pasan a tener etiqueta asociada, y las listas de contratos, personal proyectado y gastos anuncian sus encabezados como columnas.
- **Plataforma**: el panel de Superadmin recupera contraste en oscuro (1,78:1 → 5,10:1), la selección en la cuadrícula de Equipo llega a 44 px en mobile y el comprobante de eliminación queda etiquetado para lectores de pantalla.
- **Verificación**: recorrido real de teclado con foco visible, contraste medido en claro y oscuro y harness de las verticales sin hallazgos; sin cambios de datos ni de permisos.

## v1.0.124

### Accesibilidad y sistema visual

- **Foco visible único**: un solo indicador sólido de 3 px con contraste AA en claro y oscuro; sobre el riel es blanco (el de marca no llegaba al mínimo). Se retiró el halo translúcido que lo hacía casi invisible.
- **Contraste corregido**: el gris de textos secundarios y el ámbar de avisos pasan a valores ≥4,5:1 (con el mapeo de Tailwind alineado); barrido del marco sin fallos y todo el marco por encima de AA.
- **Teclado verificado**: abrir el menú con Enter deja el foco adentro (trampa en Tab, Escape cierra y devuelve el foco) y las animaciones se apagan con “reducir movimiento”.
- Pendiente en la librería: el ámbar del chip de advertencia de `owncoding-ui` mide 3,65:1; quedó el pedido con la propuesta de valor (`#8A6207`).

## v1.0.123

### Comercial

- **Presupuestos en lote**: barra de selección con contador, tope del sistema y confirmación; el lote se resuelve en una operación y la lista se refresca al terminar.

### Operaciones

- **Estudio**: selección múltiple de reservas con el mismo patrón de lote (seleccionar visibles, limpiar y confirmar), con el permiso correspondiente.

### Plataforma y acceso

- **Aviso de suspensión por falta de pago**: se envía una sola vez por ciclo de cobro (con sello), después de la gracia.
- **Gate del integrador**: el hook de push a `main` pasa a `SCALE_INTEGRATOR=1` (hook, script de setup, release y documentación alineados).

### Diseño (documentación)

- Definición única del **estado de cobro del cliente**: etiqueta y tono salen del `payment_status` del API (`days_overdue` solo para el número y la antigüedad de Mora), documentada en `DESIGN-SYSTEM.md` con la adopción propuesta en Clientes y en la ficha de pieza.

## v1.0.122

### Documentación y reglas

- La lista de componentes canónicos suma los **patrones v2** (`PageHeader`, `FilterToolbar`, `ListGrid`/`ListRow`, `Kpi`/`KpiStrip`, `StateChip`, `MoneyText`, `CurrencyField`, `ViewSwitch`, estados de carga/vacío/error), con su contrato en `DESIGN-SYSTEM.md`.
- La validación de Prisma queda documentada para correr sin `.env` (solo valida el schema, no se conecta).

## v1.0.121

### Marco y sistema visual

- **Topbar sin desborde**: las utilidades envuelven y el buscador se trunca (o pasa a icono) en pantallas chicas; “Métricas” queda como tab real dentro de Pipeline, con su ruta y redirect alineados, y se retiró una regla legacy de toolbars.

### Finanzas

- **Rótulos al patrón del marco**: toda la familia de eyebrows de la vertical financiera usa el eyebrow canónico (Previsión, Informes y el resto).

## v1.0.120

### Marco y sistema visual

- **Una sola medida**: el título de panel (17 px) y el radio de tarjeta (12) vuelven a un valor único en toda la app, para que las verticales no divergieran tras el rediseño.

### Comercial

- Encabezado del directorio y títulos de panel (métricas, compositor y ficha) al lenguaje del marco nuevo; clones del harness sincronizados.

### Operaciones

- Un solo encabezado por pantalla, filas del sistema y auditoría en una línea; tablero, planificador y Proyectos alineados al marco.

### Finanzas

- Encabezados canónicos y hover de fila en toda la vertical.

### Plataforma y acceso

- Equipo, Actividad y Uso alineados al sistema v2, con fixtures sincronizados.

## v1.0.119

### Marco y sistema visual

- **Nav rediseñado**: cada ítem lleva un tile de ícono; el activo suma barra dorada y pill en el riel (tono de marca en el menú móvil); el foco se ve en claro y oscuro; el pie del usuario es una tarjeta y el menú móvil mantiene su encabezado fijo al scrollear.
- **Contenido**: encabezado de página unificado (título 22/24, subtítulo 13, acciones que envuelven a ancho completo en el celular) y filas con hover en ambos temas.
- **Carga y superficies**: los esqueletos usan el alto de fila del sistema (44) y el topbar/estados ganan una sombra sutil; todo por tokens (`ink-*`/marca), con el riel lila en claro y casi negro en oscuro.
- Evidencia: harness de 121 fixtures con 0 altas/medias y contraste AA+ en los dos temas.

## v1.0.118

### Operaciones

- **Inventario más liviano**: la foto de cada equipo dejó de viajar en las listas; ahora se sirve como imagen del API (con sello para cachear) y se carga solo cuando se ve. Con 2.000 equipos la lista pasa de ~18,6 MB a un payload normal.
- **Piezas por proyecto**: el detalle pide solo las piezas del proyecto (`?project_id=` paginable, negociado automáticamente) y muestra el total real del proyecto aunque la lista esté resumida.
- **Proyectos**: conmutador lista/cuadrícula del sistema v2 y fila de lista con acciones de ícono (44 px en celular, 28 en escritorio), con “Archivar/Reactivar proyecto” descripto para lectores de pantalla.

## v1.0.117

### Comercial

- **Pipeline**: al editar una oportunidad, su fecha de actualización se refleja (PATCH corregido), así el orden por actividad queda al día.

### Operaciones

- **Mi día** quedó completo y el detalle de proyecto acotado, según la ronda de QA con datos reales (piezas y responsables sin cortes).

### Plataforma y acceso

- **Equipo y Papelera** cumplen el contrato de listas en escritorio y celular (filas finas y acciones alineadas).
- **API**: la negociación de compresión atiende bien `q=0` y el comodín de `Accept-Encoding` (no comprime cuando el cliente lo prohíbe).

### Medición

- El harness mide claro y oscuro por separado y dejó de marcar el falso solape del campo de contraseña.

## v1.0.116

### Rendimiento y datos

- **Producción quedó con una sola fuente de datos**: el shell ya no pide la lista de órdenes para esa pantalla — las columnas las carga el tablero con sus conteos exactos y “Ver más” — y se retiró el código superado, así no quedan lecturas duplicadas.
- El buscador y la presencia en Producción operan con lo que aporta el tablero (compromiso documentado).

## v1.0.115

### Rendimiento y datos

- **Producción deja de pedir la lista completa**: el shell carga el tablero por columnas (ventanas por etapa) y comparte con el tablero los totales exactos de cada columna; el buscador y la presencia usan esas ventanas en esa pantalla.
- El medidor de carga y los contratos del modo por columna quedan como verificación permanente.

### Marco y sistema visual

- Se retiraron reglas de estilo muertas (avisos y chips viejos) y se actualizó su clon del harness para medir el markup real.
- Nuevos fixtures de suscripción y zona de peligro; contraste del riel, topbar, drawer y pantalla de carga verificado en claro y oscuro (todo por encima de AA, 0 hallazgos).

## v1.0.114

### Rendimiento y datos

- **El API comprime sus respuestas** (brotli o gzip según lo que pida el navegador): las listas grandes bajan hasta **−97/−99 % de bytes transferidos** (piezas 1,5 MB → 43 KB; clientes 281 KB → 3 KB), con cabeceras correctas para cachés y sin tocar PDF ni binarios.
- **Tablero de Producción por columna**: cada columna pide solo su ventana de 50 piezas y los totales exactos viajan aparte; el badge muestra el total real, “Ver más” completa la columna sin perder piezas y el arrastre sigue siendo inmediato con reversión si falla. −87 % de bytes y 3,1× más rápido en 4G.
- **Facturas**: el saldo por moneda (receivables) viaja siempre con la lista, aunque la ventana deje afuera facturas viejas.

## v1.0.113

### Corrección del shell y el marco

- **La carga de datos volvió a funcionar**: el prefijo de API se duplicaba en las lecturas del shell y devolvía 404; ahora es idempotente en todo el transporte, así que las secciones cargan sus datos al arrancar y al navegar (incluido el buscador, la presencia y los selectores de los modales).
- **Cambiar de sección ya no rompe el tablero**: cada pantalla pide su propia proyección y no reutiliza una lista cargada con otro recorte; Producción vuelve a mostrar la clasificación del trabajo.
- **Marco móvil corregido**: una regla vieja dejaba el riel de 254 px en el celular (578 desbordes medidos, hasta +2584 px); queda retirada y Pipeline/Planes ya no estiran el documento.

### Rendimiento y datos

- **API con agregados por etapa y por proyecto**: Resumen y Clientes dejan de calcular esos números en el navegador y el modo por columna del tablero (`?status=` + `?counts=1`) devuelve conteos exactos.
- La ventana del buscador y la presencia viajan proyectadas (50 KB en lugar de 254 KB), y el medidor de carga por pantalla quedó como herramienta de verificación.

## v1.0.112

### Rendimiento y datos

- **Las pantallas piden solo lo que necesitan**: las que no listan órdenes usan una ventana de 300 piezas recientes en lugar de la lista completa (hasta −72 % de datos por pantalla) y la frescura se controla por recurso y recorte, sin que una ventana tape una lista completa.
- **API con proyección de campos** (`?fields=`): las listas pueden pedir solo las columnas necesarias y el payload por defecto queda recortado.
- **Medidor de carga por pantalla** para comparar antes/después y verificar mejoras (incluye mobile).

### Notas para el equipo

- Resumen y Clientes mantienen la lista completa hasta que existan los agregados por etapa/cliente propuestos; Producción conserva la lista completa por ser tablero.

## v1.0.111

### Rendimiento y datos

- **El shell dejó de repetir lecturas**: cada sección pide solo lo suyo y muestra esqueleto de carga mientras espera, con un medidor de carga para verificar mejoras.
- **API más rápida en listas grandes**: índices nuevos para piezas, proyectos e inventario, agregados en una sola consulta y paginación opcional; el panel responde mejor con volúmenes altos.
- Bench opcional del API (`npm run bench:agency`) para medir estas listas cuando haga falta.

### Comercial

- **Pipeline y presupuestos**: el arrastre de oportunidades y el reordenar ítems del compositor funcionan de forma confiable, con targets táctiles en el celular y la fila densa de Presupuestos.

### Operaciones

- **Producción e inventario**: se corrigió el arrastre del tablero y del pipeline (zonas, sensores y actualización inmediata); el inventario ahora muestra errores accionables, con tiempo límite por sección y reintento del catálogo.

### Finanzas

- **Comisiones**: carga más liviana (catálogos diferidos) tras la auditoría de carga de la vertical financiera.

## v1.0.110

### Marco y sistema visual

- **Riel, encabezado y topbar consolidados** en una sola fuente: nav sin subrayado, riel colapsado sin recortes y la pantalla de carga con la identidad de marca.
- Los espacios y márgenes del contenido quedan parejos en todos los anchos.

### Comercial

- **Pasada de responsividad 360–1440** en clientes, presupuestos, planes, pipeline y métricas: barras de filtro, indicadores y botones con targets táctiles de 44 px en el celular; nada se corta ni se superpone.

### Operaciones

- **Inventario y estudio**: targets táctiles de 44 px, filas y código de barras, con scroll contenido dentro de cada panel.
- **Producción y proyectos**: calendario y tarjetas legibles en mobile, acciones sin desbordes y enlaces de Drive tocables.

### Finanzas

- **Finanzas, mora, previsión e informes**: targets, paddings y títulos ajustados al celular, chips largos sin cortes y modales medidos para que nada quede fuera de pantalla.

### Plataforma y acceso

- **Plataforma, acceso y superadmin**: diálogos y páginas de acceso sin cortes en 360, con targets de 44 px y los hallazgos de la auditoría de Papelera cerrados.

## v1.0.109

### Comercial

- **Montos y monedas unificados**: presupuestos, pipeline, ficha de reportes y ciclo comercial usan el objeto de dinero v2 (las 6 monedas de la empresa, sin recortes) y el selector de moneda con el catálogo real; el indicador multi-moneda del pipeline ya no se corta en el celular.
- **Vista y limpieza**: el cambio lista/cuadrícula sale del objeto compartido y se retiró el CSS muerto del directorio de clientes.

### Operaciones

- **Inventario** pasa al mismo objeto de dinero para sus importes, sin cambiar los datos que muestra.
- Se retiraron las reglas muertas de `production-focus.css` (la pantalla ya vive en el sistema v2).

### Finanzas

- **Finanzas, Mora, Previsión y Comisiones** adoptan el dinero y el selector de moneda compartidos, con importes y fechas siempre completos.
- Se retiró el CSS legacy de las listas de cobranza (`.mora-list`, `.client-list`), que ya no emitía ningún módulo.

### Plataforma y API

- **Tests del API con PostgreSQL real** ejecutables con un solo comando (`npm --prefix backend run test:postgres`), con el entorno documentado para cualquier máquina.
- **Manual operativo del API** en `backend/OPERATIONS.md` y reglas de onboarding/deploy actualizadas en el monorepo.

## v1.0.108

### Navegación y sistema visual

- **Corrección de contraste del riel**: en tema claro vuelve el violeta de marca con el wordmark, el usuario, el caption y los enlaces en blanco (antes quedaba blanco sobre blanco); en oscuro se mantiene el casi negro aprobado.
- El fondo del riel pasa a una única sección del sistema visual, sin reglas viejas que puedan pisarlo, y la marca duplicada ya no aparece dentro del riel de escritorio.

## v1.0.107

### Navegación y sistema visual

- **Menú reordenado por flujo de trabajo** (resumen → captar y cerrar → ejecutar → cobrar y medir → equipo → administrar) con iconos propios por sección, aprobado por el dueño.
- **Riel con la marca en claro**: wordmark blanco con acento dorado y el bloque del usuario (nombre y rol) legible sobre el fondo lila; el ancho del riel ya no afecta a otros paneles.
- **Dinero y moneda v2**: un solo objeto de dinero formatea las 6 monedas de la empresa y el selector de moneda ofrece exactamente ese catálogo.

### Comercial

- **Clientes**: la fila finita cumple el contrato (48–51 px), con los cobros y la actividad sin superponerse, las acciones en una línea con desplazamiento silencioso y la ficha con la cápsula grande; se retiró el CSS del directorio viejo.

### Operaciones

- **Historial de trabajo** rediseñado al sistema v2: bloques apilados con autor, título y la acción (“Creó/Actualizó/Eliminó · estado → estado”), filtros por persona, tamaño de página y paginación contra el mismo API; el historial importado de Trello sigue disponible.
- El fixture de proyectos ahora mide el markup real de la fila (incluidas las variantes por lista), cerrando un punto ciego del harness.

### Finanzas

- **Finanzas, Mora y Previsión**: todas las listas quedan en una línea por fila (44–52 px), con actores compactos, importes y fechas sin cortes, y los textos largos recortados con su valor completo disponible al pasar el cursor.

### Plataforma y acceso

- **Auditoría v2 cerrada**: Equipo, Invitaciones, Papelera, Roles y permisos, Superadmin, Estado y Configuración alineados al contrato (filas finitas, scroll contenido, encabezados y acciones alineados).
- **Ayudas v2**: bandeja de notificaciones, zona de peligro, panel de suscripción y confirmación destructiva del panel global, sin hojas de estilo propias.
- **Registrar cobro desde la fila**: el modal abre con la factura ya elegida; además, los tipos compartidos de Finanzas y la limpieza de datos de Mora en el shell.

## v1.0.106

### Comercial

- **Presupuestos**: propuestas con sus indicadores (a la espera, borradores, aceptadas y las que vencen esta semana), lista al contrato de filas y acciones por presupuesto; los montos se ven completos en todas las monedas de la empresa.
- **Planes**: comparador y alta/edición con los datos reales, gating por permiso y papelera, sin cambiar la forma de trabajar.
- **Pipeline**: tablero de oportunidades con totales por etapa (ponderado y abierto por moneda), arrastre para marcar ganado/perdido y alta/edición con contacto, monto, probabilidad y próximo paso.
- **Métricas**: panel de crecimiento para dueños y administradores, y estado “sin eventos” cuando todavía no hay datos (sin inventar ceros).

### Operaciones

- **Producción**: el tablero y el planificador se rehicieron con el sistema v2; cada tarjeta muestra tipo de trabajo, horas estimadas y reales, nivel de aprobación, enlaces y checklist, además de etapa, entrega y responsables.
- **Mi día, calendario y lista y lotes**: entregas de hoy y vencidas, piezas asignadas, el mes en grilla o en lista según la pantalla y el armado de lotes con el tope del sistema.
- **Proyectos**: lista densa con una sola plantilla y tarjetas grandes a elección; cada proyecto abre su ficha con responsables, enlaces, piezas y nivel de aprobación.

### Finanzas

- **Finanzas**: cuentas con institución, número, titular y custodia; transferencias con notas e importe recibido cuando hay cambio de moneda; cobros pendientes con filtros y cobros registrados con su reversión.
- **Mora**: semáforo de cobranza, antigüedad de la deuda por tramos, días promedio de cobro y lista por cliente con facturas y pendiente.
- **Comisiones**: sección propia con liquidación por colaborador, comisiones por venta y referido, descuentos con reversión y pagos registrados con quién los cargó.

### Plataforma

- **Superadmin**: el panel global quedó dividido en secciones (agencias y suscripciones, accesos entre agencias, cupones y auditoría) con los mismos permisos, acciones y datos.
- **Perfil y seguridad**: mi perfil y la seguridad de la cuenta se alinean al sistema v2; las sesiones muestran su estado y el aviso de contraseña es más claro.

### Sistema visual

- El riel de navegación, el encabezado de la app y el menú móvil pasan al sistema v2: mismos tamaños y objetivos táctiles, sin archivos de estilo propios del marco.
- Los contratos automáticos del marco quedan centralizados en una sola verificación y las pruebas apuntan a las fuentes nuevas.

## v1.0.105

### Marco y referencias del sistema visual v2

- El espacio de trabajo estrena el nuevo sistema visual (Tailwind + la librería compartida del grupo): la barra lateral, el encabezado y el pie mantienen la identidad de marca y ahora se alinean al mismo contrato de tamaños, colores y estados.
- El **Panel**, **Clientes** y **Configuración** son las primeras pantallas reconstruidas sobre el contrato v2: jerarquía más clara, estados de vacío, carga y error en cada bloque, y montos, fechas y códigos que nunca se cortan.
- Las listas densas comparten una única plantilla entre encabezado y filas (también en mobile, con scroll silencioso), y los avisos y confirmaciones salen de una sola pieza.

### Comercial

- **Clientes**: la lista y la ficha se rehicieron con la información completa del cliente — contacto, RUC y datos fiscales, cartera, cobros y pie comercial — sin depender del rol: lo que no corresponde ver no se dibuja.
- **Pipeline** y **Métricas**: el tablero de oportunidades y el panel de crecimiento muestran los mismos datos de siempre con la lectura v2 (etapas, montos ponderados por moneda, serie diaria y comparación de períodos).
- **Presupuestos** y **Planes**: el compositor de propuestas y el comparador de planes mantienen los totales y el PDF, ahora con validaciones y estados al nuevo contrato.

### Operaciones

- **Inventario**: la lista, la cuadrícula y el pipeline de ubicaciones se rehicieron con el sistema v2; el detalle y las reservas siguen el mismo contrato de filas y chips, con la verificación física y la depreciación visibles sin cortes.
- **Estudio**: espacios y reservas quedan en una sola grilla y una sola lista, con los mismos permisos y la misma validación de superposición.

### Finanzas

- **Informes**: los indicadores, la comparativa de períodos, el gráfico y la tabla histórica se reordenaron al contrato v2, con la exportación en un solo lugar y la regla “sin datos ≠ cero”.
- **Previsión**: el resumen por moneda, la proyección de caja, los contratos y los gastos mantienen su cálculo y ganan estados de carga/error propios por bloque.
- **Tesorería, mora y comisiones**: las listas de cuentas, facturas, cobros, transferencias, cartera y comisiones comparten el contrato de filas; las acciones aparecen solo para quien puede ejecutarlas.

### Plataforma y acceso

- **Roles y permisos**: la matriz se lee por dominio, distingue valores por defecto de los ajustes de la empresa y agrupa los cambios con confirmación.
- **Invitaciones, papelera y preferencias**: listas al contrato v2, con la actividad de cada enlace y las acciones de recuperación a mano.
- **Acceso**: registro, invitación, recuperación de cuenta, verificación de correo y la página de estado comparten un mismo marco visual, con los mismos mensajes y validaciones de siempre.
