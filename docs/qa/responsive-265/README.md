# Auditoría responsive #265

El runner mide la app real servida localmente; no inicia ni detiene servicios. Reutiliza Puppeteer del backend y el patrón de la matriz #241. No agrega dependencias al producto. Requiere Chromium instalado, una demo local nueva con contenido y una sesión privada; prohíbe URLs externas y bloquea métodos de escritura del navegador.

## Ejecución

Integrador: compilar y servir Next en puerto propio con `SCALE_API_ORIGIN` apuntando al API local. API/PG se ejecutan con `backend/scripts/dev-local.mjs` y directorios propios; ver `SETUP` de #241 para el patrón, sin reutilizar credenciales reales ni detener procesos de otra tarea. El launcher escribe una credencial sintética en su log: mantener log y archivos de identidad/sesión en modo600 y fuera de git.

```bash
QA_BASE_URL=http://127.0.0.1:3025 \
QA_SESSION_FILE=/workspace/.qa-tools/responsive265/demoA-session \
QA_COMPILED_SOURCE=<SHA-completo-del-build> \
QA_BUILD_ID=<contenido-de-.next/BUILD_ID> \
QA_DIALOGS=1 \
QA_OUT=/tmp/scale265-production \
node docs/qa/responsive-265/browser.mjs
```

Por defecto:16rutas×5anchos320/390/768/1024/1440×3temas=240escenarios; cada uno visita scroll superior/medio/inferior. No cubre páginas públicas, superadmin ni portal: esos requieren sus runners/identidades específicos y no se declaran aprobados por esta matriz.

Para muestra antes de la matriz: `QA_WIDTHS=320,768,1440 QA_THEMES=light QA_ROUTES=/clientes,/inventario,/pagos/balance`. Un diagnóstico sobre dev requiere `QA_MODE=baseline` y `QA_COMPILED_SOURCE=dev:<SHA>`; se etiqueta explícitamente y no acredita el build ni la publicación. Si el árbol cambia por HMR, anotar baseline mezclada. Capturas bajo `/tmp`, resultados JSON compactos sin tokens se pueden versionar.

## Contratos y límites

- Auth debe responder200 con identidad demo. Se exigen fixtures no vacías en clientes/inventario/proyectos/colaboradores/contratos/estudios/reservas; si faltan, falla en vez de auditar pantallas vacías como éxito.
- Cada ruta conserva su pathname; contenido y main deben existir. Falla si redirige al login.
- Gate de overflow documental, imágenes visibles cargadas, navegación de teclado visible, respuestas GET API>=400 y errores de ejecución. Contenedores de scroll horizontal propios no se confunden con overflow documental.
- Las imágenes lazy se comprueban sólo cuando entran al viewport, después de esperar complete; no se considera rota una foto fuera de pantalla que todavía no se solicitó.
- Los controles ocultados durante scroll se registran como diagnóstico; pasar naturalmente detrás de un header sticky no es automáticamente un defecto. La prueba Tab verifica oclusión persistente del control enfocado.
- Targets<44px se guardan en `touchTargetReview`: requieren inspección de contexto (labels efectivos de checkbox/radio, espaciado/excepciones de enlaces inline), sin ocultar el dato ni declarar incumplimiento automáticamente.
- `QA_DIALOGS=1`: abre Nuevo cliente con Enter, valida bounds/foco, recorre Tab sin salir, cierra con Escape y verifica retorno de foco. No completa ni guarda datos. Si falta el botón o la fixture, falla.
- Exit1 si cualquier escenario/gate falla o falta cobertura. JSON incluye errores, hallazgos, fuente, build y cobertura esperada/real. Un PASS de muestra sólo aprueba esa muestra.
- El runner no afirma pruebas físicas, Safari/iOS real, OAuth, proveedores ni producción. La matriz por sí sola tampoco acredita UX de todas las acciones de negocio.

Fuentes y evaluación de skills en [research.md](research.md). El skill upstream es MIT y no se ejecutó ni instaló globalmente. La metodología se adaptó a Next SSR y a los primitives de Scale.
