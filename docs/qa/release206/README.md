# Release 1.0.206 — OwnData #353 / #350 / API #253

PR #354 integrado en `19747ae0c5e52f5276626c94fd1f6dc3709695a8`. Candidato `91803fb9535f884b36b37d797cdbbcc48d499696`; comparación de árboles contra main sin diferencias. CI candidato39567469192 y main39568545188: SUCCESS (ambos gates y build/artefacto).

La web y registro publican1.0.206. La API responde200, base ready, pero versión1.0.202; smoke global exit1 por versión del API. Las comprobaciones públicas restantes se ejecutaron por separado: sesión anónima401 JSON, proveedores200 JSON, mantenimiento200 JSON; POST de RUC sin sesión/cookies rechazado401. Esto último sólo acredita protección, nunca éxito del proveedor.

El merge disparó el flujo habitual GitHub→Coolify; no se solicitó otro deploy. No se conoce estado de cola/rollout ni SHA servido. `served_provider_sha:null` no se sustituye por el SHA de main. El entorno carece de token Coolify, clave OwnData y sesión real de Scale. El último log aportado del despliegue1.0.205 registró fallo local de OWNDATA_API_KEY al arrancar y rollback; no prueba la causa del rollout1.0.206 ni activación del proveedor.

No se declara integración productiva terminada. #353/#350/#253 permanecen abiertos para versión API y consulta auténtica de formulario sin cookies OwnData. No se observaron en una consulta real COMMERCIAL_API_DISABLED/REVOKED/EXPIRED; las clasificaciones de estos códigos sólo se verificaron con fixtures.

Esta rama conserva evidencia posterior al merge; no requiere otro deploy ni se integra como entrega de producto. Validaciones de código y navegador están en docs/qa/owndata353 de main. No hubo nuevas migraciones ni escrituras financieras en producción.
