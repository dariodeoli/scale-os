# Estados de interacción por tema — #231, #222 y #224

El perfil del pie heredaba `--surface-subtle` del tema claro sobre el riel de
marca: el hover terminaba casi blanco y conservaba el nombre blanco. Los
estados de hover y selección ahora usan tokens del contexto. El riel define
sus propios pares de fondo y texto; el contenido y los diálogos siguen los
tokens del tema. Las opciones del selector tienen una sola fuente de estados,
sin reglas duplicadas en `operations.css`. La selección de filas permanece
visible durante hover/foco y Kanban mezcla superficies del tema en lugar de
blanco fijo.

En móvil, los summary interactivos conservan un target de 44 px. La densidad
28–32 px de acciones de clientes queda limitada a escritorio; «Cargar plan y
pago» mide 44 × 44 px en móvil. Los enlaces de texto inline no cambian.

## Reproducir

Usar una API local con una identidad de QA propietaria, un cliente sin plan y
contratos/plantillas cargados. Iniciar el frontend desde el checkout final en
un puerto independiente. El runner acepta únicamente direcciones loopback.

```bash
SCALE_API_ORIGIN=http://127.0.0.1:4106 \
  ./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3006

QA_BASE_URL=http://127.0.0.1:3006 \
QA_FIXTURE_FILE=/ruta/privada/identidad-qa.json \
QA_OUT=work/qa-hover-themes \
  node build-tools/qa-hover-themes.mjs
```

`QA_AUTH_BASE_URL` permite iniciar sesión mediante otro frontend local de la
misma API. `CHROME_PATH` permite seleccionar el binario Chromium. El archivo
privado admite `{ "admin": { "email": "...", "password": "..." } }` o una
sesión local ya creada. No agregar identidades ni capturas con datos reales
al repositorio.

## Evidencia del cambio

- 26 pruebas focales de temas, UI, marco, fotos y sintaxis CSS aprobadas.
- 34 comprobaciones en Chromium con fuente final servida, sin parches CSSOM:
  mouse y teclado, claro/oscuro, escritorio de 1440 px y móvil de 390 px.
- Perfil del riel: el blanco sobre casi blanco se corrige a contraste mínimo
  14,06:1 en claro y 14,59:1 en oscuro.
- Hover/foco y selección comprobados en navegación, filas, menú de acciones,
  selector, contenedor de contrato y perfil del drawer móvil.
- Botón «Cargar plan y pago»: 44 × 44 px en móvil; los dos summary de gestión
  del inventario: 44 px. Sin desbordamiento horizontal del documento.
- Evidencia local: `/tmp/scale-hover231/report.json` y capturas
  `before-profile-light-1440.png`, `after-profile-light-1440.png` y variantes
  de menú, selector, perfil e inventario. No acredita dispositivo físico.

La publicación, el build integrado y su CI corresponden al integrador. El
issue permanece abierto hasta acreditar el cambio integrado y desplegado.
