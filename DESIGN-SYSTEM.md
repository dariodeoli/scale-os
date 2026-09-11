# Scale OS — interfaz compartida

## Refinamiento 1.0.5 — 11-09-2026

Preparado, todavía no publicado. AgencyOS se consultó como referencia local de jerarquía, tarjetas y agrupación de formularios; no se copiaron sus datos ni su arquitectura. Los referentes «Fonot», «iStock» y «los de Brasil» necesitan identificación: no se atribuye su diseño a esta entrega.

- Jerarquía común mediante tokens de títulos/valores, radios compartidos, foco visible y superficies compactas. Marca morada conservada. Controles móviles de 44 px; importes sin elipsis; columnas de Producción con altura natural y desplazamiento vertical de página.
- `formatMoney` en `app/amount-format.ts`: códigos de moneda explícitos, miles con punto, decimales con coma, PYG sin centavos y demás monedas admitidas con dos. Ausencia/valor inválido es «Sin datos», no cero. Los decimales recibidos como texto conservan precisión entera en la presentación. No reemplaza entrada de montos, cálculos contables, cotización ni exportación CSV.
- Planes reutilizables muestran ítems, cantidades, precio unitario y subtotal en la tarjeta; tres ítems iniciales y expansión para el resto. No requiere abrir el editor ni escribir datos. Total identificado sin IVA; datos incompletos no se presentan como cero.
- Cargar todas las facturas conserva las 20 iniciales ante error, evita doble solicitud y descarta respuestas de una carga invalidada.

Verificación de integración: 158 resultados automatizados, 5 pruebas de despliegue y compilación de 42 páginas. Son pruebas locales: la política administrativa del navegador impidió también la revisión visual local. No equivalen a capturas móvil/desktop ni a publicación. Corte seguro y condiciones pendientes: `UNIFIED-DEPLOYMENT.md`. Reversión de esta tanda: volver al código `c19cc87`; no cambiar datos ni retirar servicios existentes.

## Identidad de autores — 11-09-2026

`ActorIdentity` es el bloque común para comentarios de proyectos/piezas, actividad, historial, invitaciones, cobros, transferencias y uso del equipo. Muestra foto circular de 32 px, nombre completo sin recortar y fecha opcional debajo. Usa tokens de superficie, línea y texto; el nombre se ajusta al ancho móvil. No es un botón ni indica presencia: no agregar punto verde a un autor histórico.

- `name`, `photoUrl`, `verified`, `timestamp` y `imported` son sus propiedades. `verified` significa atribución confirmada por el servidor, nunca permiso de acceso.
- Sin foto o ante error de carga: iniciales. Imagen decorativa con nombre visible accesible, sin duplicar su lectura. Fecha válida usa `time` y formato local; una fecha inválida no se inventa.
- Preferir identidad personal compartida confirmada por servidor; correo solo como alternativa. No emparejar personas por parecido de nombre ni atribuir fotos actuales a autores importados sin identificación fiable. Los registros importados se etiquetan.
- No modificar el contenido, autor original, fechas ni permisos de los registros al mejorar su presentación. No realizar una solicitud extra por cada avatar.

## Responsables en tarjetas — 11-09-2026

`AssignedPeople` es el contenedor compartido de responsables en las tarjetas de Producción y en Proyectos (lista y cuadrícula). Reutiliza `ActorIdentity`, con avatar decorativo de 24 px, nombre completo y etiqueta Principal cuando la confirma el servidor. Una sola superficie sutil, borde y radio semánticos; separaciones de 4/8 px mediante los tokens `--ui-space-*`. El ajuste de filas permite ver completas las 2–5 personas habituales y también todas las adicionales: sin `+N`, elipsis, altura fija ni desplazamiento interno. Nombres largos se parten sin ensanchar la tarjeta.

- La sección tiene nombre accesible «Responsables asignados» y una lista semántica. No añade botones, escrituras ni peticiones por persona. Foto ausente, inválida o fallida usa las iniciales de `ActorIdentity`; el correo confirmado es alternativa al nombre.
- Contrato: Proyectos usa `assignees: [{id, full_name, email?, photo_url, is_primary}]`, resuelto por ID y empresa. Producción muestra `effective_assignees` junto con `assignee_source` (`direct`, `project` o null), según la selección explícita del servidor; conserva `assignees` como asignaciones directas y `project_assignees` como contexto, sin mezclarlas ni recalcular herencia en el navegador. Si la fuente es `project`, etiqueta «Responsables del proyecto» y «Principal del proyecto»: no son asignaciones guardadas de la pieza. `[]` confirma que no hay responsables; campo ausente/null, respuesta inválida o error significa «Responsables no disponibles». La carga tiene su propio estado. Nunca usar IDs de filtros o alias de Trello para inventar un nombre, foto o responsable principal.
- «Responsables» expresa asignación, no presencia. `ProjectCardPresence` conserva su bloque separado «Viendo ahora». No se mezclan sus personas, puntos de actividad ni tiempos con las asignaciones; ninguno de estos bloques mide horas trabajadas o amplía permisos.
- El CSS compacto se limita a `.assigned-people`; no cambia los autores históricos. Pruebas de componente cubren cinco y más personas, nombres completos, alternativas de foto, estados honestos y separación de presencia. Los contratos CSS verifican ajuste; no sustituyen QA visual/táctil.

## Primer ingreso y preferencias — 11-09-2026

- La guía muestra instrucciones según capacidades del rol, no solo visibilidad del módulo. El bloque de Primeros pasos es optativo, plegable y descartable; Guía del panel sigue disponible. No abre ventanas ni realiza escrituras de negocio automáticamente.
- La evidencia de clientes/proyectos/piezas está vinculada a usuario, empresa, rol y demo. Carga, error y ausencia de información no significan cero registros. La demo informa datos de ejemplo; nunca marca una lección como completada por tener registros precargados.
- Preferencias personales de inicio y filtros del tablero: almacenamiento local versionado por usuario/empresa. No sincroniza dispositivos ni guarda credenciales o datos de órdenes. Si el almacenamiento falla, la interfaz sigue funcionando e informa que el cambio es temporal.
- El inicio preferido solo puede aplicarse una vez al entrar en la raíz sin parámetros ni fragmentos y con sesión/acceso confirmados. No reemplaza enlaces explícitos, retornos de autenticación o facturación, ni navegación posterior.
- Filtros combinables por cliente, asignación y semana local de lunes a domingo; reglas relativas, no fechas congeladas. Conserva los estados del tablero y ofrece restablecer. La interfaz deja claro cuándo el cliente guardado ya no existe.
- Búsqueda: el destino de las órdenes es Producción, coherente con el texto del botón. El icono de marca se sirve desde los archivos locales de la app para no depender de la web de la agencia.

Estos patrones reutilizan contenedores, botones y selectores existentes; no crean permisos ni rutas de servidor nuevas. La revisión visual sigue pendiente del acceso permitido al navegador. Las evidencias de pruebas y publicación se registran por separado en `scale-core-api/RELEASE-CHECKLIST.md`.

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

## Selector de vista

Para colecciones que ofrecen cuadrícula y lista se usa ViewToggle: un control segmentado compacto con icono de cuadrícula e icono de lista. No se colocan las palabras “Cuadrícula” o “Lista” dentro del control. Cada botón conserva aria-label, title y aria-pressed; la opción activa usa el color de marca y la preferencia se guarda por persona en su navegador. El patrón usa tokens semánticos y funciona sobre temas claros u oscuros.

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
- Los ocho formularios heredados del espacio de trabajo usan `useSingleFlightSubmit`: el bloqueo empieza antes de la validación asíncrona y pertenece al envío original. Un segundo clic no inicia otra petición ni desbloquea el pie mientras queda una escritura pendiente. La transferencia entre monedas también registra su guardado y mantiene bloqueados sus campos y todas las vías de cierre. La reversión cierra solo después de persistir, antes de refrescar la lista.
- Los comentarios usan `resetOnSave`: vacían únicamente el texto publicado, sin cerrar la ficha. Suscripción dentro de una ventana usa la variante embebida sin otro título visible ni tarjeta duplicada.
- La vista previa de presupuestos no hereda la altura/ancho de la barra lateral aunque use `<aside>`; importes y textos se reorganizan sin puntos suspensivos que oculten cifras.

## Cobertura y límites

La capa compartida cubre Resumen, Producción, Clientes, Proyectos, Presupuestos, Finanzas, Equipo, Pipeline, Inventario, Informes y Configuración mediante sus componentes comunes; no implica que cada pantalla tenga un diseño exclusivo nuevo. Mi perfil añade agrupación de identidad, nombre y fotografía, correo de solo lectura y explicación de alcance personal/demo.

Pruebas: comportamiento de diálogos y formularios en entorno aislado, regresiones existentes, contratos de CSS y compilación limpia. Los contratos a 320/360/390/768 px no sustituyen capturas ni pruebas táctiles. La revisión visual en navegador continúa bloqueada por la verificación de política administrativa; no se intenta un acceso indirecto.

Antes de publicar: pruebas completas, compilación sin cambios ajenos WEEM/Dadoo, revisión independiente, commit exacto y salud del despliegue. Si falla navegación, guardado o foco, revertir el código de esta entrega a `daf8e5615e53bf1a0802c2f2baa0ff7a84f4c4f8`; no borrar datos. Esta entrega no necesita migración ni activación de servicios externos.

Verificación local de esta entrega: 94 resultados de pruebas aprobados y compilación de 41 rutas sobre export limpio. Revisión independiente cerró los defectos de ancho/altura y truncado de importes del preview. Se verificaron flujos de guardado/error/reintento, formularios específicos y aislamiento de ventanas con dobles locales. Publicación y salud se confirman por separado; no se acredita una revisión visual ni un monitoreo extendido de 15 minutos.
