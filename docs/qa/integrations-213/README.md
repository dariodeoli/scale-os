# Integraciones existentes y aceptación pendiente — Refs #213

Auditoría del 19 octubre 2026 UTC sobre Scale `fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d`
(v1.0.195). No cambia código, configuración, dependencias ni versión; no activa
proveedores ni ejecuta consultas fiscales reales.

## Matriz de aceptación

| Elemento | Evidencia actual | Resultado / pendiente |
| --- | --- | --- |
| OwnCoding UI | Frontend y backend fijan `v0.68.19`; ambos locks resuelven `7cf63ad530384b2887551ddb50c9261270762202`. Tag anotado remoto `4646afaed33f4416f1c83cdfbb2018b1001489ab` apunta a ese commit. | Integrado en main195; no volver a instalar una biblioteca paralela. |
| Permiso de biblioteca | `package.json` del tag19 declara `private:true`, `UNLICENSED`; README explica que GitHub público no implica licencia abierta. El dueño pidió expresamente reutilizar su biblioteca en Scale. | Reuso autorizado para este trabajo; no anunciar permiso universal ni extenderlo a proveedores/datos externos. |
| Bancos y logos | `app/workspace-forms.tsx` usa `BancoComboboxLazy`; Balance usa `BancoLogoLazy`, ambos del export público `financial-lazy`. El paquete instalado ofrece32 instituciones de metadata y19 entradas en `BANCOS_Y_FINANCIERAS_PARAGUAY`. | Reuso presente. Estos conjuntos tienen alcances distintos; no confundir32 identidades con19 opciones de bancos/financieras. Logo/catálogo no acredita saldo remoto ni conexión bancaria. |
| Ciudad → departamento | Backend importa `LOCALITIES_PARAGUAY`/`resolveLocality` desde `owncoding-ui/utils`:263 registros. GET transmite metadata mínima al frontend; ID, pareja y versión se validan en servidor. | Integridad opt-in acreditada para empresa; fuente heredada no oficial. Ingreso manual/legado permanece disponible y no se normaliza silenciosamente. |
| OwnData | Repositorio `dariodeoli/owndata`, main `668f0b95289817f3d0f6a3774035ac1bc86cbb5c`, contrato1.4.0. `docs/COMMERCIAL-API.md` sigue documentando comercial deshabilitado hasta autorización escrita DNIT. | Adaptador existente y mocks aprobados; activación empresarial y prueba real pendientes. |
| Proveedor RUC existente | `backend/ruc-lookup.js` mantiene `legacy` por defecto, endpoint `https://ruc.sun.com.py/api/ruc`; OwnData exige selección, endpoint exacto y secreto privado explícitos. | Compatibilidad y reversión conservadas; no se sustituye proveedor por una suposición. |
| Ocoin | El dueño identificó OwnData para RUC y OwnCoding UI para objetos. Ninguna referencia nueva identifica un servicio Ocoin que forme parte de ese pedido. | No atribuir a Ocoin funcionalidades de esas dos herramientas. Si se requiere un tercer producto, hace falta su referencia concreta; no bloquea reuso de bancos/localidades ya disponible. |

## Configuración y condiciones externas

El estado actual del entorno administrado informa cero secretos, variables,
identidades salientes y capacidades configuradas. Se comprobó únicamente la
presencia de `OWNDATA_API_KEY`, `RUC_LOOKUP_PROVIDER_KIND` y
`RUC_LOOKUP_PROVIDER_URL`: ausentes en este proceso. Esto **no** demuestra cuál
es la configuración privada del servidor de producción.

Para verificar la integración empresarial hace falta habilitación documentada
del proveedor, plan/costo acordado y vinculación privada de una clave autorizada
con `ruc:read`. No solicitar el valor en chat. No crear ni reutilizar claves de
galería, demo pública, otra app o Free100 como sustituto de esa habilitación.
OwnData documenta Free100 como personal y distingue su cuota de la API comercial.

El proveedor devuelve un snapshot fiscal con fecha/fuente; no devuelve domicilio,
bancos ni localidad. El resultado no sustituye automáticamente el nombre manual
del cliente: se conserva revisión/aplicación explícita. Costo contratado y SLA
no están acreditados. Detalle técnico y reversión existentes:
[`docs/owndata-scale-integration.md`](../../owndata-scale-integration.md).

## Pruebas repetidas sobre main195

- `cd backend && node test-ruc.mjs`: PASS; legacy/OwnData opt-in, autenticación,
  formato/DV/procedencia, errores, cuota, cachés separadas, sin reintentos ni
  cambios destructivos del cliente. PGlite y fetch mock; cero consultas externas.
- `cd backend && node test-company-locality.mjs`: PASS;263 registros, parejas,
  versión,400/rollback, manual/legado, CAS409, permisos/tenant, auditoría y
  snapshots emitidos conservados.
- `node --import tsx --test tests/company-locality.test.tsx`:4 PASS; selección
  explícita, preservación de borrador/revisión, errores y ausencia de catálogo
  importado en el bundle del cliente.
- Inspección del paquete instalado, manifiestos/locks y refs remotas descritas
  arriba; sin modificar instalaciones compartidas.

No se repitió build general por una auditoría documental. El CI/deploy195
corresponde al integrador y no sustituye un lookup empresarial real. El issue213
permanece abierto por la aceptación externa OwnData; esta auditoría no requiere
ni dispara otro deploy.
