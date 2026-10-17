# Verificación de contenedores Node 24

Fecha: 17/10/2026. Builds locales completos de web y API aprobados; ninguna
imagen publicada ni desplegada por esta comprobación.

## Resultados

- Base `node:24-alpine`, digest
  `sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f`:
  Node **24.22.0**, Alpine **3.24.2**, compatible con owncoding-ui.
- API: build completo `scale-qa-api:node24`; `npm ci --omit=dev` y paquetes
  Alpine instalados con TLS activo. `pg_dump` **18.6**, Chromium **155**,
  imports pg/Puppeteer y sharp **0.35.4** con libvips **8.18.6** aprobados.
  Sharp generó WebP válido. El renderer real `contractHtml` → `renderBudgetPdf`
  produjo PDF de **31.076 bytes**, **5 páginas A4**; firma, título y cláusula 55
  comprobados con pdfinfo/pdftotext.
- Web: build multietapa completo `scale-qa-web:node24`: instalación npm,
  dependencia Git owncoding-ui, Prisma generate y Next build **v1.0.188**.
  Runtime como **UID 1001**, `.next/BUILD_ID` presente; GET `/resumen` **200**
  (17.436 bytes). El contenedor temporal de smoke fue detenido/eliminado.

## Alcance y diferencias

Se usó únicamente el daemon local `unix:///var/run/docker.sock`, limpiando sus
selectores de endpoint/contexto/TLS por comando y conservando credenciales.
Los Dockerfiles temporales de `/tmp/scale-container-qa/` agregan sólo montajes
BuildKit de la CA pública del entorno y variables de confianza por cada RUN con
red (`SSL_CERT_FILE`, `NODE_EXTRA_CA_CERTS`, `GIT_SSL_CAINFO`). No se copió la CA
a capas ni se desactivó verificación TLS. Los Dockerfiles fuente sólo cambian
la versión Node; no contienen certificados ni secretos del entorno cloud.

El primer intento quedó bloqueado por HTTP 403 del proxy a Alpine. Tras responder
ese host, se repitieron y completaron los builds, incluyendo PostgreSQL18-client
y Chromium. Esta evidencia reemplaza el bloqueo inicial; no es evidencia de
que Coolify haya desplegado estas imágenes locales.

Logs, JSON y PDF temporales: `/tmp/scale-container-qa/`, fuera del repositorio.
Buildx usó configuración escribible temporal; DOCKER_CONFIG y logins intactos.
