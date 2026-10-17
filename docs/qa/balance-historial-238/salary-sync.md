# Suplemento: salario fijo coherente entre Balance y Equipo

17/10/2026. **24/24 comprobaciones funcionales PASS** sobre `2e792ccacd3353a8ed5e2d8b5b31fc0a04757a17`, con API reiniciada. Chromium real 1440×1000, PostgreSQL 17 local, tenant nuevo y tres personas ficticias. [Resultados compactos](salary-sync-results.json); [runner portable](salary-sync-browser.mjs). No se repitió la matriz anterior de 143 casos ni se acredita CI, merge o deploy con esta prueba.

| Operación real | Equipo: importe/moneda | Balance: mensual/moneda | Historial |
| --- | --- | --- | --- |
| Balance guarda salario fijo | 750.25 USD | 750.25 USD | +1 |
| Equipo guarda remuneración fija | 900.50 EUR | 900.50 EUR | +1 |
| Balance cambia mensual de persona variable | fee original 50.00 USD | 600.10 USD | +1 |
| Balance cambia mensual de persona por hora | fee original 25.00 EUR | 601.20 USD | +1 |
| PATCH de cargo, sin cambio económico | 900.50 EUR | 900.50 EUR | +0 |

Las tres proyecciones del mes anterior conservaron el acuerdo explícito de 500.00 USD. La proyección actual del salario fijo resolvió 900.50 EUR. Cada guardado se hizo por la interfaz correspondiente, se comprobó su respuesta HTTP y se contrastaron campos e historial por API. Los importes se comparan con unidades menores `BigInt`; no se usa `Number` para dinero. No hubo peticiones externas ni errores JavaScript de página en la ejecución final. No se amplió este suplemento a modalidades por proyecto, vigencias futuras o más de nueve eventos: esas pruebas corresponden a la suite backend del implementador.

## Hallazgo visual independiente

Al revisar la captura se observó que, al seleccionar Remuneración después de Perfil, el grupo anterior seguía visible arriba: `hidden=true`, `display:grid`, `checkVisibility()=true`, altura 860.53 px. El grupo Remuneración seleccionado medía 430.94 px. El integrador corrigió el conflicto con `3397305a`. El focal readonly posterior acredita **11 comprobaciones**: grupos inactivos con `display:none`, altura cero y sin foco programático ni por Tab; ambos borradores se conservan al alternar; API e historial permanecen idénticos. [Evidencia](person-tabs-results.json), [runner](person-tabs-browser.mjs). Los diez checks de tabs se extraen de la ejecución combinada y el undécimo verifica sus solicitudes interceptadas, sin repetir los flujos salariales. Los POST de presencia y diagnóstico Next fueron bloqueados antes del servidor. En esa misma ejecución se detectó por separado una pestaña salarial montada para un actor con `salary.view=false`; la API redactaba importes y devolvía historial403. Ese control de permiso quedó corregido posteriormente con `f1feaacd` y se acredita por separado con **9/9 comprobaciones readonly** ([reporte](person-permission-results.json)); no se incluye entre los once de pestañas. La misma sesión conserva rol finance y override `salary.view=false`; ahora recibe Directorio interno, al carecer también de `members.manage`. No monta ficha ni Remuneración, campos salariales ni el fallback `0,00`, y no solicita historial desde la interfaz. La lectura directa de colaboradores conserva ambos importes como null; el probe explícito del historial sigue respondiendo403. No se hicieron guardados. El primer intento de este focal se detuvo esperando el antiguo menú: se adaptó el harness a la vista restringida que ahora corresponde, sin atribuir ese timeout al producto.

La primera tentativa del runner se detuvo por buscar `aria-label` directamente en el botón del menú; su nombre accesible proviene del texto de lector de pantalla. Se corrigió el selector para localizar el botón de menú dentro de la fila de la persona. La ejecución final usa un tenant nuevo; ese error del harness no se atribuye al producto.

## Reproducción local

Se requiere una instancia local ya migrada, una sesión temporal de dueño suministrada por archivo privado y un JSON sin secretos con este contrato:

```json
{
  "synthetic": true,
  "organizationId": "ID_LOCAL",
  "month": "YYYY-MM",
  "priorMonth": "YYYY-MM",
  "people": {
    "fixed": {"id":"ID_LOCAL", "name":"Nombre único", "compensationType":"fixed", "initialFee":"500", "feeCurrency":"USD", "initialMonthly":"500", "monthlyCurrency":"USD"},
    "variable": {"id":"ID_LOCAL", "name":"Nombre único", "compensationType":"variable", "initialFee":"50", "feeCurrency":"USD", "initialMonthly":"500", "monthlyCurrency":"USD"},
    "hourly": {"id":"ID_LOCAL", "name":"Nombre único", "compensationType":"hourly", "initialFee":"25", "feeCurrency":"EUR", "initialMonthly":"500", "monthlyCurrency":"USD"}
  }
}
```

Los acuerdos iniciales deben tener una vigencia **explícita** en `priorMonth`, sin deducirla de `started_on`. El mes actual del selector Balance debe ser `month`. La fixture debe ser nueva para cada ejecución completa: se crean cambios económicos reales.

```bash
QA_BASE_URL=http://127.0.0.1:3008 \
QA_FIXTURE_FILE=/ruta/privada/fixture-sintetica.json \
QA_SESSION_FILE=/ruta/privada/sesion-local \
QA_SOURCE_SHA=SHA_DEL_CANDIDATO \
QA_OUT=/tmp/scale-salary-sync \
node docs/qa/balance-historial-238/salary-sync-browser.mjs
```

El runner admite `CHROME_PATH`, exige origen localhost y `synthetic:true`, bloquea solicitudes fuera del entorno local y nunca escribe la sesión en el reporte. Sólo exporta cuatro campos económicos por persona y dos capturas; no contiene credenciales ni copias de datos reales.

Para el focal de pestañas, el runner adicional utiliza las mismas variables locales con `QA_SCOPE=tabs`. Para permisos: `QA_SCOPE=permission`, `QA_LIMITED_SESSION_FILE`, `QA_LIMITED_PERSON_NAME` y `QA_LIMITED_PERSON_ID` de un actor sintético ya existente con `salary.view=false`. Ningún modo permite peticiones mutantes al servidor.
