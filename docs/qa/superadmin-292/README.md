# Superadmin responsive — Refs #292

La verificación utiliza la ruta **real `/superadmin`** de Next, sin reimplementar sus componentes. Todas las llamadas `/core-api/*` se interceptan en el navegador con contratos sintéticos; las imágenes son SVG sintéticos embebidos. No se utilizan sesiones, credenciales ni datos de producción y el runner rechaza URLs que no sean localhost.

## Cobertura

- 12 secciones: Resumen, Consultas, Agencias, Accesos, Cupones, Auditoría, Uso, Errores, Reportes, Tráfico y demos, Comunicados y Mantenimiento.
- 320, 390, 768, 1024 y 1440 px, altura 900 px, temas claro, oscuro y contraste: **180 vistas** con filas/datos, gráficos y formularios reales.
- Diálogo de suscripción, menú de agencia con teclado y diálogo de aplicar cupón en los cinco anchos; 768 px utiliza altura reducida de 390 px.
- Viewer sin formulario de creación de cupón; foco con Tab e ingreso real de texto en el formulario de cupón.
- 844 × 390 px con touch: Agencias, Accesos, Comunicados y Mantenimiento.
- Desbordamiento del documento, imágenes rotas, geometría de diálogos, errores JavaScript y navegación se registran en `results.json`. Los scrollers de tablas y navegación son intencionales.

Los datos no vacíos vienen de los contratos ya usados por las suites de dominio. El runner espera un texto identificador del fixture de cada sección antes de medirla. Las llamadas concretas quedan inventariadas en el JSON.

## Reproducción

```bash
BASE_URL=http://127.0.0.1:4123 \
QA_ARTIFACT_SHA=<sha-del-artefacto> QA_BUILD_ID=<next-build-id> \
node build-tools/visual-harness/verify-admin-mobile-292.mjs
```

Iniciar previamente la app local. Se usa Chromium/Puppeteer instalado en `backend/node_modules`; `SCALE_QA_CHROME` permite señalar el ejecutable. `QA_OUTPUT` permite guardar evidencia fuera del árbol. El integrador repetirá contra el build de producción; el descubrimiento local se hizo con Next dev y no acredita por sí solo ese artefacto final.

## Resultado local

- Matriz completa: **201 casos PASS**, sin desbordamiento del documento, imágenes rotas, diálogos/menús fuera del viewport ni errores JavaScript (`results.json`).
- Focal adicional con tap real: **46 casos PASS** (`touch-focal-results.json`), incluido menú táctil y navegación landscape. El runner actual reúne ambos recorridos en 202 casos por defecto.
- Capturas: Mantenimiento en 390/1440 px y los tres temas; diálogos de suscripción y cupón en 390 px.
- Dependencias exactas del manifiesto 1.0.197: Next 15.5.27 y owncoding-ui 0.68.19.
- No se encontraron defectos de producto reproducibles que requirieran modificar estilos o componentes.

## Límites

Esto acredita la UI del superadmin y sus gates visuales. La interceptación **no acredita autenticación ni autorización del backend**, escrituras reales, pagos, envío de correos, OAuth, navegadores WebKit/Safari ni dispositivos físicos. Las suites existentes de superadmin cubren además contratos, permisos y envíos sintéticos; no se consideran pruebas físicas ni integraciones externas.

El portal privado tiene su propia evidencia en la otra entrega del issue #292. El issue sigue abierto hasta la integración, comprobación de producción y los criterios correspondientes.
