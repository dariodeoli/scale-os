# Comandos del orquestador — ScaleOS

Estándar del grupo (owncoding-ui `docs/COMANDOS.md`, v0.14.x). Estos comandos los escribe el dueño en la sesión de coordinación.

| Comando | Qué hace | Cómo lo responde el orquestador |
| --- | --- | --- |
| **`pp`** | Resumen de pendientes | Producción (versión y salud de web/API), ramas de slots con commits sin integrar, agentes libres/ocupados, issues abiertos y pendientes del dueño |
| **`pd`** | Pendiente de deploy | Tabla **commit → qué cambia** con el tipo de cada uno (`feature`/`fix`/`test`/`docs`), por rama lista para integrar |
| **`al`** | Agentes libres | Quién está libre y cómo repartir el trabajo pendiente entre dominios; propone ronda |
| **`ht`** | Ciclo completo | Ordena al integrador: merge → suite de checks → push → `NOVEDADES.md` → release + smoke |
| **`hd`** | Alias de `ht` | Igual que `ht` |

Reglas generales: nada se mergea, pushea ni despliega fuera de `ht`/`hd` o una ronda ordenada; el único que toca `main` y despliega es el integrador (con `SCALE_INTEGRATOR=1`); los conflictos se resuelven en el worktree del slot que rebasea (nunca en `main` ni en silencio); si una rama queda superseded (diff neto vacío), se descarta y se avisa; el orquestador no toca código.

## hd automático (vigía)

Política del grupo: cuando hay **≥ 15 commits nuevos sin integrar** (suma de las ramas de slots contra `origin/main`), el integrador está libre y pasó el **cooldown de 20 minutos**, se dispara el ciclo `hd` completo sin intervención.

- Script: `tools/auto-hd.sh` (copia versionada en el repo; el vigía sigue corriendo desde el orquestador). Corre en segundo plano; chequea cada 120 s; dispara con `herdr agent prompt sos-integ` el contenido de `auto-hd-brief.md` (y `auto-hd-notas.md` si existe, para contexto vigente de la campaña).
- Estado: `auto-hd.pid` (proceso), `auto-hd.last` (último disparo), `auto-hd.log` (rota a `.1` a 512 KB).
- Operación: `./auto-hd.sh status` · `start` · `stop` · `check` (pasada en seco) · `force` (dispara una vez, manual).
- Pausa: `touch auto-hd.pause` para suspender; borrarlo para reanudar.
- Umbral, cooldown, intervalo, repo, patrón de ramas y agente se ajustan por variables de entorno (`AUTO_HD_*`), así que el mismo script sirve para LedBox u otra app cambiando `AUTO_HD_REPO`, `AUTO_HD_BRANCHES`, `AUTO_HD_AGENT` y `AUTO_HD_BRIEF`.
- El `ht`/`hd` manual siempre está disponible y adelanta el ciclo. Nunca hay dos ciclos a la vez: el disparo automático espera si el integrador está trabajando, bloqueado o hay un merge en curso.
- `NOVEDADES.md`: el integrador mantiene `docs/NOVEDADES.md` en el repo (acumulativo por versión, en lenguaje de producto); si no existe, lo crea en el primer ciclo.

## Versionado en esta app

- `COMANDOS.md` (raíz): estos comandos y la política del `hd` automático.
- `tools/auto-hd.sh` + `tools/auto-hd-brief.md`: copias de las del orquestador (issue #48). El vigía sigue corriendo desde el orquestador; estas copias quedan versionadas para referencia y continuidad del grupo.
- `docs/NOVEDADES.md`: lo mantiene el integrador, acumulativo por versión (punto 6 del ciclo `hd`).
