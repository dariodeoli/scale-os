# Release 1.0.205 — integración y publicación parcial

PR [#351](https://github.com/dariodeoli/scale-os/pull/351) integrado en main `dc7cdb00ce7aded5d0313ee0135193e77306046c`. Candidato `b9f730a6fb828e68987d5f2b26429b49845ea25e`; árboles idénticos verificados tras merge. CI candidato 39499938616 y main 39501090741: frontend y backend SUCCESS. Incluye parser OwnData #350 y gates Chromium #352, con un único bump a 1.0.205. Pruebas locales y hashes en ../ruc350 y ../ci352.

Web y registro sirven 1.0.205. API/health sigue en 1.0.202, HTTP 200, base ready. El smoke posterior a la actualización de web confirma web/registro y falla por versión API. Se ejecutó con proxy Node y CA del entorno; la ejecución inicial sin esos ajustes no acreditó una respuesta y no prueba caída de producción. Las sondas de sesión anónima, proveedores y mantenimiento pasaron independientemente. RUC sin sesión devolvió 401, sin consulta autenticada ni validación de clave real.

Coolify redirige al login y su API devuelve 401; no hay token administrativo o webhook directo configurado en este entorno. No se atribuye la publicación antigua a una causa sin logs. No se disparó otro deploy manual, no hubo escrituras reales ni cambios financieros. SHA servido por el proveedor no disponible. #350 y #253 permanecen abiertos.

Esta rama contiene evidencia posterior al merge y memoria. No integrar a main ni desplegar; no requiere otro bump ni PR.
