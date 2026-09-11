# Scale OS — interfaz compartida

## Alcance del rediseño

La base visual común vive en `app/ui-system.css`, cargada desde el layout raíz. Se aplica al espacio de trabajo y a los diálogos que se montan fuera de él. No cambia la landing, roles, precios ni datos. Las distribuciones específicas de Producción, calendario e informes se conservan.

| Patrón | Uso y regla |
| --- | --- |
| `.panel` | Una superficie por sección, radio de 12 px y padding común. Los paneles anidados no añaden otro borde y padding. |
| `.ops-card`, tarjetas de clientes, proyectos, inventario e informes | Contenido agrupado, radio común, separación de 12 px y padding de tarjeta. |
| `.ops-stack`, `.finance-grid` | Separación de 16 px entre secciones, sin sumar márgenes duplicados. |
| `.panel-heading` | Título y acciones en una fila cuando caben; se reorganizan al reducir ancho. |
| `.form-stack`, `.ops-form-grid` | Campos relacionados en columnas flexibles; texto largo a ancho completo y una columna en móvil. |
| Botones | Primario, secundario, selección y acción textual. Hover/selección no cambian peso ni dimensiones. Destructivos conservan color y confirmación. |
| Estados | Espera visible, acciones deshabilitadas al enviar, error legible conservando los datos. |
| Tablas y cifras | Cifras tabulares; monedas separadas. Las tablas anchas tienen su propio desplazamiento horizontal. |

## Tokens

Espaciado: 4, 8, 12, 16, 20 y 24 px (`--ui-space-1` a `--ui-space-6`). Controles de 40 px en escritorio y 44 px en móvil; inputs móviles de 16 px para evitar zoom involuntario. Paneles: padding de 20 px, 16 px en móvil. Tarjetas: 16 px, 14 px en móvil. El tablero y los controles de arrastre mantienen su distribución especializada.

Los bordes de campos usan `--ui-field-border`, con contraste mínimo 3:1 frente a blanco y superficie sutil. Colores semánticos, radios y tipografía heredan las variables de marca existentes. Se conserva la preferencia de movimiento reducido.

## Ventanas y formularios

- `Dialog`: cabecera, cuerpo desplazable y pie separado; tamaños predeterminado, compacto y amplio, además de ficha lateral.
- Escape actúa sobre la ventana superior. Un selector personalizado abierto consume Escape primero; los selectores nativos conservan el manejo de su menú por el navegador.
- El foco permanece en la ventana y vuelve al control anterior al cerrar. Tab y Shift+Tab incluyen inputs, selectores, enlaces y botones habilitados.
- `useDialogPending(pending)` registra cada formulario por separado. Un formulario inactivo no desbloquea otro que está guardando. Durante el envío se impide cerrar con Escape, fondo o botón de cierre.
- `Editor`: validación con errores vinculados al campo, indicación de opcionales, ayudas y botón Cancelar dentro de ventanas. Sin Cancelar añadido a formularios de página.
- `closeOnSave` es optativo: los editores simples pueden cerrar tras éxito; una ficha con comentarios, checklist u otras acciones no desaparece tras cada guardado parcial. Los callbacks existentes de guardado conservan sus cierres explícitos.
- Un fallo de persistencia conserva el formulario. Una actualización visual posterior fallida no debe presentarse como si los datos no se hubieran guardado.
- `SaveActions` aplica el mismo pie a formularios específicos de altas, presupuestos y reservas. `completeSave` se llama solo después de persistir; cierra antes de actualizar la lista y convierte un fallo de esa actualización en advertencia, sin sugerir repetir la escritura.
- Los comentarios usan `resetOnSave`: vacían únicamente el texto publicado, sin cerrar la ficha. Suscripción dentro de una ventana usa la variante embebida sin otro título visible ni tarjeta duplicada.
- La vista previa de presupuestos no hereda la altura/ancho de la barra lateral aunque use `<aside>`; importes y textos se reorganizan sin puntos suspensivos que oculten cifras.

## Cobertura y límites

La capa compartida cubre Resumen, Producción, Clientes, Proyectos, Presupuestos, Finanzas, Equipo, Pipeline, Inventario, Informes y Configuración mediante sus componentes comunes; no implica que cada pantalla tenga un diseño exclusivo nuevo. Mi perfil añade agrupación de identidad, nombre y fotografía, correo de solo lectura y explicación de alcance personal/demo.

Pruebas: comportamiento de diálogos y formularios en entorno aislado, regresiones existentes, contratos de CSS y compilación limpia. Los contratos a 320/360/390/768 px no sustituyen capturas ni pruebas táctiles. La revisión visual en navegador continúa bloqueada por la verificación de política administrativa; no se intenta un acceso indirecto.

Antes de publicar: pruebas completas, compilación sin cambios ajenos WEEM/Dadoo, revisión independiente, commit exacto y salud del despliegue. Si falla navegación, guardado o foco, revertir el código de esta entrega a `daf8e5615e53bf1a0802c2f2baa0ff7a84f4c4f8`; no borrar datos. Esta entrega no necesita migración ni activación de servicios externos.

Verificación local de esta entrega: 94 resultados de pruebas aprobados y compilación de 41 rutas sobre export limpio. Revisión independiente cerró los defectos de ancho/altura y truncado de importes del preview. Se verificaron flujos de guardado/error/reintento, formularios específicos y aislamiento de ventanas con dobles locales. Publicación y salud se confirman por separado; no se acredita una revisión visual ni un monitoreo extendido de 15 minutos.
