# Verificación integrada en Chrome — #241

Fecha: 17/10/2026. Ruta local: http://127.0.0.1:4891/ui-catalog. Build de Scale, sin datos ni consultas productivas.

## Comprobado

| Caso | Resultado observado |
|---|---|
| Claro y oscuro, escritorio | Componentes reales, texto/inputs/bordes visibles; capturas1440×1000 |
| Claro y oscuro, móvil | Capturas390×844. scrollWidth390, innerWidth390: sin overflow horizontal del documento |
| Tablet claro | Captura768×1024. scrollWidth768, innerWidth768 |
| Escritorio | scrollWidth1440, innerWidth1440 |
| Formulario con fallo ilustrativo | Se conserva el texto visible introducido; email recupera foco después de terminar loading; error inline visible |
| Escape con borrador | Abre «¿Descartar los cambios?» con Seguir editando/Descartar; no elimina silenciosamente los datos |
| Dropdown en móvil | Lista con Todos/Activo/Pendiente; Pendiente deshabilitado. End enfoca Activo, omitiendo Pendiente |
| Tab desde portal | Cierra listbox y enfoca «Sin asignar», el control siguiente; no retiene el foco en trigger |
| Contraste medido de botones activos en claro | Primary14.07:1, Secondary/Outline16.45:1, Ghost8.14:1, Danger5.72:1. Lectura de estilos computados de esta vista, sin extenderla a toda la app |

Las capturas están en el paquete de entrega `evidencia/`. Se verificaron sus dimensiones reales con sips.

Se comprobó además por HTTP: catálogo habilitado: 200, sin la variable de activación: 404. El servidor auxiliar de esta verificación se cerró al terminar.

## Alcance

El catálogo usa controles y estilos de la app, pero contiene datos ilustrativos. No equivale a un recorrido autenticado de todos los roles, tenants y módulos contra su API real. El fallo de formulario es simulado; pruebas de componentes y RUC del backend complementan el circuito con contratos persistidos/mocks locales.

Los controles de fecha/hora son nativos: formato visible y calendario dependen del navegador/idioma. No se acredita aquí un selector de rueda táctil ni un calendario personalizado con confirmación separada. No se ejecutaron consultas a proveedores de RUC reales.

Chrome registró un mensaje de canal asíncrono cerrado (`A listener indicated an asynchronous response...`). No hubo evidencia suficiente para atribuirlo al código de la app; no se declara consola completamente limpia. La página siguió funcionando en las interacciones verificadas.

La captura del formulario confirma visualmente el valor conservado; el conector oculta valores de email en algunas lecturas DOM. Los tests locales de formulario comprueban los valores exactos enviados al callback de guardado.
