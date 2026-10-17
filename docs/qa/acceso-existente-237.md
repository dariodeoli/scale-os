# QA de acceso existente — #237

Fuente frontend comprobada: `bdc8a992`, rama `codex/acceso-existente-ui`, sobre `0310a41b` (v1.0.190). Resultado: **9 casos funcionales y 19 mediciones de geometría PASS** en Chromium. Se repitió primero el harness de sesión original y después el runner reproducible incluido en este cambio.

## Alcance y resultados

El navegador cargó el frontend real servido localmente. Todas las respuestas de `/core-api/` y los destinos posteriores al login se simularon; las peticiones externas se bloquearon. No se crearon usuarios, empresas ni consentimientos reales. El informe guarda únicamente rutas, métodos e intención de las llamadas, sin contraseñas, cookies ni cuerpos de registro. Los datos escritos son ficticios.

| Caso | Resultado acreditado |
| --- | --- |
| Nuevo por correo, desktop | Resolver identidad precede a Acceso y Agencia; confirmar una contraseña diferente bloquea el avance; las dos casillas empiezan sin marcar; aceptar las condiciones es necesario; alta simulada termina pidiendo verificar correo. |
| Nuevo por correo, móvil 390 | Mismo flujo y validaciones, sin desbordamiento horizontal. |
| Identidad existente, contraseña histórica | Una contraseña de 7 caracteres alcanza el resolver; existe una única llamada POST y el destino es `/?chooseCompany=1`, sin pedir agencia. |
| Contraseña incorrecta | Permanece en Identidad con error y sin campos de agencia. |
| Sesión real existente | Navega al shell normal, sin ningún POST de alta. |
| Sesión demo | Permite iniciar el registro real. |
| Invitación pendiente | Vuelve a `/acceso-pendiente`. |
| Fallo al comprobar sesión | No presenta campos de registro; Reintentar recupera el formulario cuando el transporte simulado responde como anónimo. |
| Ticket Google antiguo que resuelve existente | El ticket sale de la URL; la respuesta de finalización existente navega al selector y no escribe un consentimiento complementario. |

El caso de Google prueba el consumo del resultado del API, **no OAuth real ni el callback del proveedor**. La navegación posterior se reemplaza por una página de destino simulada: se acredita la URL elegida, no el funcionamiento del selector de empresas ni la carga de producción.

## Geometría final

Cada paso de alta nueva se midió en temas claro y oscuro. Los números fueron iguales entre ambos temas. El pie usa el objeto canónico y está fuera de la tarjeta; los botones primarios miden al menos 44 px.

| Viewport | Altura tarjeta Identidad / Acceso / Agencia | Altura documento | Borde inferior del pie |
| --- | --- | --- | --- |
| 1366×768 | 537.09 / 570.58 / 616.38px | 768px en los tres pasos | 756px |
| 1440×900 | 605.09 / 638.58 / 684.38px | 900px en los tres pasos | 880px |
| 390×844 | 740.89 / 705.81 / 883.11px | 922 / 887 / 1064px | 905.89 / 870.81 / 1048.11px |

Desktop conserva campos, acción primaria y pie visibles sin scroll vertical. Móvil desplaza la página para conservar contenido y consentimientos completos; su ancho de documento es 390px. También se midió el error de contraseña existente en 1366×768: tarjeta 566.48px, documento 768px y pie en 756px, sin desbordamiento.

## Reproducción

Requiere Node 24, dependencias frontend y backend instaladas y Chromium disponible en PATH o mediante `CHROME_PATH`. El API real no es necesario para este runner. Iniciar Next en el checkout que se quiera comprobar:

```sh
./node_modules/.bin/next dev --hostname 127.0.0.1 --port 3006
```

En otra terminal, desde la raíz del repositorio:

```sh
SCALE_QA_URL=http://127.0.0.1:3006 \
SCALE_QA_OUT=work/qa-registration-access \
node build-tools/qa-registration-access.mjs
```

El runner sólo acepta localhost. `SCALE_QA_OUT` es opcional; el destino predeterminado es `work/qa-registration-access`, ignorado por git. Allí escribe `report.json`, capturas de cada medición y una captura de fallo si corresponde. Ejemplos de esta ejecución:

- `work/qa-registration-access/new-workflow-1366-identity-light-1366.png`
- `work/qa-registration-access/new-workflow-1366-agency-dark-1440.png`
- `work/qa-registration-access/new-workflow-390-agency-dark-390.png`

El harness original de la sesión se repitió con resultado 9/9 PASS; su informe está en `/tmp/scale237-registration-browser.json`. Ese archivo temporal no es un requisito del runner versionado.

## Validación separada y límites

Antes de esta entrega QA, la implementación acreditó 29 pruebas focales y TypeScript sin errores. Esta entrega sólo agrega documentación y el runner; se verificó su sintaxis con `node --check` y se ejecutó completo sobre la fuente final indicada.

El integrador informó una prueba independiente contra PostgreSQL real, registrada en `/tmp/scale237-integrator-pg.log`; no fue ejecutada por este runner ni se presenta como parte de estas 9 pruebas. El backend integrado del candidato `4bab1a1e` y el CI/deploy son responsabilidad del integrador. No se probaron proveedores OAuth, envío real de correo ni producción.
