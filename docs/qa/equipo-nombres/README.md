# Equipo · Personas — nombres completos (#110)

En la vista **Lista** de Equipo los nombres se cortaban con ellipsis aunque sobrara
ancho: la plantilla `--person-cols` repartía poco a la columna Persona y, dentro de
la identidad, el cargo (`person-container-secondary`) competía por el mismo ancho
con el nombre. Se rebalanceó la plantilla priorizando Persona y el cargo ahora
absorbe el recorte primero.

- Rama: `SOS-PLT` · issue **#110**.
- Guarda automática: `tests/equipo-nombres-110.test.ts` (registrada en
  `test:release-regression`).
- Medición: `build-tools/visual-harness/capture-equipo-nombres.mjs` (mide
  `scrollWidth` contra `clientWidth` del nombre en cada fila y saca las capturas).

## Antes / después de la plantilla

| Columna | Antes | Después |
| --- | --- | --- |
| Persona | `minmax(9rem,1.3fr)` | `minmax(14rem,2.4fr)` (mayor `fr` de la fila) |
| Correo | `minmax(8rem,1.1fr)` | `minmax(7rem,.75fr)` — trunca con `title` |
| Datos | `minmax(11rem,1.3fr)` | `minmax(9rem,1fr)` |
| Estado | `4.5rem` | `4.5rem` |
| Ficha | `minmax(12rem,1.4fr)` | `minmax(10rem,1.15fr)` |
| Acceso | `minmax(8.5rem,1fr)` | `minmax(7.5rem,.8fr)` |
| Acciones | `7rem` | `7rem` |

Dentro de la identidad (solo vista Lista): `.person-container-name` queda con
`flex:0 1 auto` y `.person-container-secondary` con `flex:0 999 auto;min-width:3.5rem`.
Así el nombre no cede ancho mientras el cargo conserva un mínimo visible y sólo
entra en ellipsis como último recurso (la columna y el `title` siguen siendo la
salida). En tarjeta y en móvil el nombre ya envolvía completo: no se tocó ese
contrato.

## Medición real (capturas en esta carpeta)

`metricas-antes.json` / `metricas-despues.json`, 9 personas de la demo, misma
pantalla y ancho de riel (grilla 1144 px):

| Vista | Antes | Después |
| --- | --- | --- |
| Lista 1440 · claro | 9/9 nombres cortados (y 8/9 cargos) | **0/9** nombres cortados (0/9 cargos) |
| Lista 1440 · oscuro | 9/9 nombres cortados | **0/9** |
| Lista 390 · claro/oscuro | 0/9 (envuelve en tarjeta apilada) | 0/9 |
| Tarjeta 1440 | 0/9 | 0/9 |
| Correo (1440) | 5/9 cortados, con `title` | 5/9 cortados, con `title` (puede truncar) |

Capturas: `equipo-lista-antes-<ancho>-<tema>.jpg` y `equipo-lista-despues-…`, más el
recorte de encabezado + primeras filas (`equipo-lista-encabezado-filas-…`) y la vista
tarjeta (`equipo-tarjeta-…`) en 1440 y 390, claro y oscuro. La evidencia visual del
"antes" es el nombre con ellipsis y columnas vecinas con aire; en el "después" se lee
el nombre y el cargo completos, una línea por persona, con Correo truncando él.

## Cómo reproducir

```bash
# Con el stack local arriba (API 3977, front 3077, proxy 3078) y la sesión demo
QA_SESSION=plt-qa-session.txt QA_LABEL=antes   node build-tools/visual-harness/capture-equipo-nombres.mjs
QA_SESSION=plt-qa-session.txt QA_LABEL=despues node build-tools/visual-harness/capture-equipo-nombres.mjs
```

Las capturas "antes" se sacan con el artifact previo al fix y las "después" después
de `npx next build` (el script navega a `/equipo`, fuerza la preferencia
`scale:team-view=list` y mide fila por fila).
