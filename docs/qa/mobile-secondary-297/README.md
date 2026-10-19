# Auditoría de rutas secundarias y acciones #297

Amplía la cobertura de #265 con las nueve rutas reales de `app/navigation.ts`
que no estaban en su matriz de 16 rutas. No reemplaza sus resultados históricos.

## Ejecución local

Los runners sólo aceptan loopback. El integrador proporciona Next compilado,
API/PostgreSQL aislados y sesiones sintéticas en archivos privados. Nunca
versionar tokens, contraseñas ni documentos de clientes reales.

```bash
QA_BASE_URL=http://127.0.0.1:3027 \
QA_COMPILED_SOURCE=<SHA-del-arbol-compilado> \
QA_BUILD_ID=<BUILD_ID-real> \
QA_SESSION_FILE=/workspace/.qa-tools/mobile292/demoA-session \
QA_OWNER_SESSION_FILE=/workspace/.qa-tools/mobile292/ordinary-session \
QA_OUT=/tmp/scale297-final \
node docs/qa/mobile-secondary-297/browser.mjs

QA_BASE_URL=http://127.0.0.1:3027 \
QA_COMPILED_SOURCE=<SHA-del-arbol-compilado> \
QA_BUILD_ID=<BUILD_ID-real> \
QA_SESSION_FILE=/workspace/.qa-tools/mobile292/ordinary-session \
QA_OUT=/tmp/scale297-actions-final \
node docs/qa/mobile-secondary-297/actions.mjs
```

Para diagnóstico sobre Next dev usar `QA_MODE=baseline` y fuente `dev:<SHA>`.
Ese diagnóstico no acredita el build final ni el deploy. La salida debe conservar
la fuente realmente servida, incluso cuando el runner viva en otro commit.

## Cobertura

`browser.mjs`: nueve rutas × cinco anchos (320/390/768/1024/1440) × tres temas
(claro/oscuro/contraste) = **135 escenarios**, con tres estados de scroll cada
uno. Comprueba pathname, shell listo, contenido, imágenes visibles, overflow y
un paso de foco con teclado; conserva candidatos de controles táctiles pequeños
para revisión contextual. Lee los endpoints reales del API local, sin sustituir
sus respuestas. Bloquea todas las escrituras del navegador. Para Invitaciones
usa el dueño sintético normal porque el producto bloquea intencionalmente las
invitaciones externas en la demo. Las otras ocho rutas usan la demo aislada.

Rutas: Métricas, Planes, Invitaciones, Comisiones, Roles y permisos, Historial,
Actividad, Preferencias y Papelera. Los estados vacíos se registran explícitos;
no se afirma haber ejercitado filas pobladas cuando el fixture no las tiene.
El preflight exige clientes y colaboradores cargados, identidad y empresa.

`actions.mjs`: cinco tamaños (320×844,390×844,768×844,390×568,844×390),
siempre con puntero táctil. Usa el dueño sintético, componentes de la ruta real,
API local y PostgreSQL reales. Cambia la preferencia de inicio, recarga y exige
persistencia; abre el formulario de nueva empresa sin enviarlo, comprueba bounds,
ocho Tab dentro, Escape y retorno de foco; edita el representante legal, guarda,
comprueba el API y recarga. Inyecta **un solo503 de transporte** en el primer
guardado legal para verificar borrador y reintento: esa respuesta de error no
procede del backend. Los guardados exitosos sí llegan al API/DB real. Al finalizar
restaura los valores originales de preferencia y representante, sin borrar sus
registros de auditoría. No ejecuta eliminación de cuenta/empresa ni crea empresas.

## Límites

Esta campaña no acredita todos los formularios posibles de Configuración,
proveedores externos, OAuth, descarga real, permisos de todos los roles ni
teclado virtual del sistema operativo. No sustituye #292 (portal/superadmin),
#295 (otros siete componentes internos), ni #296 (Safari y Android físicos).
Las capturas se conservan fuera de git; los resultados compactos verificables
pueden versionarse sin incluir credenciales ni datos personales reales.
