# Verificación de contenedores Node 24

Se usó exclusivamente el daemon local `unix:///var/run/docker.sock`, limpiando
los selectores de endpoint/contexto/TLS de Docker para cada comando. No se
modificaron configuración Docker, credenciales de registry ni Dockerfiles del
repositorio. Recursos disponibles al iniciar: 5 CPU, 33 GiB de RAM y 28 GiB de
espacio libre.

## Resultados

- `node:24-alpine` resolvió a
  `sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f`:
  Node **24.22.0**, Alpine **3.24.2**, `libssl.so.3` disponible. Node satisface
  el requisito `>=24.15.0 <25` de owncoding-ui.
- Una imagen **parcial de dependencias del API** instaló correctamente el lock
  con `npm ci --omit=dev --strict-ssl=true`. En esa imagen funcionan imports de
  `pg` y `puppeteer-core`, y sharp **0.35.4** con libvips **8.18.6** generó un
  WebP válido de 44 bytes. Esto confirma carga de la dependencia nativa en musl.
- El build completo del backend quedó **bloqueado** al descargar índices de
  `https://dl-cdn.alpinelinux.org/alpine/v3.24/`: el proxy devolvió **403 CONNECT**.
  Los mensajes posteriores de apk «no such package» no prueban que falten los
  paquetes: no se pudo cargar su índice.
- Por ese bloqueo **no se validaron** instalación de `postgresql18-client`,
  versión de `pg_dump`, Chromium ni generación PDF dentro de la imagen final.
  Tampoco se completó el build de la imagen frontend.

## Diferencias respecto a producción y continuación

Los Dockerfiles temporales en `/tmp/scale-container-qa/` agregan únicamente
montajes BuildKit de `/etc/ssl/certs/ca-certificates.crt` como secreto
`system_ca` y variables de trust por cada `RUN` con red: `SSL_CERT_FILE` para
apk, `NODE_EXTRA_CA_CERTS` para Node/npm/Prisma y `GIT_SSL_CAINFO` para Git.
El certificado no se copia a ninguna capa; TLS y verificaciones permanecen
activados. La variante parcial instala sólo dependencias npm, omite apk y el
código API, y **no equivale a la imagen de producción**.

Buildx usa `BUILDX_CONFIG=/tmp/scale-container-qa/buildx` porque su ubicación
predeterminada es de sólo lectura; `DOCKER_CONFIG` y los logins no cambian.

Para continuar hace falta permitir `dl-cdn.alpinelinux.org` en la configuración
del entorno y repetir el paso apk con verificación activa. Después corresponde
probar `pg_dump --version` y PDF con Chromium en el contenedor, y construir el
frontend. El lock frontend referencia owncoding-ui por Git SSH: si falla ese
paso debe verificarse el mecanismo de autenticación del build de despliegue,
sin copiar credenciales a capas ni sustituir dependencias.

Ninguna imagen fue publicada ni desplegada. Los builds y la QA anteriores en el
host siguen siendo evidencia separada de esta comprobación de contenedores.
