# Impresión térmica Scale — preparación de 80 mm

Pedido del dueño en #278; API #279, agente #280, interfaz #281 y composición #282.
La aclaración posterior **«solo80mm la impresora térmica»** prevalece sobre los
modelos y formatos usados como ejemplos en la guía adjunta. No se asignó a Scale
ninguna Brother/3nStar ni un ancho de58mm. Modelo y destino todavía por verificar.

## Comportamiento implementado

La API de Scale es la autoridad por empresa: impresoras, plantillas versionadas,
permisos, puentes, cola y auditoría. `branch_id` es un ámbito local textual; no
representa un nuevo catálogo de sucursales. Dueño/admin configuran. Producción y
Gerencia pueden operar desde **Recursos → Impresión80mm** (`/impresion`) según
permisos efectivos, sin habilitar Configuración. Viewer queda excluido.

El agente Node24 corre en la computadora de la impresora. Soporta IPv4 LAN privada
TCP9100 y colas CUPS existentes mediante `lp -o raw`, sin shell. Una USB instalada
por su driver puede usarse mediante CUPS: se registra **cups**, no USB directo.
No instala drivers, crea colas, activa servicios ni se conecta a la impresora
real desde la nube. La API nunca conecta al destino LAN.

Los trabajos guardan la plantilla y configuración de destino usadas al crearlos.
El payload contiene **una copia** y el agente repite exactamente `copies` veces.
Idempotencia, deduplicación y lease atómico evitan reclamar el mismo trabajo entre
puentes. El límite total64KiB incluye todas las copias. Un reinicio durante envío,
lease vencido o resultado ambiguo queda incierto y no se reimprime solo. Un error
al reportar no vuelve a enviar bytes. El puente se autentica antes de procesar
trabajos conservados. **Aceptado por transporte no confirma papel**: el operador
verifica el código impreso, que no se devuelve en listados ni se registra en logs.

La interfaz comparte Editor/Dialog/Button/Selector y renderer con la API. Presenta
recibo no fiscal, presupuesto, prueba y etiqueta con Code39 **existente**; no crea
IDs ni sustituye la etiqueta anterior80×50. HTML y ESC/POS usan la misma composición;
el preview ajusta su escala al contenedor e incluye un marcador de confirmación,
no el código real. Texto normal/doble, márgenes y corte son parámetros explícitos.
La geometría203dpi y la tabla de caracteres siguen preparadas para ensayo físico;
se normaliza texto a ASCII en preview y papel hasta verificar el modelo.

El QR opcional sólo acepta un enlace de presupuesto público ya existente de Scale.
Revalida empresa, permiso de presupuestos, estado y vigencia antes de encolar y
antes del claim. No crea, comparte ni regenera tokens. SVG y raster ESC/POS usan
la misma matriz ECC-H, módulo7 y zona libre4; se rechaza si no cabe. No se generan
rutas inventadas, payloadsMOBOS ni QR con credenciales del panel.

Cada cambio de empresa/usuario descarta formularios y códigos anteriores. La demo
ofrece una vista previa local privada: no consulta API, guarda trabajos ni conecta
una impresora. Revocaciones401/403 retiran datos/códigos/acciones; fallos transitorios
conservan el borrador. El transporte compartido se valida con Response reales (#287).

## Instalación y pruebas

Desde un checkout revisado: `bash print-agent/install.sh --from-repo`.
El instalador conserva configuración privada0600 y genera servicios sólo cuando se
solicita; su activación se realiza en la computadora local. El código de pairing
se ingresa por stdin. Ver [agente](../../print-agent/README.md),
[API](API.md) y [plantillas](TEMPLATES.md).

El job CI **Impresión80mm (API, agente y paquete)** verifica la interoperabilidad
HTTP/PGlite y crea el artefacto `scale-print-agent-80mm` con tar+SHA256. No se anuncia
una URL de instalador público inexistente. Usar juntos paquete y checksum del mismo
run revisado; no copiar tokens de configuración al chat ni a Git.

Comandos del árbol integrado:

```bash
npm run test:release-regression
npm run build
npm --prefix backend run test:release
node backend/test-printing-postgres.mjs  # SCALE_TEST_PG_BIN: PostgreSQL17 local
node --test print-agent/test/*.test.mjs
node print-agent/test-api-integration.mjs
node tests/printing-workspace-browser-281.test.mjs
node build-tools/pack-print-agent.mjs /tmp/scale-print-package
```

Los transportes físicos se sustituyen por fixtures/loopback en estas pruebas.
PostgreSQL multi-conexión y el recorrido real HTTP no acreditan papel ni una Mac.
Las migraciones son aditivas; retención, exportación, supresión y purga de empresas
incluyen las tablas de impresión. Conservar datos, documentos e historial al revertir.

## Aceptación pendiente y publicación

La guía adjunta del dueño exige prueba física por modelo y luego dice:
**«Sólo después publicar/deployar»** (faseF). Por eso esta implementación se deja
en un PR revisable, con paquete y CI; no se integra ni despliega impresión antes
de ese ensayo. Release196 se publicó por separado y no contiene estas funciones.
No se incrementó otra versión ni se disparó otro deploy para preparar impresión.

Para cerrar #216/#278 hacen falta ensayo local o stagingHTTPS de esta rama,
configurar el destino real, imprimir y registrar modelo/rollo80mm/ancho útil/corte,
comprobar tres copias exactas, leer Code39 y QR desde otro dispositivo, verificar
márgenes/orientación, desconectar transporte y confirmar papel desde la aplicación.
Registrar el transporte realmente usado y fecha de Asunción. No registrar IPs,
VID/PID ni documentos privados en issues públicos si no son necesarios.

Papel adhesivo/cantidad/compra continúa en #215. Una impresora térmica de80mm no
acredita por sí sola que un rollo adhesivo específico sea compatible.
