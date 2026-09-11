# Scale OS — una sola publicación

Estado: preparación; migración de producción no confirmada. Dario decidió conservar solo `scale-os` y retirar el servicio separado `scale-core-api` una vez sustituido.

## Decisión de arquitectura

La interfaz permanece en la raíz. `backend/` incorpora el código versionado de API `851906a` mediante importación Git con procedencia conservada. No incluye cambios locales ajenos, credenciales, base de datos ni dependencias instaladas.

Un Dockerfile produce una imagen y una aplicación Owncoding Hub llamada `scale-os`. Next sirve el puerto público 3000 y comunica `/core-api`, `/p` y `/review` con el backend interno en 127.0.0.1:3001. No se publica ese puerto. El supervisor espera la base lista antes de iniciar la interfaz; si cae un proceso termina el otro. `/health` atraviesa ambos. PostgreSQL sigue independiente para conservar los datos.

`admin.scaleparaguay.com` se conserva como alias de **esta misma aplicación** para no romper callbacks Google, cookies ni enlaces. No es otro despliegue. No cambiar simultáneamente la URL de callback de Google. Las referencias históricas a Dadoo en el código genérico se conservan hasta comprobar sus consumidores reales.

Se elige un arranque conjunto frente a agrupar solo repositorios, que todavía permitiría publicar versiones distintas. La contrapartida es que se prueban y publican ambos componentes juntos. Esta arquitectura no demuestra la causa del incidente de despliegue anterior.

## Condiciones antes del cambio

- Validar imagen Docker y arranque completo en destino aislado. Docker no está instalado en el equipo de preparación; pruebas locales/compilación no sustituyen esa validación.
- Comparar la configuración de ambos servicios sin exponer secretos. Trasladar la **DATABASE_URL del backend actual**, no crear una base vacía ni ejecutar las migraciones Prisma históricas del frontend.
- Trasladar variables vigentes de Google, correo, cifrado de enlaces y demás integraciones. Conservar exactamente GOOGLE_CLIENT_SECRET/INVITE_LINK_SECRET para recuperar enlaces existentes. No activar Stripe/R2 pendientes.
- Obtener respaldo verificable y guardar imágenes/commits anteriores. Comprobar consumidores y dominios del servicio anterior, incluyendo otras apps; no retirarlo si queda una dependencia sin resolver.
- Conservar dominios/TLS de `app.scaleparaguay.com`, `sistema.scaleparaguay.com` y alias `admin.scaleparaguay.com`.

## Corte controlado

1. Preparar `scale-os` con este Dockerfile, puerto 3000 y variables del backend. No publicar encima del servicio actual sin completar configuración y pruebas.
2. Probar imagen, health, login, fotos, guardados y PDF con una base aislada. Confirmar archivos estáticos.
3. En la ventana de cambio, detener el backend anterior antes de iniciar el nuevo sobre la base real: no ejecutar dos trabajadores de correo/mantenimiento. Mover el alias `admin` al nuevo servicio.
4. Confirmar health, versión 1.0.5, Google de ida/vuelta, invitaciones de ambos tipos, permisos pendientes, guardados y PDF.
5. Solo después retirar la aplicación `scale-core-api` de Owncoding Hub. Conservar PostgreSQL, volúmenes necesarios y respaldo. No borrar el repositorio remoto ni archivos locales con cambios sin conservar historia y verificar consumidores.

Ante fallo: detener el nuevo, restaurar servicio/alias anterior con la misma base. No bajar a un backend incompatible con migraciones de identidad; no borrar datos. Nunca ejecutar dos programadores de tareas para compensar un fallo.

## Desarrollo y pruebas

Instalar con `npm ci` en raíz y `npm ci --prefix backend`. Desarrollo: backend con `PORT=3001` y sus variables en un entorno seguro, interfaz con `npm run dev`. Producción: imagen Docker; `npm start` supervisa ambos procesos. La imagen prepara los archivos públicos de standalone.

`npm run test:deployment` comprueba supervisión/rutas. Las pruebas API están en `backend/test-*.mjs` y se ejecutan desde `backend/`. Nunca probar contra producción ni consumir invitaciones reales.

Verificación local del 11-09-2026: compilación standalone de 42 páginas; 33 suites del backend; 5 pruebas de supervisión/rutas. Arranque conjunto con PostgreSQL 16 real desechable, sin TCP para la base: health a través de Next, interfaz, imágenes, landing, alias admin, sesión e invitaciones de ambos tipos comprobadas por HTTP. No se llamó a Google ni se enviaron correos. `deployment/local-smoke.mjs` rechaza destinos no locales y bases que no sean el fixture indicado. Esta evidencia no confirma la imagen Docker ni un despliegue en Owncoding Hub.

Fuentes oficiales consultadas 11-09-2026: https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output y https://nextjs.org/docs/15/app/api-reference/config/next-config-js/rewrites.
