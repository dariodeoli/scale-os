# Auditoría de landing y acceso — Refs #265

Base: `origin/main` `f2d52f5e` (1.0.194). Superficie exclusiva: landing pública y formularios de acceso. No se cambiaron permisos, autenticación, creación de agencias, datos ni servicios externos.

## Hallazgo y corrección

El header sticky de la landing cambia de altura al envolver los enlaces, pero las anclas usaban siempre `scroll-padding-top:72px`. En Chromium, abrir «Precio» dejaba su sección parcialmente debajo de la navegación:

| Ancho CSS | Alto del header | Inicio de sección antes | Inicio después |
| --- | ---: | ---: | ---: |
| 320 | 149 | 71.94 | 160.94 |
| 390 | 105 | 71.69 | 116.69 |
| 768 | 61 | 72.41 | 73.41 |
| 1024 | 61 | 72.13 | 73.13 |
| 1440 | 61 | 71.59 | 72.59 |

Ahora el inset usa la altura real del header más 12 px, mediante `ResizeObserver` (con evento resize como respaldo). Los breakpoints conservan un respaldo CSS sin JavaScript. El observador también responde al cambio de líneas provocado por fuentes y redimensionado. No agrega peticiones, dependencias ni mediciones de usuarios.

Los enlaces pequeños dentro de párrafos/avisos son enlaces inline; no se les impuso un alto de 44 px que alteraría todo el ritmo del texto. Los controles de acceso usan los componentes existentes. No se duplicó el sistema de diseño.

## Texto de los campos de login

La página real de login del servidor Next local se abrió a 320/390/768/1024/1440 con respuestas de API interceptadas, sin autenticación real. No mostró overflow, pero los campos tenían texto calculado de **15 px**; registro ya usaba 16 px. Se agregó un ajuste exclusivo de `AccessLayout` para que los campos del login también usen **16 px**, el umbral que evita el zoom de foco habitual de Safari móvil. Se preservan su altura, bordes y componentes.

El gate de acceso verifica el marco, EmailField y PasswordField reales con la clase del login a los cinco anchos: texto calculado 16 px y sin overflow. Esto acredita geometría y CSS; no sustituye una prueba física de Safari.

## Verificación reproducible

- `node tests/landing-responsive-browser-265.test.mjs`: Chromium real, **20 navegaciones a anclas** (Funciones/Precio × 320/390/768/1024/1440 × claro/oscuro). Redimensiona el mismo documento, comprueba que la sección queda debajo del header, sin overflow horizontal ni imágenes rotas. Sirve HTML/assets locales e intercepta el logo canónico hacia el archivo local; bloquea el resto del tráfico externo. Sin POST real.
- El mismo gate contra el documento de main anterior falla por la sección cubierta a 320 px. La prueba espera el resultado geométrico, sin depender del nombre de la variable CSS ni del observador.
- `node tests/access-forms-browser-241.test.mjs`: PASS, ampliado de dos a cinco anchos en los dos temas. Los tres pasos de registro conservan sus campos, no desbordan, bloquean doble submit y conservan borrador/consentimiento/foco tras error. También mantiene las siete rutas existentes y la verificación StrictMode con una sola operación.
- El mismo gate de acceso abre **27 estados auxiliares** (320/768/1440 × estado del servicio, privacidad, acceso pendiente, recuperar cuenta, verificar correo, invitación de equipo, invitación de cliente, login de cliente y recuperación de cliente). Sin token o sesión donde corresponde; estado del servicio recibe respuestas sintéticas de indisponibilidad. No encontró overflow y no se alteraron estas páginas. Los flujos completos con tokens reales, envío de correos y accesos privados no se acreditan con esta prueba.
- `node --test tests/landing-sales.test.mjs`: **12 PASS**, incluidos contacto, privacidad, precios y el script de telemetría original.

La suite completa `npm run test:release-regression` se ejecuta en esta rama; su resultado final se entrega al integrador junto al commit. Build/CI se concentran en la rama de integración para evitar builds concurrentes.

Evidencia local de esta sesión: `/tmp/anchor265-before.json`, `/tmp/anchor265-after.json`, `/tmp/landing265-browser.log`, `/tmp/landing265-before-regression.log`, `/tmp/access265-final.log` y `/tmp/landing265-unit.log`. Los logs/capturas locales no se incluyen en el contexto de deploy.

## Límites

Auditoría en Chromium de escritorio con viewports emulados. No acredita Safari/iOS, dispositivo físico ni OAuth real. La integración, build/CI y publicación corresponden al integrador; este trabajo no ejecuta deploy.
