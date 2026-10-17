# QA independiente — cliente y responsable legal #239

Fecha: 17/10/2026. Candidato integrado: `a70ee1cd31abd6e6f2b2cd555dfa34cbcd9a01f5`.
Chromium real contra Next local 3008, proxy/API 4109 y PostgreSQL 17.11 del
entorno QA compartido. Worktree de QA aislado, sin cambios de producto.

## Qué se verificó

- **Editor en 1366 × 1000 y 390 × 844:** el nombre legal del cliente y el
  responsable aparecen junto a una foto circular real decodificada. La imagen
  medida dentro del editor tiene 40 × 40 px, radio 50% y ancho natural 256 px;
  no se contó la imagen de la ficha que permanece debajo del popup.
- **Teclado y derivación:** se enfocó el checkbox y se activó/desactivó con
  Espacio. Al vincular, el nombre del responsable queda visible y deshabilitado;
  cambia inmediatamente con la razón social y conserva su prioridad sobre el
  nombre comercial. Sin razón social sigue el nombre del cliente.
- **Persistencia:** guardar desde el formulario produjo PATCH 200. Se leyó la
  ficha por HTTP y se reabrió el editor; el vínculo y el nombre derivado quedaron
  guardados. También se guardó desde el editor móvil y se comprobó al reabrir.
- **Desvinculación:** después de desmarcar se escribió un representante distinto.
  Cambiar el nombre comercial y la razón social mediante formulario/API mantuvo
  ese representante independiente. Al volver a vincular se retomó el respaldo
  canónico; otro PATCH de razón social recanonicalizó el nombre en backend.
- **Documentos separados:** después de cada cambio se comprobó por API que tipo
  de parte, tipo y número de documento del cliente, documento del representante
  y cargo conservaron sus valores sintéticos originales. El checkbox no los copió.
- **Contrato emitido:** antes de editar se creó y emitió un documento sintético
  de tres variables de contraparte. Tras cada cambio se comparó el objeto completo
  de su versión emitida, incluidos texto renderizado, variables y orígenes. Se
  mantuvo idéntico. El hash SHA-256 de la versión original se conserva en el reporte.
- **Ficha lateral:** otro recorrido de sólo lectura verificó ambos nombres,
  imagen circular decodificada y geometría en 1366 y 390 px.
- **Geometría:** documento y popup tuvieron desbordamiento horizontal 0 px.
  El editor mide 820 px en escritorio y 390 px en móvil, con desplazamiento
  vertical interno. La ficha también cabe sin desbordamiento.

El suplemento oscuro recorrió ficha y editor en ambos anchos, con nombre/foto
y estado vinculado persistido. Todas las mediciones horizontales dieron 0 px
de desbordamiento en el tema oscuro también.

## Evidencia y reproducción

[Flujo funcional](main.json): 64 registros PASS, 36 nombres de comprobación únicos.
[Suplemento de ficha](detail.json): 7/7 PASS de sólo lectura. 
[Suplemento oscuro](dark.json): 15/15 PASS, sin guardar campos. En total,
86 registros y 50 nombres únicos; las comprobaciones de documentos/snapshot
se repiten deliberadamente después de cada etapa y no se cuentan como casos nuevos.

- [Editor móvil claro con foto y ambos nombres](evidence/editor-light-390.png).
- [Editor vinculado en escritorio](evidence/editor-linked-1366.png).
- [Ficha lateral móvil clara](evidence/detail-light-390.png).
- [Editor móvil oscuro](evidence/editor-dark-390.png).
- [Ficha lateral de escritorio oscura](evidence/detail-dark-1366.png).

El [harness](browser.mjs) sólo acepta URL local y bloquea proveedores externos.
Recibe credenciales sintéticas por archivo privado; no las imprime ni las incluye
en los reportes. Crea nombres únicos para cliente, plantilla y contrato, sin
cuentas bancarias ni movimientos económicos. No modifica fixtures de otras campañas.

```bash
QA_BASE_URL=http://127.0.0.1:3008 \
QA_FIXTURE_FILE=/ruta/privada/identity.json \
QA_SOURCE_SHA=<sha_integrado> \
QA_OUT=/tmp/scale-qa239 \
node docs/qa/clientes-responsable-239/browser.mjs
```

El archivo privado tiene `admin` con `email`/`password` o `session`.
`QA_DETAIL_ONLY_CLIENT=<id>` recorre ficha y editor existentes sin guardar;
`QA_THEME=dark` configura el tema local de ese navegador.

## Alcance y límites

Las escrituras del flujo principal se hicieron por HTTP autenticado en fixtures
locales. El suplemento usa lecturas de ficha/editor. No se invocó RUC ni otro
proveedor; la imagen se generó localmente. No hubo consultas externas intentadas
en estos recorridos. El snapshot acreditado es la versión contractual persistida;
no se regeneró ni comparó un PDF en esta campaña.

El [informe del implementador](../client-representative-239.md) separa las pruebas
backend de SQL directo/importaciones, rol/tenant, idempotencia, supresión PDP y
borde de 160 caracteres. Esas comprobaciones no se presentan como interacciones
de este navegador. Se inspeccionó que el trigger cubre INSERT/UPDATE de la tabla,
incluidos cambios de nombre producidos por otros caminos de escritura.

En el tema oscuro apareció el indicador de desarrollo «1 Issue». La consola
lo identifica como warning de hidratación del atributo global
`<html data-theme="dark">` de `RootLayout`, antes de abrir el cliente; se repite
al navegar a Clientes. No hubo `pageerror` y todas las interacciones nuevas
pasaron. Se conserva el warning íntegro en `dark.json`; no se modificó producto
ni se ocultó el indicador. Su seguimiento es del tema/layout global.

La emulación de 390 px no acredita un dispositivo físico. CI, integración y
despliegue quedan a cargo del integrador; este informe acredita QA local.
