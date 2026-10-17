# Propuesta de fachadas de superficies y colecciones — #241

Estado: propuesta para decisión del integrador; sin implementación ni migración de consumidores. Inspección exclusivamente de JSX/imports locales sobre `f0bcec6a` y el lote de límites posterior. No se inspeccionó código fuente externo de OwnCoding.

## Superficies: `app/ui/surface.tsx`

La API inicial puede conservar **exactamente** el `Card` actual mediante una reexportación local. No requiere reconstruir su renderer ni introducir variantes de negocio:

```tsx
'use client';
export {Card} from 'owncoding-ui';
```

El alias mantiene los props, eventos, children, inferencia y comportamiento del objeto instalado. Si se necesita un tipo público, derivarlo con `ComponentProps<typeof Card>` en lugar de copiar un contrato externo. No prometer una ref DOM nueva sin comprobar su compatibilidad mediante TypeScript y una prueba del renderer real.

Los 21 nodos JSX locales importados de la librería sólo usan `children`, `className` y, en dos casos, semántica ARIA explícita. No usan acciones de tarjeta, selección, navegación ni variantes. Mantener clases y roles del consumidor; no convertir todas las tarjetas en botones o regiones, ni añadir headings automáticos.

| Archivo | Card: cantidad y líneas | Props adicionales a children |
| --- | --- | --- |
| `app/daily-controls.tsx` | 1: 129 | `className` |
| `app/financial-forecast.tsx` | 5: 117,143,159,182,223 | `className` |
| `app/growth-dashboard.tsx` | 1: 15 | `className` |
| `app/inventory-workspace.tsx` | 3: 443,504,522 | `className` |
| `app/reports-workspace.tsx` | 6: 124,189,195,196,201,218 | `className`; en124 `role="region"`, `aria-label` |
| `app/studio-workspace.tsx` | 4: 131(dos ramas),133,164 | `className` |
| `app/weekly-automatic.tsx` | 1: 43 | `className`, `aria-label` |

## Colecciones: `app/ui/collection.tsx`

Propuesta inicial compatible y sin conversión de filas:

```tsx
'use client';
export {DataTable} from 'owncoding-ui';
```

Conservar la firma genérica del objeto exportado evita perder el tipo de `row` al envolverlo con un `ComponentProps` genérico que lo ensanche. No introducir un tipo de filas `Record<string, ReactNode>`: el historial comercial transporta un objeto `amendment` completo y usa `columns.render(row)`.

Los cinco nodos JSX importados usan `columns`, `rows` y `mobileCard`. Cada fila ya aporta un `id` estable. Las columnas locales requieren `key`, `label`, `align:'right'` opcional y `render(row)` opcional. El wrapper no debe indexar arbitrariamente cualquier propiedad como contenido cuando existe renderer explícito.

| Archivo/línea | Particularidades del contrato local |
| --- | --- |
| `app/client-commercial-lifecycle.tsx:32` | `className` con ancho mínimo de tabla; `emptyLabel`; renderers de fecha, plan/versión, moneda y descuentos; `mobileCard` usa `row.amendment`. |
| `app/growth-dashboard.tsx:29` | Filas día/conteo, conteo alineado a derecha, `emptyLabel`, tarjeta móvil compacta. |
| `app/financial-forecast.tsx:164` | Una tabla por moneda; filas mes/caja/resultado con nodos React y color económico ya calculado; `mobileCard`. |
| `app/weekly-automatic.tsx:55` | Columnas dinámicas por tipo de producción; identidad con foto, conteos y proyectos; `mobileCard`. |
| `app/reports-workspace.tsx:204` | Comparativa visible/anterior ya calculada: métrica, valores y variación; `mobileCard`. |

`app/superadmin/usage-charts.tsx` declara otro `DataTable` **local** para tablas accesibles asociadas a gráficos. No es un uso importado de OwnCoding ni pertenece a estos cinco; no sustituirlo por coincidencia de nombre.

## Estados, accesibilidad y comprobación propuesta

- Carga, error, vacío, permisos, filtros y selección de moneda permanecen en sus consumidores actuales. Varias tablas ni siquiera se montan si faltan filas. No crear consultas, ordenar, paginar o combinar monedas desde la fachada.
- Mantener el modo tabla de escritorio y las tarjetas móviles, el orden y las keys estables. Verificar ambos modos antes de reemplazar el renderer en una futura etapa.
- Una migración autorizada posterior puede cambiar únicamente los imports de estos dos símbolos, sin alterar props ni clases. Registrar el alcance por origen de import, no por texto `Card`/`DataTable`.
- Validación mínima de esa migración: TypeScript sobre los consumidores; comparación de filas/columnas y renderers; estado vacío; ARIA de los dos Card con nombre; vista móvil/escritorio de historial y tablas financieras. No se añadieron pruebas nuevas para una propuesta sin producto ejecutable.

Decisión solicitada: aprobar estas dos fachadas de reexportación y, en un lote separado, la sustitución de imports de los 26 nodos señalados. Cualquier nuevo contrato de variantes o renderer local requiere un alcance posterior explícito.
