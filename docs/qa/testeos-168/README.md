# Campaña de testeos de app — v1.0.168 (issue #154)

Recorrido integral por dominio sobre la release **v1.0.168** (rama `SOS-OPS`
rebasada en v1.0.169 + #151), con e2e automatizado donde existe y recorrido
manual con datos reales de la demo, casos borde (vacíos, estrés, permisos,
sesión vencida) y evidencia 390/1440 claro-oscuro.

## Método

- **Automatizado**: `e2e-drag.mjs` (drag & drop real contra la app + Postgres) y
  los harness por vertical (`qa-testeos-168-ops.mjs` para OPS; los demás slots
  corren los suyos). El harness navega por ruta, verifica contratos por DOM y
  muta únicamente la demo descartable del stack local.
- **Manual/asistido**: mismos flujos en 390 y 1440, claro y oscuro, con captura
  por superficie; las mutaciones (comentario, checklist, aprobación, alta de
  espacio/reserva, verificación) se hacen por UI como un usuario.
- **Entorno**: stack local (`e2e-ops-stack.mjs`: Postgres temporal + API real +
  front standalone + proxy de un solo origen) con una demo nueva por corrida
  (20 proyectos · 80 piezas · 7 equipos · 0 espacios).
- **Producción**: `app.scaleparaguay.com/status` y `api.scaleparaguay.com/health`
  en v1.0.168 al 03-10 02:15.

## Inventario de flujos críticos por dominio

| Dominio | Flujos críticos | Cobertura |
|---|---|---|
| **COM** | Clientes (alta/edición/ficha), pipeline y dnd, presupuestos y popups, planes, métricas, exportaciones | Slot COM (instruido por el orquestador) |
| **OPS** | Producción tablero/dnd/filtros/vistas, detalle de pieza (comentarios, checklist, aprobación→publicación), proyectos/detalle, inventario (lista/cuadrícula/pipeline/reservas/alta/verificación), estudio (espacio/reserva/cancelación), historial y pendientes internos | **Esta evidencia** (68 checks) |
| **FIN** | Finanzas/balances, mora, previsión, informes, salarios, comisiones, conciliación | Slot FIN (instruido) |
| **PLT** | Equipo/permisos, configuración, superadmin, portal del cliente, invitaciones, papelera | Slot PLT (instruido) |
| **DSN** | Shell/nav, landing, a11y, responsividad 390/1440, claro/oscuro, componentes base | Slot DSN (instruido) |

## OPS — resultado

`qa-testeos-168-ops.mjs --checks` → **68/68 checks en verde**, 0 hallazgos de
app. Recorrido por corrida:

- **Producción tablero**: 7 etapas con conteos, tarjetas con identidad/due/
  responsables, filtro de cliente honesto (contador + solo tarjetas del cliente),
  riel de etapas, detalle abre/cierra. Sin chips vacíos, horas humanas y
  terminadas sin «venció» (#151).
- **Detalle de pieza**: historial con registro, comentario publicado por UI,
  checklist agregar/completar/quitar con estado honesto (`Completado · sin
  registro` en ítems del fixture), aprobación → publicación en piezas en
  revisión.
- **Vistas**: Mi día, Calendario y Lista y lotes cargan sin errores; la lista
  muestra filas.
- **Proyectos**: lista y detalle con contador de piezas = longitud de la lista.
- **Inventario**: foto rota cae al placeholder (0 `<img>` quebrados), nombres
  sin recortar, búsqueda sin resultados con salida, verificación rápida, vista
  cuadrícula/pipeline/calendario, alta exige nombre.
- **Estudio**: vacío inicial → alta de espacio → reserva → cancelación.
- **Historial/Resumen**: actividad del equipo y pendientes internos cargan.
- **Permisos**: viewer sin menú ⋯ ni manija de arrastre en Producción; sin alta,
  reserva ni verificación en Inventario.
- **Sesión vencida**: cookie inválida → pantalla de acceso, sin shell interno.
- **Estrés**: 80 piezas y 20 proyectos por corrida; ventana de lista y columnas.

`e2e-drag.mjs` → **PASS**: tablero mouse/touch/filtro con persistencia en
Postgres, pipeline mouse/touch con columna de solo lectura rechazando el drop y
viewer sin efecto.

## Hallazgos

- **OPS: sin fallas de app** en los flujos del alcance. Los únicos rojos durante
  la campaña fueron del propio harness (selector de filtro, rótulo de la sección
  Historial y expectativa del alta de Inventario), corregidos y re-verificados;
  no se tocó código de producto.
- **Despliegue**: la ronda #135/#147/#148 entró en v1.0.168, pero **#151 no está
  en `origin/main` v1.0.169** (verificado por contenido: no existe
  `app/hours-format.ts`), así que su verificación en vivo queda pendiente hasta
  que el integrador la incluya en un release. Este informe cubre #151 en la rama
  `SOS-OPS` construida sobre v1.0.169.

## Reproducir

```sh
node build-tools/visual-harness/e2e-ops-stack.mjs          # stack + demo descartable
node build-tools/visual-harness/qa-testeos-168-ops.mjs --checks
node build-tools/visual-harness/e2e-drag.mjs
```

Salida: `informe-ops.json` (checks, hallazgos, log), `qa-ops.txt` y las capturas
`*-{390,1440}-{light,dark}.jpg` de esta carpeta.
