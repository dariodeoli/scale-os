# Smoke final193 con OwnCoding UI0.68.18 publicado

Next production local: BUILD_ID `dSZ_lw7OrMdFchCDke00b`. Árbol compilado confirmado por integrador: `89bb98c298b1b3e65978d23ce7f5821cf45e2a6a`, commit creado después del build con ese mismo contenido; contenido funcional de app igual a `21fe88ad`, más metadata193. El SHA definitivo se asignó a los resultados tras esa confirmación, sin repetir ni modificar mediciones. Las tres rewrites `/core-api`, `/p`, `/review` verificadas a `127.0.0.1:4115` antes de abrir navegador.

OwnCoding UI instalado confirmó versión0.68.18; tag publicado informado por integrador `cb6ee80bd59b9655dbbe37867bd413f00f194e25`. Esto reemplaza el paquete candidato local de la comparación anterior. API/PG conservadas sin reiniciar; metadata de API local1.0.191, no se afirma un backend productivo193. Sin deploy desde QA.

| Caso final | Resultado |
| --- | --- |
| Login1440,1,6Mbps/150ms/CPU4×, caché fría | Contenido3,917s;406885bytes de scripts;24scripts; teclado y control React operativos |
| Login390, mismas condiciones | Contenido3,875s;406885bytes;24scripts; teclado y control React operativos |
| Balance+cuenta1440/390 | **12/12 PASS**: tablas renderizadas, formulario diferido, foco inicial en nombre, teclado, selección Banco Continental/logo decodificado y cancelar/descartar sin guardar |
| Catálogo real servido,1366/390,tres temas | **39/39 PASS**, cero API/proveedores/errores consola-runtime |

Las dos mediciones de login terminaron antes de abrir los otros navegadores. `auth/me` se recibió a3,838/3,812s desde navegación; esos valores **no son duración de petición**. Cero errores runtime y cero hosts externos en login y Balance. Los POST automáticos de analytics/presence se bloquearon en el runner de app; no se enviaron cuentas, tareas ni pagos, y no se afirma consola global limpia por los errores de recurso que produce ese bloqueo. No se envió login, correo u OAuth.

El catálogo ejecutó las mismas39 aserciones canónicas, deshabilitando exclusivamente la escritura de screenshots mediante `catalog-no-screens.mjs`. No se añadieron capturas: el total permanece en las seis del baseline. No se repitieron las32rutas ni la comparativa de seis casos porque el smoke final comprueba el paquete publicado y la metadata con contenido funcional equivalente.

Reproducción del smoke de app:

```bash
QA_LABEL=published193 QA_COMPILED_SOURCE=89bb98c2 \
QA_OUT=/tmp/scale252-final193-login QA_SCREENSHOTS=0 QA_KINDS=login \
node docs/qa/performance-initial-load-252/browser.mjs
QA_COMPILED_SOURCE=89bb98c2 \
QA_OUT=/tmp/scale252-final193-bank QA_ROUTES=/pagos/balance \
node docs/qa/performance-initial-load-252/lazy-pages.mjs
node docs/qa/performance-initial-load-252/catalog-no-screens.mjs
```

Resultados finales en `final193-login.json`, `final193-bank.json`, `final193-catalog.json`. La comparación previa conserva su resultado bruto y la auditoría del error de clasificación del harness; no se reescribieron como si hubiesen pasado originalmente. Servicios propios permanecen disponibles hasta señal de limpieza del integrador; no se tocan servicios ajenos.
