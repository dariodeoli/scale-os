# Biblioteca interna de Scale: instrucción vigente

Pedido del dueño del 17/10/2026. Seguimiento: #241. Este texto reemplaza el modelo anterior que priorizaba buscar componentes externos. Primero se audita y unifica Scale; luego se consolida la biblioteca interna y su catálogo; OwnCoding UI se revisa después. La dependencia existente no se elimina ni se reemplaza por similitud.

Actuá como agente senior de frontend, arquitectura UI y diseño de sistemas compartidos.

OBJETIVO

Unificar primero todos los componentes que ya existen dentro de la aplicación actual.

No empieces buscando componentes en OwnCoding UI. Primero auditá, consolidá y estandarizá la aplicación existente. Después creá una biblioteca interna con los componentes unificados. Recién como tercera etapa revisá OwnCoding UI para publicar, compartir o reutilizar componentes compatibles.

ORDEN OBLIGATORIO

1. Auditar la aplicación actual.
2. Detectar duplicados y elegir componentes canónicos.
3. Unificar componentes y consumidores.
4. Crear o consolidar la biblioteca interna.
5. Crear un catálogo visual.
6. Documentar y publicar componentes en OwnCoding UI.
7. Revisar si OwnCoding UI tiene componentes reutilizables para la aplicación.

La aplicación existente y sus contratos tienen prioridad sobre OwnCoding UI.

PRINCIPIO CENTRAL

Debe existir un componente base por modelo visual y de comportamiento.

No crees componentes separados solo porque cambien:

- El texto interior.
- El ícono.
- El color.
- El tamaño.
- El estado.
- La acción.
- La información mostrada.
- La pantalla donde se utiliza.

Estas diferencias deben resolverse mediante props, variantes o composición.

Ejemplo:

<Button variant="primary" size="compact">
  Crear cliente
</Button>

<Button variant="primary" size="compact">
  Guardar
</Button>

<Button variant="danger" size="compact">
  Eliminar
</Button>

Todos deben usar el mismo componente canónico Button.

Si se cambia el modelo base del botón —altura, padding, tipografía, borde, radio, foco, sombra, animación o responsive— el cambio debe propagarse a todos sus consumidores.

Aplicar el mismo principio a inputs, dropdowns, selectores, dialogs, toasts, cards, containers, tablas, tabs, filtros, avatares y formularios.

FASE 1: AUDITORÍA

Antes de modificar código:

- Revisá toda la estructura de la aplicación.
- Identificá la biblioteca UI existente.
- Localizá componentes repetidos.
- Detectá componentes visualmente iguales con nombres diferentes.
- Detectá componentes con el mismo propósito y comportamiento.
- Revisá estilos duplicados y valores hardcodeados.
- Revisá tokens de colores, tamaños, espaciados y tipografía.
- Revisá validaciones existentes.
- Revisá tipos, esquemas, DTOs, APIs y modelos de datos.
- Revisá el comportamiento de formularios, foco, errores y loading.
- Revisá pantallas de empresa, cliente, usuario, equipo y administración.
- Revisá configuración, ajustes y módulos adicionales.

Creá un inventario con:

- Componente encontrado.
- Ubicación.
- Consumidores.
- Duplicados.
- Diferencias.
- Componente canónico elegido.
- Migración necesaria.
- Riesgos.

No modifiques código hasta entender los consumidores.

COMPONENTES A UNIFICAR

Auditá y unificá, como mínimo:

- Botones.
- Icon buttons.
- Inputs.
- Textareas.
- Búsquedas.
- Inputs monetarios.
- Inputs de porcentaje.
- Inputs de fecha.
- Inputs de hora.
- Inputs de fecha y hora.
- Inputs de teléfono.
- Inputs de RUC.
- Inputs de email.
- Inputs de contraseña.
- Inputs de nombre y apellido.
- Selects.
- Dropdowns.
- Comboboxes.
- Autocomplete.
- Selectores de empresa.
- Selectores de cliente.
- Selectores de equipo.
- Selectores de usuario.
- Avatares.
- Logos.
- Tablas.
- Celdas.
- Paginación.
- Dialogs.
- Modals.
- Drawers.
- Confirmaciones.
- Toasts.
- Alertas.
- Notificaciones.
- Cards.
- Containers.
- Paneles.
- Tabs.
- Filtros.
- Barras de acciones.
- Estados loading.
- Estados vacíos.
- Estados de error.
- Estados de éxito.

BOTONES

Crear un único componente base Button con variantes controladas para:

- variant: primary, secondary, outline, ghost, danger.
- size: compact, medium, large.
- color.
- icon.
- iconPosition.
- loading.
- disabled.
- fullWidth.
- type.
- contenido interno.

No crear botones específicos como CreateClientButton, SaveButton o DeleteButton si solo cambia el contenido o la acción.

La acción de negocio debe pertenecer al consumidor. El aspecto y comportamiento visual deben pertenecer al componente Button.

DROPDOWNS Y SELECTORES

Crear un componente base reutilizable para dropdowns, selects, comboboxes y autocomplete.

Debe poder configurarse mediante:

- Fuente de datos.
- Texto principal.
- Dato secundario.
- Avatar o logo.
- Valor seleccionado.
- Placeholder.
- Búsqueda.
- Loading.
- Estado vacío.
- Estado de error.
- Opción deshabilitada.
- Selección simple o múltiple.
- Callback.
- Render personalizado cuando realmente sea necesario.

Un selector de empresa, cliente o equipo debe reutilizar el mismo modelo.

El dato secundario debe ser configurable:

- Email.
- Teléfono.
- Ciudad.
- Documento.
- Código.
- Otro dato contextual.

No mostrar todos los datos siempre. Cada consumidor debe elegir el dato secundario necesario.

FORMULARIOS

Todos los formularios deben:

- Conservar datos al ocurrir un error.
- Conservar errores hasta que el campo sea corregido.
- Mantener el foco en el campo correspondiente.
- Mantener el foco luego de validaciones.
- Evitar perder información al cerrar un dialog.
- Evitar doble submit.
- Mostrar loading y disabled.
- Mostrar errores de backend junto al campo correcto.
- Permitir navegación completa con teclado.
- Mantener valores cuando cambia un campo relacionado.
- No resetear datos accidentalmente.
- Separar validación visual de reglas comerciales.

CAMPOS INTELIGENTES

Crear componentes reutilizables para campos con autocompletado, consulta o extracción de datos.

1. RUC

Crear un componente único de RUC que permita:

- Formato configurable según las reglas reales de la aplicación.
- Validación de longitud.
- Validación de formato.
- Consulta automática cuando exista integración.
- Estado loading.
- Resultado encontrado.
- RUC no encontrado.
- Error de consulta.
- Selección de empresa o cliente existente.
- Carga manual cuando corresponda.
- Prevención de duplicados.
- Conservación del valor ante errores.
- Separación entre formato visual y valor enviado al backend.

Si el RUC permite obtener automáticamente nombre, empresa, dirección, ciudad, departamento, teléfono o email, esos datos deben cargarse sin sobrescribir silenciosamente información modificada manualmente.

No inventes reglas de RUC. Usá las validaciones existentes en backend, esquemas, base de datos o documentación del proyecto.

2. Empresa y cliente

Cuando se ingrese RUC, email, teléfono u otro identificador confiable:

- Buscar registros existentes.
- Mostrar resultados en un dropdown unificado.
- Evitar duplicar registros.
- Mostrar logo o avatar circular.
- Mostrar nombre principal.
- Mostrar un dato secundario configurable.
- Permitir seleccionar un resultado.
- Permitir continuar manualmente cuando la regla de negocio lo permita.

3. Email

- Validar formato.
- Usar el límite máximo real del modelo o backend.
- Autocompletar solo con una fuente confiable.
- No sobrescribir silenciosamente lo que escribió el usuario.
- Conservar el valor si existe un error.
- Evitar espacios inválidos según las reglas existentes.

4. Ciudad y departamento

- Usar un selector unificado.
- Permitir obtener automáticamente el departamento desde la ciudad cuando exista relación.
- No sobrescribir una selección manual sin avisar.
- Mantener consistencia entre país, departamento y ciudad.
- Separar UI de la fuente de datos.

5. Teléfono

Crear un componente único con:

- Código de país.
- Código de área si corresponde.
- Número.
- Formato visual.
- Valor normalizado para backend.
- Validación.
- País configurable.
- Edición manual.
- Estados error, loading y disabled.
- Sin imponer ceros incorrectos.
- Sin mezclar el formato visual con el valor real enviado.

TAMAÑOS MÁXIMOS Y VALIDACIONES

Para cada campo, revisá:

- Tipo.
- Longitud mínima.
- Longitud máxima.
- Formato.
- Máscara.
- Valor normalizado.
- Placeholder.
- Ayuda.
- Mensaje de error.
- Restricciones del backend.
- Restricciones de base de datos.
- Contrato del API.

Aplicá esto a:

- Nombre.
- Apellido.
- Nombre completo.
- Email.
- Contraseña.
- Teléfono.
- RUC.
- Dirección.
- Ciudad.
- Fecha.
- Hora.
- Moneda.
- Porcentaje.
- Código postal.
- Observaciones.

No inventes límites. Si no existe evidencia, documentá la duda y no cambies el contrato sin autorización.

FECHAS

Crear un componente DateInput reutilizable que permita:

- Escribir manualmente.
- Elegir desde un calendario.
- Abrir el calendario mediante un ícono.
- Navegar con teclado.
- Validar fechas imposibles.
- Definir fecha mínima y máxima.
- Mostrar formato esperado.
- Mantener el valor escrito.
- Evitar problemas de zona horaria.
- Mostrar errores.
- Confirmar o cancelar la selección sin perder datos.

HORAS

Crear un componente TimeInput reutilizable que permita:

- Escribir manualmente.
- Seleccionar visualmente.
- Incrementar y decrementar horas.
- Deslizar horas y minutos cuando corresponda.
- Usar teclado.
- Elegir formato de 12 o 24 horas según la aplicación.
- Configurar rangos mínimos y máximos.
- Mantener el valor si otro campo cambia.
- Mostrar errores correctamente.

MONEDAS Y NÚMEROS

Los campos monetarios deben:

- Respetar la moneda seleccionada.
- Mostrar símbolo o código correspondiente.
- No imponer ceros iniciales.
- No convertir monedas silenciosamente.
- Manejar decimales según la moneda.
- Separar valor visual y valor enviado.
- Mantener el valor durante la edición.
- Manejar correctamente coma, punto y separadores locales.
- Mostrar errores claros.

COLORES Y DISEÑO

Centralizá en tokens:

- Colores.
- Fondos.
- Texto.
- Bordes.
- Acciones.
- Estados.
- Error.
- Warning.
- Success.
- Info.
- Espaciado.
- Radios.
- Sombras.
- Tipografía.
- Tamaños.
- Alturas.
- Breakpoints.

Todos los componentes deben soportar:

- Modo claro.
- Modo oscuro.
- Contraste correcto.
- Responsive.
- Focus visible.
- Navegación por teclado.
- Estados disabled, loading, error y empty.
- Tamaños compactos.
- Columnas alineadas.
- Avatares y logos circulares cuando corresponda.

SEPARACIÓN DE UI Y NEGOCIO

La biblioteca compartida debe contener:

- Componentes visuales.
- Layouts.
- Tokens.
- Temas.
- Estados visuales.
- Accesibilidad.
- Formateo genérico.
- Validaciones visuales.
- Hooks reutilizables.

La lógica de negocio de Scale debe permanecer fuera:

- Permisos.
- Roles.
- Reglas comerciales.
- Empresas permitidas.
- Cálculos.
- Flujos de aprobación.
- Estados comerciales.
- Endpoints.
- Consultas.
- Integraciones.
- Restricciones propias de Scale.

No mezcles reglas de negocio dentro de componentes visuales.

FASE 2: BIBLIOTECA INTERNA

Después de unificar la aplicación:

- Consolidá los componentes canónicos.
- Definí APIs claras y tipadas.
- Migrá todos los consumidores.
- Eliminá duplicados.
- Documentá props y variantes.
- Definí variantes permitidas.
- Evitá variantes para una única pantalla.
- Agregá tests.
- Agregá ejemplos.
- Conservá compatibilidad donde sea posible.

FASE 3: CATÁLOGO VISUAL

Crear o actualizar una página de biblioteca visual con ejemplos separados de:

- Botones.
- Inputs.
- Formularios.
- Dropdowns.
- Selectores.
- Empresas.
- Clientes.
- Equipos.
- RUC.
- Email.
- Teléfono.
- Fechas.
- Horas.
- Monedas.
- Dialogs.
- Modals.
- Toasts.
- Alertas.
- Tablas.
- Cards.
- Containers.
- Tabs.
- Filtros.
- Estados vacíos.
- Estados loading.
- Estados de error.
- Modo claro.
- Modo oscuro.
- Vista responsive.

Cada componente debe mostrar:

- Nombre.
- Descripción.
- Props.
- Variantes.
- Estados.
- Ejemplo de uso.
- Casos correctos.
- Casos incorrectos.
- Reglas de reutilización.
- Diferencia entre UI y negocio.

FASE 4: OWNCODING UI

Solo después de terminar la unificación local:

- Documentá los componentes.
- Prepará su publicación en OwnCoding UI.
- Compará la biblioteca interna con OwnCoding UI.
- Identificá componentes compartibles.
- Reutilizá algo externo únicamente si es compatible.
- No agregues dependencias innecesarias.
- No reemplaces un componente estable solo porque exista uno parecido.
- Mantené contratos, accesibilidad y diseño de la aplicación.

ISSUE

Creá o actualizá un issue con:

- Objetivo.
- Auditoría.
- Duplicados encontrados.
- Componentes canónicos.
- Consumidores afectados.
- Campos inteligentes.
- Reglas de RUC.
- Reglas de email.
- Reglas de teléfono.
- Reglas de fechas y horas.
- Reglas monetarias.
- Tokens unificados.
- Plan de migración.
- Riesgos.
- Pendientes.
- Criterios de aceptación.

PULL REQUEST

Creá un PR con:

- Resumen.
- Componentes unificados.
- Consumidores migrados.
- Componentes nuevos o modificados.
- Tests.
- Evidencia visual.
- Catálogo actualizado.
- Modo claro y oscuro.
- Responsive.
- Validaciones ejecutadas.
- Riesgos.
- Pendientes.
- Componentes que deliberadamente quedaron separados y por qué.

VERIFICACIÓN OBLIGATORIA

Ejecutá y corregí:

- Tests unitarios.
- Tests de componentes.
- Tests de integración.
- Lint.
- Typecheck.
- Build.
- Tests de foco.
- Tests de teclado.
- Tests de formularios con errores.
- Tests de dropdowns.
- Tests de RUC.
- Tests de RUC no encontrado.
- Tests de prevención de duplicados.
- Tests de email.
- Tests de teléfono.
- Tests de fechas.
- Tests de horas.
- Tests monetarios.
- Tests responsive.
- Verificación visual en modo claro y oscuro.

No afirmes que algo está listo para producción si solamente fue probado localmente.

Si el remoto, issue tracker o permisos no están disponibles, dejá preparado:

- El código local.
- El texto del issue.
- El texto del PR.
- La lista de validaciones ejecutadas.
- Las limitaciones conocidas.

Preservá cualquier cambio previo del usuario y no uses acciones destructivas.