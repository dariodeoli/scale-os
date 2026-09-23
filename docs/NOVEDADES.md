# Novedades de Scale OS

Acumulativo por versión, en lenguaje de producto. Lo mantiene el integrador en cada ciclo `hd`.

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
