# Contratos · seguimiento #212

Base auditada: main `fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d` (v1.0.195).
Esta entrega no cambia versión, no despliega y no cierra el issue.

## Defecto corregido

Una respuesta `{"suggestion":"   "}` del proveedor se aceptaba como revisión
exitosa sin contenido. También se aceptaba texto JSON completo aunque el
proveedor declarara `finish_reason: length`, por lo que una revisión truncada
podía presentarse como completa. Los fallos del adaptador llegaban como errores
500 genéricos del módulo de contratos.

Ahora la sugerencia debe ser un objeto con una única propiedad `suggestion`,
texto no vacío, máximo 12.000 caracteres y sin controles inválidos. Se rechazan
resultados con finalización distinta de `stop` cuando el proveedor la informa.
La API responde 502 por salida inválida/incompleta y 503 por errores tipados del
proveedor. Los mensajes son propios de Scale; no se muestran cuerpos, claves ni
detalles arbitrarios de errores externos. El borrador y sus versiones no cambian.

## Criterios auditados

- Configuración existente: se reutiliza `iaConfig`/`iaProviderDeConfig` de
  `backend/ia-carga.js`; defaults Groq y límite de 60 segundos. Se inspeccionó
  sólo presencia de variables, nunca valores. En esta sesión no están presentes
  `IA_API_KEY`, `IA_BASE_URL`, `IA_MODELO` ni `IA_REASONING_EFFORT`.
- Transferencia: `contractAiMetadata` limita el prompt a nombres canónicos de
  campos y booleanos de presencia. No envía cuerpo, título, valores, identidades,
  números, salarios ni claves. El texto del contrato tampoco es instrucción al
  proveedor, porque no se incluye.
- Propuesta: la UI muestra texto plano y advertencia de revisión humana; sólo
  permite descartar la sugerencia y aplicar cambios manualmente en el editor.
  No existe autoaplicación, guardado ni emisión desde una respuesta de IA.
- Validación humana: emitir sigue requiriendo revisión explícita y borrador
  guardado, sin edición local pendiente ni campos obligatorios vacíos.
- Límites: el modelo puede sugerir observaciones incorrectas. La validación de
  esquema no certifica exactitud ni validez legal. No se afirma conexión real
  con Groq ni configuración existente en producción.

## Pruebas focales

- `node --check backend/contracts.js`: PASS.
- `node backend/test-contracts.mjs`: PASS, PGlite, incluida preservación completa
  de borrador/versiones ante 14 salidas inválidas, proveedor ausente y errores.
  El adaptador HTTP compartido se ejecuta con transporte falso para timeout,
  401, 429 y 500; ninguna solicitud de estas pruebas sale a la red.
- `node backend/test-ia-carga.mjs`: PASS, regresión del proveedor compartido.
- `node_modules/.bin/tsx --test tests/contracts-workspace.test.tsx`: PASS,
  12 pruebas, incluida revisión/descarte/fallo y edición local sin escrituras.

El integrador ejecutará los gates conjuntos, CI y publicación antes de
considerar estos cambios entregados a producción. No hay migraciones. Reversión:
revertir el commit de esta entrega conserva borradores y versiones existentes.

## Pendiente externo

La validación con proveedor real requiere `IA_API_KEY` configurada en el servidor
autorizado, accesible por un canal seguro del entorno, y una prueba mínima sin
PII. No se deben pegar claves en GitHub/chat ni usar credenciales públicas de
otra aplicación. El issue #212 continúa abierto hasta acreditar esa prueba y
la publicación correspondiente.
