# Reorganización de la información — 14-10-2026

Pedido: «leé todos los apartados, reordená y organizá; muchos espacios desperdiciados».
Criterio común: la tarea principal primero, KPIs en una fila sin huecos, toolbar en una
fila, un solo encabezado por pantalla y nada de datos ni acciones quitados (solo
reordenados o condensados). Gates de rol intactos. Medido sobre la Demo local a 1440 px.
Proyectos, Clientes e Inventario y los primitivos compartidos quedaron fuera de alcance.

| Sección | Antes | Después | Motivo |
| --- | --- | --- | --- |
| Resumen | Señales → resumen comercial → resumen financiero (6 KPIs en 4+2) → vencidos → piezas por etapa (142 px) → planificador en y≈1200 | Señales → vencidos → piezas por etapa en una fila → planificador (y≈440) → comercial y financiero en grillas de 3 | El trabajo del día es lo que se viene a hacer; los resúmenes son consulta |
| Resumen · Trabajo diario | 2 KPIs a media fila + accesos en fila propia | KPIs y accesos (cobros, efectivo) en la misma fila | Media fila vacía |
| Pipeline | Título del shell + fila extra solo con «Etapas / Nueva oportunidad»; ayuda de arrastre y recorrido en dos filas | Acciones al final de la fila de filtros; ayuda y recorrido en una línea | Tablero sube ~110 px |
| Métricas | Toolbar repetía el período elegido; 3 KPIs en grilla de 4 | Sin el duplicado; KPIs a 3 columnas | Dato duplicado, hueco |
| Presupuestos | — | Sin cambios | Ya cumplía (ListPage, toolbar y KPIs en una fila) |
| Planes | Tira de 2 KPIs (media fila vacía) + contador | Conteo, activos/archivados y valor sin IVA en la fila del buscador | Hueco y contador repetido |
| Producción | Encabezado de columna en dos líneas («ETAPA» + chip); menú ⋯ de 44 px en escritorio | Encabezado en una línea; menú de 32 px en escritorio (44 en móvil) | ~25 px por columna y ~12 px por tarjeta |
| Estudio | Catálogo de espacios antes de la agenda | Agenda y reservas (con sus filtros) primero; espacios debajo | Reservar/consultar es la tarea frecuente |
| Finanzas | Cuentas en tarjetas de ~260 px; cobros pendientes en y≈1140 | Cuentas en filas de dos líneas con los mismos datos; Balances más ancho; cobros pendientes en y≈670 | La lista de cobros (acción principal) entra en el primer pliegue |
| Cobranza y mora | Segundo encabezado «Estado de pagos» bajo el del shell; toolbar antes de los KPIs | Un solo encabezado; KPIs de cartera → antigüedad (con hora de actualización) → toolbar pegada a la lista | Título duplicado; el filtro afecta la lista, no los KPIs |
| Previsión | Márgenes del navegador en cada título/texto de panel (~30 px c/u) | Paneles compactos, mismo orden | Aire muerto |
| Informes | Comparativa (tabla grande o aviso) antes del resumen del mes | Resumen del período primero; comparativa después de las distribuciones | Lo que se viene a leer va arriba |
| Comisiones / Roles y permisos | 3 KPIs en grilla de 4 | KPIs a 3 columnas, textos sin márgenes extra | Hueco |
| Actividad | Uso del equipo (solo dueño) ocupaba todo el primer pliegue | Registro de cambios primero; uso del equipo debajo | El feed es lo que revisan todos los roles |
| Preferencias | 3 KPIs que repetían el contenido de las tarjetas | Sin KPIs; las dos tarjetas lado a lado; inicio y alcance en la nota, conteo de filtros en el título | Información duplicada |
| Papelera | Tira de 2 KPIs + contador + aviso de alcance repetido | Total y tipos en el contador de la toolbar | Hueco y duplicado |
| Equipo, Invitaciones, Historial, Configuración | — | Sin cambios | Ya en una fila / nav de anclas fija; Configuración es formulario largo por diseño |
| Portal y Superadmin | — | Sin cambios | Superficies propias (sistema visual público / panel global) |

## Navegación

Sin cambios de orden: los 5 grupos (Resumen · Flujo · Recursos · Finanzas ·
Configuración) ya ordenan por frecuencia (Producción primero en Flujo, #78) y su
orden está fijado por decisiones previas y pruebas. No se movieron rutas, URLs ni
permisos.

## Pendiente en primitivos (recomendado, no aplicado)

1. Reset de márgenes `h2/h3/p` bajo el contenido del shell (`:where(...)`, como en
   `data-surface='acceso'`): sin preflight cada título suma 1em; hoy se corrige con
   `m-0` pantalla por pantalla.
2. `KpiStrip`: columnas según la cantidad de KPIs (3 → 3 columnas) en vez de 4 fijas;
   hoy las pantallas lo fuerzan con `xl:!grid-cols-3`.
3. Shell: sumar Pipeline y Mora a `ownsHeader` para que el título y la acción primaria
   compartan fila vía `ListPage`.
4. `ListPage`: permitir `kpis` antes de `toolbar` cuando los KPIs no dependen del filtro.
5. `MenuDesplegable`: disparador de 32 px en escritorio por defecto (44 px en móvil).
