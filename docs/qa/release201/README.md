# Scale OS1.0.201: integración y producción

- #321 incorporó los cambios de #305–#312 en1.0.200. Su candidato pasó CI, pero el CI posterior de main identificó una carrera en el último test visual de ingresos.
- #324 corrige esa espera bajo #323: antes, GET sintético demorado600ms reproduce el error exacto; después, nueve casos con demora y nueve normales pasan sin omitir assertions. Se espera una acción visible y habilitada, conservando el timeout10s. No cambia la lógica del producto.
- Candidato d1ef414fe20cad6ea151276f0700c3a7308bdceb: CI39380175169 PASS frontend/regresión/build y backend.
- Main74f2d89d2309378ba3a3a3eb8238c262295531a6: CI39380988604 PASS frontend/regresión/build y backend.
- Smoke público: web/status, registro, API DBready y tres rutas de acceso por proxy PASS versión1.0.201.
- MCP: health, metadatos de recurso/OAuth/PKCE/DCR, desafío401, proxy privado401 y consentimiento200 PASS. Seis probes sin escrituras ni grants reales en producción.

## Límites y seguimiento

#305–#311 y #323 completados. #312 conserva la conexión desde cuentas reales de Claude y ChatGPT; SDK oficial/protocolo/OAuth y servidor desplegado sí comprobados. #322 conserva el defecto REST previo de retry con plan automático; MCP exige ID de plan explícito. No se acreditan dispositivos físicos, Safari, impresión física ni firma certificada.

Las respuestas públicas exponen versión, no SHA del contenedor del proveedor; los SHAs anteriores son los acreditados por GitHub. Publicaciones automáticas por merge, sin disparar despliegues duplicados para el mismo SHA. Esta rama sólo conserva evidencia: no exige otra publicación de la aplicación.

Endpoint: https://api.scaleparaguay.com/mcp. Guía: docs/MCP-CONNECTORS.md.
