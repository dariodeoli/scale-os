# Carga producción-like — medición y cuellos de API (#108)

Medición de carga realista sobre un stack local con **volumen tipo producción** y
red emulada, más los cambios de API que salieron de la medición. Todo lo que sigue
se puede reproducir con los scripts de `build-tools/visual-harness/` (carpeta con
stack propio; no toca el checkout principal ni la base de la demo).

- Rama de trabajo: `SOS-PLT` · issue **#108** (medición pedida en #106).
- Números crudos: `endpoints-volume-antes.json/md`, `endpoints-volume-despues.json/md`,
  `mediciones-antes.json/md`, `mediciones-despues.json/md` y el resumen comparativo
  en `comparativa.md`.
- Capturas visuales del mismo stack: `docs/qa/carga-plt/` (#106) y
  `docs/qa/densidad-plt/` (#98).

## Pila y volumen

| Pieza | Valor |
| --- | --- |
| PostgreSQL temporal | `PG_DIR=/tmp/plt-e2e-pg-SOS-PLT2`, puerto `55477` |
| API | `http://127.0.0.1:3977` (`backend/server.js`, `DATABASE_URL=…55477/scaleos`) |
| Front | `http://127.0.0.1:3077` (`next start` con el artifact del branch) |
| Proxy del front | `http://127.0.0.1:3078` (`qa-proxy.mjs`, pipe crudo: **conserva la compresión**) |
| Empresa con volumen | org **9** (Agencia Horizonte demo) |
| Volumen sembrado | `node build-tools/visual-harness/seed-volume-plt.mjs` → 320 clientes, 80 proyectos, 1580 piezas, 6852 filas de auditoría, 407 ítems de inventario, 400 notificaciones |

Red emulada por CDP (`Network.emulateNetworkConditions`): escritorio
**40 ms / 10 Mbps / 3 Mbps** y móvil **80 ms / 1,6 Mbps / 750 kbps**.

## Cómo se midió

```bash
# Endpoints: TTFB p50/p95 + bytes reales (comprimidos) y decodificados
QA_SESSION=plt-qa-session.txt QA_ITER=12 OUT_DIR=docs/qa/carga-prod \
  OUT_FILE=endpoints-volume-despues.json OUT_MD=endpoints-volume-despues.md \
  node build-tools/visual-harness/measure-endpoints-plt.mjs

# Pantallas: navegación real con latencia emulada, peso transferido, FCP, load
QA_SESSION=plt-qa-session.txt QA_LATENCY="desktop=40:10000:3000,mobile=80:1600:750" \
  OUT_DIR=docs/qa/carga-prod node build-tools/visual-harness/measure-load-plt.mjs
```

`measure-endpoints-plt.mjs` usa `http`/`https` con `agent:false` (sin keep-alive ni
pool) para aislar el TTFB del endpoint, y conserva el `content-encoding` real. El
proxy del front se arregló en esta rama: antes reenviaba con `undici`, que
descomprime solo, y la medición veía tamaños inflados.

## Hallazgos (causas)

1. **Fotos y logos embebidos en cada payload.** `organization_person_identity.photo_url`,
   `agency_collaborators.photo_url` y `agency_clients.logo_url` se guardan como
   `data:image/webp;base64,…` y viajaban repetidos en cada lista: Equipo
   (162 KB decodificados), responsables de proyectos y piezas, presencia/uso
   (80 KB), directorio de responsables, selector de responsables. Es el peso
   dominante de las pantallas PLT; en móvil a 1,6 Mbps 190 KB son ~1 s de transferencia.
2. **Sin N+1 en lo medido.** Los endpoints medidos resuelven en una consulta (o pocas)
   y con ventanas (`limit/offset`); los TTFB locales quedaron en un dígito de ms,
   así que el problema era de bytes, no de plan de consultas. La compresión ya viaja
   (brotli por defecto) y no había caché de payloads repetidos.
3. **Peso estructural de listas completas.** `GET /api/agency/clients` sin `?fields=`
   devuelve 30 columnas por cliente: 197 KB decodificados para 320 filas, de los
   cuales ~140 KB son **nombres de campo repetidos**, no datos. El shell ya pide su
   proyección (`CLIENT_FIELDS_CHROME`, 48 KB); conviene que ninguna pantalla pida el
   directorio completo (el dato real pesa 60 KB).
4. **Pedido duplicado de presencia.** Algunas pantallas montan dos componentes que
   piden `presence/usage` a la vez (dos veces 59 KB antes). Con el arreglo de fotos
   el pedido pesa 0,5 KB, así que la deduplicación del front ya no es urgente
   (queda como mejora menor de shell).

## Qué cambió

- **`backend/agency-media.js` (nuevo)** — `GET /api/agency/media/:kind/:id` con
  `kind ∈ person|collaborator|client`. Sirve los bytes del `data:` guardado con
  `Cache-Control: private, max-age=86400, immutable`, `ETag` (SHA-1 del contenido) y
  `304` con `If-None-Match`. Si el valor guardado es un enlace externo (`https`),
  responde `302` al enlace; si no hay foto, `404`; sin sesión, `401`; otra empresa,
  `404`. La versión viaja como `?v=<sha1[:10]>`, así que un cambio de foto invalida
  la URL sin tocar la caché.
- **Sustitución en los payloads** — donde antes viajaba el base64 ahora viaja
  `/core-api/api/agency/media/<kind>/<id>?v=…`:
  - `backend/actor-identity.js` (punto único de `_photo_url` de atribución: actividad,
    presencia/uso, historial, comentarios, reservas, checklist).
  - `backend/operations.js` (Equipo: colaboradores, miembros y directorio).
  - `backend/agency-core.js` (logo de clientes y responsables de proyectos).
  - `backend/agency-suite.js` (foto del actor en Actividad).
  - `backend/work-order-assignees.js` (responsables efectivos del tablero).
  - `backend/productivity.js` (`productivity/people`: directorio y menciones).
  - `backend/project-assignees.js` (selector de responsables).
- **Front** — `safePhoto` (`app/actor-identity.tsx`) acepta la URL interna del medio
  (mismo origen, con `?v=`); sin eso las fotos caían a iniciales. Los enlaces `https`
  y los `data:` válidos siguen funcionando igual.
- **Test** — `backend/test-agency-media.mjs` (registrado en `test:release`): bytes,
  `ETag`/`304`, redirección de externos, guardas de sesión/empresa, y que Equipo,
  clientes, proyectos, actividad, presencia/uso, directorio y selector devuelvan la
  URL del medio. Guarda de front en `tests/actor-identity.test.tsx`.

## Resultados

Tabla completa en [comparativa.md](comparativa.md). Lo saliente (bytes transferidos,
mediana, con compresión real):

| Payload | Antes | Después | Δ |
| --- | --- | --- | --- |
| Equipo (162,6 KB decodificados) | 59,5 KB | **1,1 KB** | −95 % |
| Proyectos completo (361,9 KB dec.) | 60,6 KB | **2,1 KB** | −91 % |
| Presencia · uso (79,9 KB dec.) | 58,8 KB | **0,5 KB** | −97 % |

Pantallas (escritorio; móvil con la misma proporción):

| Pantalla | Antes | Después | Δ |
| --- | --- | --- | --- |
| Equipo | 192 KB | 77 KB (primera visita)\* | −60 % |
| Actividad | 191 KB | 76 KB (primera visita)\* | −60 % |
| Historial | 193 KB | 18 KB | −91 % |
| Permisos / Papelera / Preferencias / Configuración | 132–133 KB | 15–16 KB | ≈ −88 % |
| Invitaciones / Superadmin | 6 / 4 KB | 6 / 4 KB | — |

\* La primera visita a Equipo/Actividad incluye las fotos del equipo como pedidos
independientes (~11–16 KB cada una). Quedan cacheadas (`immutable`, 24 h): la visita
siguiente de esas pantallas pesa 17 KB y 16 KB (pasada móvil del mismo JSON). Antes
no había caché posible porque el base64 viajaba dentro de cada JSON.

Tiempos: el TTFB local se mantuvo en un dígito de ms (p50 3–21 ms según endpoint) y
`load`/FCP de las pantallas no cambiaron (175–186 ms escritorio, 218–266 ms móvil
contra 172–182 / 216–228 ms antes). En este stack el cuello era el peso de
transferencia, no el servidor.

## Pendientes (handoff)

Mismo patrón de una línea, fuera del alcance PLT de esta rama:

1. **Estudio (OPS)** — `backend/studio-reservations.js`: `responsible_members` (jsonb)
   y el selector `members` devuelven `photo_url` con base64. Se resuelve con
   `mediaPeople(...)` de `backend/agency-media.js` sobre las filas.
2. **Previsión (FIN)** — `backend/forecast.js` (`personnel.photo_url` en el `json_agg`
   de colaboradores). `mediaPeople` sobre las filas del resultado.
3. **Shell (opcional)** — deduplicar el pedido de `presence/usage` cuando dos
   componentes lo montan a la vez (ya pesa 0,5 KB, mejora menor).
4. **Listas completas (opcional)** — que ninguna pantalla pida el directorio de
   clientes sin `?fields=`; el peso restante es de nombres de campo, no de datos.

## Limitaciones

- La medición es local (loopback): valida bytes, caché y forma de los payloads, no
  latencia WAN real. `PROD_BASE`/`PROD_SESSION` del script permiten repetirla contra
  producción con una sesión real cuando haga falta.
- El volumen es sintético (formas y cardinalidades realistas, contenido de demo).
- Los p95 de TTFB en loopback tienen ruido de máquina (± decenas de ms); las
  medianas y los tamaños son estables entre corridas.
