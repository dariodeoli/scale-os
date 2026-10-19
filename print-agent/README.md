# Scale Print — térmica de 80 mm

Agente Node 24 para macOS/Linux en la computadora de la impresora. Sin dependencias nativas. Sólo 80 mm; LAN privada IPv4 literal TCP9100 o cola CUPS existente `cups:NOMBRE` mediante `lp -o raw`. USB directo requiere driver y no se anuncia como soportado; una impresora USB instalada por el sistema puede usarse mediante CUPS, registrándose transporte `cups`. No se crea ninguna cola ni se cambia la impresora desde la nube.

## Instalación local

Desde checkout revisado: `bash print-agent/install.sh --from-repo`. No instala ni activa servicios automáticamente. Después, ingresar el código de un solo uso por stdin para evitar historial/argumentos de proceso:

```bash
read -rs SCALE_PRINT_CODE
printf '%s' "$SCALE_PRINT_CODE" | node "$HOME/.scale-print/app/cli.mjs" pair
unset SCALE_PRINT_CODE
node "$HOME/.scale-print/app/cli.mjs" service
node "$HOME/.scale-print/app/cli.mjs" run
```

`--code CODIGO` está disponible para automatización controlada, pero puede quedar visible en argumentos del proceso. `pair --api https://...` sólo acepta origen HTTPS sin credenciales ni rutas. La configuración local de 0600 contiene el token de puente y el token loopback; no copiarlos al chat, web, logs ni repositorio.

Paquete verificable: `node build-tools/pack-print-agent.mjs /tmp/scale-print-package`. Revisar el SHA por un canal confiable y usar `bash print-agent/install.sh --package /ruta/scale-print-agent.tar.gz --sha256 HASH`. El instalador valida SHA, rutas/tipos de archivo y copia sólo una lista cerrada. No se publica un URL de descarga que todavía no existe. `service` genera plist LaunchAgent en macOS o unidad systemd de usuario en Linux; el operador revisa y activa localmente el archivo. No se ha instalado ni ejecutado en una Mac física.

## Contrato y seguridad

Emparejamiento `POST /api/print/bridges/pair {code}`. Con bearer privado: config, heartbeat, claim con lease y resultados. Se reclama uno por vez; el resultado pendiente se reenvía hasta confirmación HTTP sin reenviar bytes. Estado `sending` se persiste/fsync antes del transporte; tras reinicio pasa `incierto`. Se borra payload al terminar y no aparece en las consultas ni logs. Conexión antes de enviar fallida = `fallido`; intento de escritura ambiguo = `incierto`; aceptación del socket/CUPS = `aceptado`, nunca confirma papel. Un 404/409 al reportar se conserva como incidencia de conciliación incierta y permite continuar con otros trabajos, sin reenviar papel. No hay fallback ni reintento automático que pueda duplicar papel. Para reimprimir, el operador crea explícitamente un nuevo trabajo auditado desde la aplicación. Cancelación sólo antes del envío, trabajos locales; remotos se cancelan en API.

Servidor `127.0.0.1:17890`, Host exacto, bearer local y Origin HTTPS permitido obligatorio si viene del navegador. `/health`, `/diagnostico`, `/jobs/:id`, `POST /config` y `/print` exigen token, sin exponerlo mediante URL. En modo emparejado, `/config` y `/print` rechazan mutaciones locales: impresoras, permisos y trabajos provienen exclusivamente de la API auditada. Sólo una configuración manual `mode: development` sin puente habilita esas rutas para pruebas locales; nunca se activa al instalar/emparejar. La aplicación usa la cola remota como autoridad; las rutas locales se destinan a diagnóstico/integración local autenticada, no a descubrir tokens desde la web. El preflight sin bearer se limita a GET de diagnósticos con Host/Origin autorizado y encabezados cerrados; la consulta real siempre exige bearer. No se habilita CORS abierto ni acceso anónimo.

El modelo, destino, ancho útil, corte y código ESC/POS compatible se verifican en la computadora y papel reales. **No hay prueba física acreditada ni configuración definitiva de modelo/IP.** No ejecutar una prueba de impresión hasta confirmar impresora y destino local. El SHA del paquete identifica el artefacto, no el modelo físico.

Pruebas: `node --test print-agent/test/*.test.mjs` (transportes simulados/loopback y temporales; ninguna impresora real).

Interoperabilidad con backend y dependencias instaladas: `node print-agent/test-api-integration.mjs`. Levanta HTTP exclusivamente loopback, PGlite temporal y el handler real; sustituye únicamente transporte físico. Comprueba emparejamiento de un uso, aislamiento empresa/sucursal, tres copias exactas, eliminación de payload, sufijo humano y conciliación 409 sin reenvío. `SCALE_PRINT_TEST_BACKEND` permite señalar una rama backend hermana antes de integrar. La prueba elimina sólo su servidor/base/directorio temporal.

Al reiniciar en modo emparejado, no se procesa la cola conservada antes de autenticar heartbeat y consultar configuración vigente. Una revocación 401 bloquea envíos pendientes y conserva la cola para conciliación. Esta comprobación previa reduce el riesgo de usar configuración almacenada; no promete una revocación atómica instantánea entre la API y el dispositivo físico.

Antes de procesar un trabajo conservado, la configuración vigente debe contener la misma impresora habilitada, sucursal, destino y transporte que la instantánea del trabajo. Si cambia una ruta o se deshabilita/elimina la impresora, se reporta `fallido` con `printer_config_changed` sin enviar ni redirigir bytes. Un cambio sólo de nombre sigue permitido. Un error al consultar configuración conserva el trabajo pendiente y no imprime.
