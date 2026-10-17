# Entorno aislado para QA de la app integrada #241

Estado al 17/10/2026: **sólo backend preparado**; frontend pendiente de catálogo, fixes finales y build del integrador con API loopback. Esto no acredita una aprobación de la app final ni un deploy.

| Recurso propio | Valor |
| --- | --- |
| Worktree | `/workspace/.worktrees/qa-ui-app241` |
| Rama/base al arrancar API | `codex/qa-ui-app241`, `f1aa3a6a` |
| API público local / interno | `4115` / `4116` |
| PostgreSQL 17 propio | `55450` |
| Datos persistentes | `/workspace/.qa-tools/ui-final241/database/data` |
| Launcher / sesión del ejecutor | PID `263055`, sesión `91855` |
| API Node / PostgreSQL | PID `263076` / PID `263069` |
| Frontend | **No iniciado por QA**; 3013 pertenece temporalmente a otro agente |

Los PID corresponden a este arranque; comprobar identidad antes de detener procesos. No tocar Next 3008, API 4109 ni PG 55449. El listener 3013 corresponde a la QA aislada de catálogo de otro agente y se conserva hasta que su propietario lo cierre.

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

## Próximo paso, todavía no ejecutado

Esperar señal de root y SHA integrado final. La API puede permanecer disponible; actualizar únicamente la fuente QA que corresponda. Construir/iniciar Next con `SCALE_API_ORIGIN=http://127.0.0.1:4115`, usando `.next` aislado; confirmar antes del navegador que `.next/routes-manifest.json` apunta `/core-api` al proxy local. Un build con rewrite productivo no sirve para esta QA y la intercepción browser no ve el upstream de Next.

Después:13 módulos reales de navegación en 1440/390, temas claro/oscuro/contraste, hover/foco/overflow y primer pliegue para el informe #248. Añadir auth y subapartados financieros conforme al alcance indicado por el integrador. Para #245, abrir/cancelar reporte desde el contexto ordinary; en demo se oculta por `user&&!demo`. Logout real queda limitado a esa identidad local sintética. Ningún envío de reportes, OAuth, correo o proveedores.

Cada evidencia final indicará su SHA real. La QA anterior de candidatos separados no acredita este candidato integrado.
