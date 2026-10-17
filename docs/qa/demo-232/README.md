# QA local — demo privada y hover (#231, #232)

17/10/2026, America/Asuncion. **79/79 comprobaciones de navegador aprobadas**, ejecución final completa sin errores. Candidato `8b5b0efe3af06d6ed0666b5e7c1ec04073e39b85`, previsto para **v1.0.190**. Este informe no acredita publicación ni deploy; «191» en nombres de runner/worktree es una etiqueta interna de la sesión, no una versión publicada.

Se usaron Next y API aislados, Chromium 154 real y PostgreSQL 17.11 en un clúster QA independiente. No se inició sesión con credenciales ni se modificaron empresas reales.

## Dos visitantes anónimos independientes

Dos contextos de Chromium iniciaron `/demo` simultáneamente, con sus cookies inicialmente vacías. Ambos POST de inicio respondieron 201. Los usuarios, organizaciones y cookies de sesión fueron diferentes; los tokens no se incluyeron en reportes ni capturas.

Ambas demos mostraron tres tareas propias de hoy. Desde la interfaz de A se abrió el detalle y se cambió un checkbox: PATCH 200 y persistencia acreditada. B recibió 404 al intentar leer o editar el ID de A, y su checklist propio permaneció intacto. Recargar A conservó su identidad, organización y edición.

Se observaron datos útiles en clientes, proyectos, inventario, espacios y reservas de estudio, contratos, balance y movimientos, cobros, deudas anteriores, gastos y transferencias. La demo incluyó al menos 20 clientes, cuatro contratos completos sin campos faltantes, tres cuentas con movimientos y una deuda previa con pago parcial y fecha estimada de cobro.

El contrato ficticio emitido se descargó mediante el botón PDF de la interfaz: respuesta 200, firma `%PDF-`, **tres páginas A4** y texto real extraído. No se confundió una previsualización HTML con un PDF generado.

## Efectos externos y alcance de las comprobaciones

Ocho intentos controlados de efectos del tenant demo respondieron 403 con `DEMO_EXTERNAL_ACTION_FORBIDDEN`: IA de carga, IA contractual, invitación de integrante, invitación al portal de cliente, consulta de RUC, actualización de RUC, creación de otra empresa y evento externo. La configuración de IA respondió `demoRestricted=true`, `configurada=false`, `modelo=null`; la capacidad contractual de asistencia fue falsa.

El navegador registró cero solicitudes a hosts externos y cero errores de página. El buzón local no fue creado: no se generaron correos durante estos flujos. Los requests del navegador y los 403 no constituyen captura de paquetes del proceso API; la ausencia de invocaciones de proveedores debe leerse junto con las pruebas backend de guardias que usan spies. No se afirmó haber probado proveedores reales.

**Registro, contacto y recuperación públicos quedan fuera de estos bloqueos**, para permitir que quien prueba la demo se convierta en usuario real. No se les exigió un 403 ni se dispararon esos flujos públicos desde esta campaña de navegador.

## Hover y móvil

En claro y oscuro se verificó feedback visible de perfil del sidebar, enlace de navegación, fila de cliente y menú de acciones. El ítem activo y el cliente seleccionado conservaron su estado al pasar el mouse. Para comparar estilos se retiró el foco anterior y se esperó la transición, respetando que `focus-within` también debe destacar una fila.

En 390 px se midieron los tres controles pendientes de la campaña anterior: CTA Cargar plan y pago de Clientes, resumen Ubicaciones de guardado y resumen Categorías de equipos de Inventario. Los tres alcanzaron 44 px; el documento móvil no mostró desbordamiento horizontal. La emulación no acredita un dispositivo físico.

## Datos temporales y limpieza

Las demos usan **datos persistidos temporalmente en el servidor**, no solamente almacenamiento del navegador. Se consultaron dos registros de organización del clúster QA: ambos tenían TTL de **24.0000 horas** y expiración futura ([evidencia de TTL](server-ttl.json)). La cookie y la sesión mantienen el mismo espacio al recargar; volver a iniciar `/demo` crea otro espacio.

El TTL limita el acceso y no demuestra borrado físico inmediato. No se ejecutó un worker global de limpieza. La activación de borrado físico automático requiere configuración y el recibo/backup correspondiente; el modo predeterminado de simulación no se presentó como eliminación consumada.

## Evidencia

- [Reporte completo de 79 checks](results.json).
- [Inicio de A con tareas propias](evidence/demo-a-home-checklist-1440.png).
- [Hover claro](evidence/demo-clients-hover-light-1440.png) y [hover oscuro](evidence/demo-clients-hover-dark-1440.png).
- [Inventario móvil](evidence/demo-inventory-390.png).
- [PDF ficticio descargado por UI](evidence/demo-contract-issued.pdf).

Para ejecutar localmente se adaptó únicamente el header Origin del POST `/api/demo/start` al origen canónico permitido `https://sistema.scaleparaguay.com`, y el proxy de desarrollo adaptó las cookies al host local. Todo el tráfico siguió dirigido a localhost: no se contactó producción. Esta adaptación se declara y no acredita por sí sola la configuración del dominio productivo.

El runner temporal es `/tmp/scale-qa191.mjs`; los reportes preliminares están en `/tmp/scale-qa191-first-report.json` y `/tmp/scale-qa191-second-report.json`. Se corrigieron exclusivamente supuestos del harness: RUC es POST, una fila con foco ya tiene feedback y el botón de PDF requiere esperar la carga de versiones. El informe usa la ejecución final limpia, conservando esos intentos anteriores como diagnóstico. La validación adicional de centavos USD de #234 se documentará como suplemento cuando esté integrado su fix.
