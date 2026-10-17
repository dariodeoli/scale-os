# Entorno aislado para QA de la app integrada #241

Estado al 17/10/2026: backend aislado listo y recorrido de la app integrada ejecutado. Frontend production local del integrador, compilado desde `50091b70` (v1.0.192), con API loopback. Ver comprobación final local en `FINAL.md`; esto no acredita un deploy.

| Recurso propio | Valor |
| --- | --- |
| Worktree | `/workspace/.worktrees/qa-ui-app241` |
| Rama/base al arrancar API | `codex/qa-ui-app241`, `f1aa3a6a` |
| API público local / interno | `4115` / `4116` |
| PostgreSQL 17 propio | `55450` |
| Datos persistentes | `/workspace/.qa-tools/ui-final241/database/data` |
| Launcher / sesión del ejecutor | PID `263055`, sesión `91855` |
| API Node / PostgreSQL | PID `263076` / PID `263069` |
| Frontend del integrador | Next production `3013`, sesión root `87858`, fuente compilada `50091b70` |

Los PID corresponden a este arranque; comprobar identidad antes de detener procesos. No tocar Next 3008, API 4109 ni PG 55449. El listener 3013 es propiedad del integrador: Next production del build final, log `/tmp/scale192-next-final.log`. No detenerlo desde QA. Build y start usan `SCALE_API_ORIGIN=http://127.0.0.1:4115`; el integrador verificó los rewrites `/core-api`, `/p` y `/review` a loopback.

## Verificación ejecutada

`GET http://127.0.0.1:4115/health` respondió 200, `ok:true`, `database:"ready"`, versión 1.0.191. Dos `POST /api/demo/start` respondieron 201 con usuarios y organizaciones diferentes. El login de un dueño local sintético no-demo respondió 200, y los tres `GET /api/auth/me` respondieron 200. No se creó el buzón local de correo. Los archivos de identidad, sesiones y log tienen permisos 600.

La respuesta de inicio demo requiere el Origin canónico `https://sistema.scaleparaguay.com`; se adaptó sólo ese header contra el destino local. El proxy del launcher convierte las cookies productivas en host-only para HTTP local. Las sesiones viven en PostgreSQL y los tenants demo tienen TTL; no son datos exclusivos del browser. Nunca se contactó producción para estas operaciones.

## Comandos desde el workspace raíz

Arranque/reinicio de **estos servicios propios**, después de comprobar puertos libres y que no quede otro launcher propio ejecutándose:

```bash
python3 /workspace/.qa-tools/ui-final241/start-api.py
```

Ese helper carga la identidad ficticia desde un archivo privado sin imprimirla en la terminal. Ejecuta el launcher soportado `backend/scripts/dev-local.mjs`, con PG17 disponible, directorio de datos propio, socket privado, origen frontend 127.0.0.1:3013 y puertos 4115/4116/55450. El launcher redirige el correo al buzón local. Su salida va a `/tmp/scale-ui241-api.log` con modo 600: **no volcar ese log completo**, porque incluye la credencial sintética de arranque.

Readiness sin secretos:

```bash
node --input-type=module -e 'const r=await fetch("http://127.0.0.1:4115/health");console.log(r.status,await r.json())'
```

Las sesiones ya están preparadas. Sólo para una nueva fixture completa autorizada:

```bash
node /workspace/.qa-tools/ui-final241/prepare-sessions.mjs
```

Este helper crea dos demos nuevas y hace login en el dueño local; no registrar usuarios ni enviar correo. Los tokens se guardan únicamente en archivos privados bajo `/workspace/.qa-tools/ui-final241/`: `demoA-session`, `demoB-session` y `ordinary-session`. `fixtures.json` contiene el descriptor y paths. No copiar esos archivos a git, reportes o capturas. `identity.json` contiene credenciales ficticias y tampoco se versiona.

Para detener únicamente el stack de este arranque, verificar primero PID y argumentos:

```bash
ps -p 263055,263076,263069 -o pid,args
kill -TERM 263055
```

El launcher apaga su API/proxy/PG y conserva los datos. No ejecutar comandos globales contra todos los Node/Next/Postgres.

## Recorrido ejecutado y continuación

Ver [README.md](README.md): 96 escenarios de páginas y 36 comprobaciones del header sobre el build indicado. Los runners y JSON no contienen tokens. Las capturas permanecen en `/tmp/scale241-app-final`; no se fuerza su inclusión en git.

El logout inicial se ejecutó únicamente contra el dueño local sintético. Después se renovó esa sesión con login local200 y auth200, sin crear demos ni correo; el header final se ejecutó con `QA_LOGOUT=0`, conservando la sesión. Las sesiones demo existentes permanecen disponibles.

El integrador sirvió el rebuild que incluye Mora, Balance, contenido comercial y Button/InputBase globales; por ese alcance se repitió la matriz completa y focals. No inferir que futuros cambios del árbol fuente ya están servidos por Next. No enviar reportes, correo ni usar OAuth/proveedores.
