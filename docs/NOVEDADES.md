# Novedades de Scale OS

Acumulativo por versión, en lenguaje de producto. Lo mantiene el integrador en cada ciclo `hd`.

## v1.0.172

### Plataforma

- **Configuración por bloques**: empresa, facturación/cotización, integraciones, suscripción y seguridad con navegación por anclas; la zona de peligro queda aparte con su propio encabezado.
- **Preferencias de correo claras**: la campana siempre recibe los avisos in-app y el correo pasa a ser opt-in; los avisos dependientes se deshabilitan si el interruptor maestro está apagado.
- **Demo limpia y presencia honesta**: se terminaron los correos técnicos en identidad, menciones, Mis datos y custodias; fuera de un proyecto ya no se afirma «viendo este proyecto».
- **Portal del cliente más claro**: la decisión del usuario se ve en el tablero por versión, re-mostrar una entrega publicada no bumpea la versión, la descarga sin sesión lleva al ingreso y la invitación interpreta el error de Google.
- **Acceso ampliado (Fase 1)**: Microsoft y Apple se suman a Google en el login social, con vinculación por correo verificado.

### Sitio público

- **Cada host con su regla**: la landing queda indexable y la app no indexable, con sitemap/robots, 404 y /status consistentes.
- **Imagen social y datos estructurados reales**: la tarjeta de enlaces usa la pieza de marca y el schema queda consolidado con ofertas reales.
- **Baseline de Core Web Vitals**: medición lab de arranque para móvil y escritorio.

### Comercial

- **Buscador de clientes corregido**: la ventana de filas ya no mide espaciadores ni desmonta la lista al buscar (#135/#154).

## v1.0.171

### Finanzas

- **Alta y cobro a prueba de errores**: «Crear factura» y «Registrar cobro» quedan deshabilitados hasta tener cliente, factura, cuenta e importe, con el error inline y la ayuda al lado; los gastos planificados y reales bloquean sin monto positivo (y cuenta).
- **Selector único con buscador**: cliente, factura y persona se eligen en el mismo buscador, con nombre, foto/logo y contexto (saldo pendiente, moneda, vencimiento, rol).
- **Custodias con nombre y foto**: cuentas y cobros muestran la identidad real del custodio, sin correos técnicos del demo.
- **Etiquetas y montos unificados**: meses largos («Octubre 2026») en Previsión, Informes y Comisiones; «Sin mora» reemplaza a «Al día» con saldo pendiente y los contratos facturados se rotulan «Facturado»; la IA de carga usa el formateador único de dinero.
- Evidencia 390/1440 en claro y oscuro en `docs/qa/fin-149/` (#149) y de la campaña de testeos (#154).

### Diseño

- **Modo oscuro AA**: el botón de texto y el sello demo de la landing corrigen su contraste en oscuro.

## v1.0.170

### Operaciones

- **Tablero y detalle sin huecos**: las piezas terminadas ya no muestran «venció» y los campos vacíos dejan de ocupar lugar; las horas se leen en formato humano.
- **Checklist con atribución honesta**: quién completó cada paso se muestra con nombre, sin «por» sueltos.
- **Inventario más robusto**: si la foto de un equipo no carga, se ve un respaldo, y el nombre completo encabeza la lista.
- **Identidad coherente**: tablero, checklist y contenedores de persona muestran el nombre real, nunca los correos técnicos del demo.
- Evidencia 390/1440 en claro y oscuro del tablero, la pieza y el inventario (#151) y de la campaña de testeos (#154).

## v1.0.169

### Sitio público

- **Landing y privacidad listas para buscadores**: la landing y la política de privacidad publican metadatos, Open Graph y datos estructurados, para que Scale OS se presente bien en Google y al compartir un enlace.
- **Imagen de marca al compartir**: nueva pieza de marca para las vistas previas de enlaces y redes.

## v1.0.168

### Diseño y experiencia

- **Paleta de comandos (⌘K)**: abrí la búsqueda rápida desde cualquier pantalla y saltá a módulos, vistas o acciones sin recorrer el menú.
- **Ayuda por módulo**: cada sección estrena su guía con los objetos y flujos propios, accesible desde la misma pantalla.
- **Listas con ventana densa**: Clientes y Presupuestos cargan las filas por ventana, con la misma plantilla y columnas, sin listas que cortan información.
- **Estados honestos**: previews, guía, Mis datos, avisos, empresa y administración muestran carga, vacío y error reales; se terminaron los bloques en blanco.
- **Biblioteca v0.61**: la interfaz adopta los objetos compartidos y el pie actualizado de `owncoding-ui` (toasts, cápsulas y ayuda coherentes).

### Landing

- **Capturas reales del producto**: la landing muestra el producto en acción por resultado (vender, producir, cobrar), con la demo visible y un único canal de contacto.
- **Puesta en marcha clara**: los pasos de inicio y el pie quedan alineados con la versión publicada.

## v1.0.166

### Finanzas

- **Previsión sin contradicciones**: si el mes tiene total planificado, el resumen ya no puede mostrar «Sin gastos planificados»; mientras llega el desglose se anuncia la carga y, si no llega, aparece un aviso con reintento.
- **Desglose bimoneda plegado**: el detalle por moneda del resumen vive bajo «Ver desglose», y los datos quedan atados a su mes (un mes nunca muestra cifras de otro).
- **Cierre de mes en Salarios**: la plantilla del cierre da lugar al ajuste inline sin cortes.
- Evidencia antes/después 390/1440 en claro y oscuro en `docs/qa/prevision-144/` (#144).

### Comercial

- **Presupuesto en modo consulta**: abrir un presupuesto muestra primero sus condiciones, ítems y totales, con las acciones visibles arriba (PDF, enlace, factura); «Editar presupuesto» recién monta el compositor.
- **Guardado cuidado**: no se puede guardar un presupuesto sin título, cliente o ítems; los campos obligatorios se marcan, el error aparece inline y el pie dice qué falta.
- **Menos ruido en el editor**: IVA, vigencia y secciones pasan a «Opciones del documento» y la vista previa a su propio bloque.
- **Enlace público con alcance claro**: antes de compartir se explican alcance, vencimiento y revocación, con confirmación al revocar.
- **Oportunidad con campos primero**: en el alta, los campos van primero y el aviso legal queda como resumen de una línea con «Privacidad» y su detalle desplegable.
- Evidencia antes/después 390/1440 en claro y oscuro en `docs/qa/com-150/` (#150).

## v1.0.165

### Diseño y móvil

- **Tarjetas compactas con menú ⋯**: las tarjetas de los tableros y listas adoptan el patrón estándar (título, contexto, meta y avance) con las acciones secundarias en un menú desplegable, sin perder la acción rápida.
- **Carga con la forma real**: los esqueletos dibujan la estructura del bloque que va a llegar (tarjeta, tabla, panel) y los datos se piden antes, para que el contenido no salte al aparecer.
- **Vacíos en una línea**: los bloques sin datos pasan a un aviso compacto y accionable, descartable cuando aplica; el vacío principal conserva su formato.

### Comercial

- **Ficha de cliente coherente**: «Cliente desde» pasa a ser el alta real del cliente (hora de Asunción) y «Inicio de relación» aparece solo cuando difiere; las etiquetas quedan únicas en toda la app.
- **Montos formateados**: las notas del cliente y el fixture de demostración ya no muestran importes crudos («PYG 3000000.00» → «Gs. 3.000.000»).
- **KPIs de Pipeline en móvil**: los indicadores se leen en una fila compacta en vez de cuatro tarjetas apiladas.

### Operaciones

- **Detalle de proyecto fiel**: el contador de piezas de la ficha usa la misma fuente que la lista (se terminó el «0 vs 4»).
- **Calendario de Inventario**: agenda semanal en móvil (días vacíos bajos, navegación ‹ › + Hoy) y mini calendario mensual en escritorio, con las reservas a la vista.
- **Ubicaciones compactas**: «Ordenar/Ocultar» pasan al menú ⋯ del encabezado y las filas de ubicaciones quedan en una línea.

### Plataforma

- **Permisos por módulo**: la tabla de 34 permisos se reemplaza por un acordeón por módulo con pastillas editables por cargo (44 px en móvil) y el resumen por cargo plegado; sin perder capacidades, ajustes ni la aclaración del Dueño.
- **Actividad legible**: los eventos se leen como «Factura emitida» o «Pago recibido», con cliente, referencia e importe; el detalle técnico queda para escritorio y el tooltip.
- **Papelera e Invitaciones**: «Restaurar» queda siempre visible en móvil y el bloqueo por demo pasa a un aviso compacto.
- **Equipo y Preferencias**: los KPIs usan la franja compacta del sistema, sin variantes paralelas.

## v1.0.164

### Plataforma

- **Resumen sin ruido**: «Primeros pasos» pasa a checklist compacto y descartable, y el desglose bimoneda vive bajo «Ver desglose» — el primer pliegue muestra lo que importa.
- **Equipo más honesto**: la cabecera deja la facturación contratada y los salarios sin monto real ya no muestran placeholders vacíos.
- **Configuración más clara**: el manual/preview se muda a la ayuda y el lateral de Suscripción gana Cotización e Integraciones.
- **Carga percibida**: Resumen, Finanzas e Informes piden sus KPIs en la primera llamada, sin cascadas de espera.

### Operaciones

- **Producción compacta**: la tarjeta muestra título, cliente, vencimiento, responsables y avance; descripción y acciones secundarias pasan al detalle o al menú ⋯, sin tocar el arrastre.
- **Inventario con una sola verificación a la vista**: «Verificar con detalle» se muda al menú ⋯ junto a etiqueta, editar y archivar, con una acción rápida por fila.

### Comercial

- **Clientes**: el estado vacío «Sin contratos» queda en una línea accionable y las acciones por fila se consolidan en un menú ⋯ (la acción rápida sigue visible).
- **Pipeline**: indicador fuerte de columnas ocultas con acceso directo a esas etapas y tarjetas más cortas: título, cliente, avance y lo esencial.

### Finanzas

- **Primer pliegue en tres bloques**: Balances (disponible por moneda y cuentas), Cobros urgentes (vencidas o por vencer en 7 días, con acceso a «Cobrar» y a Mora) y Proyección (caja, resultado y personal esperado del mes).
- **Historial en tabs**: transferencias, cobros registrados y movimientos en un solo bloque con contador, sin apilar tres secciones.
- **Informes**: sin período anterior comparable ya no se dibuja la tarjeta gigante; un aviso de una línea propone reintentar o «Ampliar histórico a 24 meses».

### Diseño y móvil

- **Header móvil en 2 filas**: el modo demo deja de ocupar una fila; «Demo / probar permiso / Así te ve tu cliente / Reiniciar» viven en un popup de 44 px.
- **Pestañas desplazables**: un solo carril con chevrones cuando hay apartados fuera de vista (Equipo, Configuración, Producción, Inventario y planificador).
- **Un solo selector de vistas** Lista/Cuadrícula con nombres accesibles, y el chip neutro gana contraste AA en oscuro.
- **Nueva orden**: el proyecto se elige con combobox buscable y recién al elegir aparece el resto del formulario.
- Evidencia antes/después 390/1440 en claro y oscuro en `docs/qa/` (#137, #139, #140, #141, #142).

## v1.0.163

### Landing

- **Una sola promesa de prueba**: «Empezar gratis» con los 30 días explicados una vez, junto al precio; se termina la repetición de «sin compromiso» y las promesas de precio congelado «para siempre».
- **Funciones en 3 pilares** (Operación, Clientes y Control financiero) con las 9 funciones intactas: el detalle se expande sin JavaScript y nada queda escondido.
- **Sin citas genéricas**: el bloque de testimonios queda reservado para casos reales autorizados (no se publican citas inventadas).
- **Beneficio de fundador junto al precio**: el chip y la nota canónica viven al lado del plan, donde se decide la compra, y el hero vuelve a vender el valor con un único CTA principal por bloque.
- Evidencia antes/después en 1440 y 390 en `docs/qa/landing-134/`.

## v1.0.162

### Asistente «Carga con IA»

- **Confianza 0–100 por candidato**: cada coincidencia muestra su puntaje con las señales que la acercan (RUC/CI, correo, teléfono, nombre), tolerante a typos («Jhon Perez» encuentra a «Juan Pérez»). Umbrales del estándar: ≥90 vincula, 60–89 propone el mejor candidato y <60 trata el registro como nuevo.
- **Carrito editable**: podés agregar registros a mano, duplicar o descartar tarjetas antes de crear; la preselección por confianza deja el % a la vista y **vincular no modifica la ficha existente**.
- **Verificación contra el texto**: si un dato no aparece en lo que pegaste (nombre, RUC/CI, teléfono, correo, montos), la tarjeta lo marca como «no está en el texto» en vez de crearlo en silencio.
- **Monedas y fechas**: PYG y USD se interpretan; una moneda extranjera no se lee como guaraníes (se pide carga manual) y las fechas relativas («hoy», «ayer», «dd/mm») se resuelven con el motivo visible.
- **Imágenes de confirmación**: clientes y equipos muestran logo/foto cuando el motor las resuelve, siempre con fallback seguro (una imagen que no sea https se descarta) y avisos por tarjeta.

### Finanzas

- **Cobros parciales o seña**: se puede registrar un monto menor al saldo del cliente; la diferencia queda pendiente y el resultado lo informa.
- **División en partes y cuentas**: un mismo cobro se reparte entre 2 y 10 cuentas con suma exacta, respetando los permisos y el aislamiento de siempre.
- **Método visible al confirmar**: la cuenta elegida muestra banco, número o alias, para que la confirmación sea sobre el dato real y no sobre un nombre suelto. Evidencia en `docs/qa/qa-ia-cobro-133/`.

## v1.0.161

### Operaciones

- **Alta de equipos más corta**: la primera pasada queda en **Básico** (nombre, cantidad, categoría, serie/IMEI, valor, moneda y ubicación) y el resto —foto, compra, depreciación, estado, custodio, adquisición y notas— vive en **«Más datos»**, plegado. En edición se abre solo si la ficha ya trae datos, así nada queda escondido de sorpresa.
- **Cantidad al crear (1–25)**: N copias idénticas con su propio código Scale OS (un registro por unidad reservable); con serie/IMEI la cantidad queda en 1 y el aviso lo explica. Si una unidad falla a mitad, la lista se refresca sin cerrar el diálogo, se avisa cuántas se crearon y la cantidad vuelve a 1.
- **«Guardar y agregar otro»**: guarda, deja el formulario listo para el siguiente (conserva categoría, valor, moneda, ubicación y estado; limpia lo único), avisa arriba qué se creó y reenfoca el nombre sin cerrar el diálogo.
- **Validación junto al campo**: el nombre es lo único obligatorio; los errores se muestran al lado (`role="alert"`) y si el error es de depreciación «Más datos» se abre solo.
- Evidencia en 390 y 768, claro y oscuro, en `docs/qa/alta-130/` (con verificación en Postgres de la cantidad creada).

## v1.0.160

### Operaciones

- **Barrido completo móvil/tablet y oscuro, sin hallazgos**: inventario (lista, búsqueda sin resultados, alta, ubicaciones y reservas), producción (tablero y nueva pieza), proyectos y estudio pasan las verificaciones a 390×844 y 768×1024: sin desbordes horizontales, acciones de 44 px en móvil, diálogos que atrapan el foco, Escape que devuelve el foco y validaciones visibles al enviar vacío.
- **Herramienta de verificación más estable**: el ensayo de arrastre/entrega de piezas queda sólido (custodia por empresa, pipeline vigente y sesión táctil), para repetir la medición sin falsos positivos.
- Evidencia en `docs/qa/qa-ola2-ops/`: 39 capturas (claro y oscuro) más el reporte del barrido con todos los chequeos en verde.

## v1.0.159

### Asistente «Carga con IA»

- **Textos largos, sin callejones**: el motor acota el razonamiento del modelo, ajusta el presupuesto de tokens al tamaño del texto y espera hasta 60 s; si la IA trunca la respuesta, lo dice claro («probalo en dos partes») y ya no entrega una vista previa incompleta.
- **Un reintento automático** cuando el proveedor devuelve una salida ilegible; recién si vuelve a fallar, el aviso propone dividir el texto.
- **Errores accionables por estado**: sin configurar, límite de análisis de la empresa (con los minutos de espera), sesión vencida, rol sin permiso, texto demasiado largo y proveedor ocupado — cada uno con su mensaje y su acción, sin jerga.
- **Monto interpretado en grande** antes de confirmar un cobro: el importe formateado, el cliente y la fecha en primer plano; si el monto parece fuera de escala, se avisa sin corregirlo solo.
- El RAT suma el procesamiento del proveedor con su política de reintentos (sigue como borrador a aprobar por el dueño).

### Comercial

- **Alta manual más directa**: el formulario de cliente suma RUC y razón social con las reglas compartidas del grupo (se acepta con puntos o espacios y se guarda normalizado; el dígito verificador nunca se inventa).
- **«Guardar y crear otro»**: carga en serie sin cerrar el diálogo — un solo guardado por cliente, aviso de «creado, podés cargar el siguiente» y formulario limpio.
- Evidencia del flujo en 390 y 768, claro y oscuro, en `docs/qa/alta-129/`.

## v1.0.158

### Comercial

- **El buscador del directorio vuelve a mostrar su texto guía**: la lupa ya no se monta sobre el placeholder en móvil ni tablet, y el área del botón recupera el tamaño táctil correcto.
- Barrido de la ola 2 en Clientes, Cuadrícula, Pipeline, Planes y Presupuestos (390 y 768, claro y oscuro, modales y estados vacíos) con evidencia antes/después en `docs/qa/ola2-com/`.

### Finanzas

- **Se terminan los desbordes horizontales** en Comisiones y Producción semanal a 390 y 768: las grillas pasan a una sola columna y dejan de empujar el contenido fuera de la pantalla.
- **Validación visible al registrar un cobro**: si falta la factura, la cuenta o el importe es cero, el formulario lo dice en el momento en vez de fallar en silencio.
- Evidencia del barrido (mora, previsión, informes, comisiones y modales) en `docs/qa/qa-fin-126/`.

### Plataforma y Equipo

- **Instalaciones nuevas con el esquema completo**: en una base recién creada ahora se aplican también las migraciones que todavía no entran en la cadena curada (antes quedaban pendientes para siempre); con el tracker de migraciones acotado al baseline real.
- **Historial legible**: los cambios de estado muestran etiquetas humanas (Activo, Completado, En revisión…) en vez del slug crudo, y el contador en cero se dibuja correctamente.
- **Permisos cómodos en tablet**: los interruptores de la matriz conservan un área táctil de 44 px también a 768.
- Evidencia del barrido (login, registro, Equipo, permisos, preferencias, papelera, actividades y superadmin) en `docs/qa/plt-qa2/`.

## v1.0.157

### Asistente «Carga con IA» (Fase 2)

- **El asistente cruza lo detectado con lo que ya existe**: cada registro llega como «nuevo», «coincide» (con la ficha real) o «ambiguo» (varios candidatos), mostrando las señales del match (RUC/CI, correo, teléfono, nombre). El cruce es local: **la base no viaja al proveedor**.
- **Vos decidís qué hacer con cada coincidencia**: vincular el registro a la ficha existente o crear un duplicado a propósito. Con coincidencia o ambigüedad no se crea nada hasta que haya decisión explícita.
- **Acciones propuestas**: si el texto dice que un cliente pagó, el asistente propone registrar el cobro (cliente, monto en guaraníes, fecha y detalle) y **solo se ejecuta con tu confirmación**, de a una.
- **El cobro usa el flujo real de Finanzas**: elegís la cuenta donde entró el dinero (se sugiere si hay una sola), el monto se reparte FIFO sobre las facturas con saldo y los **duplicados se avisan** con una segunda decisión antes de registrar.
- Sin cliente resuelto o sin cuenta de ingreso activa, la tarjeta lo dice y no deja confirmar; el texto pegado sigue sin persistirse.

### Accesibilidad

- **Contraste medido (ronda 13)**: chips y avisos en tono warn, botón primario, pie del riel y acciones con ícono quedan en AA sobre claro y oscuro, con tinta propia para los rellenos semánticos (`ok`/`bad`) en cada tema.
- **Guardas nuevas** en `tests/contrast-theme.test.tsx` que congelan los mapeos y evitan que un ajuste de paleta los rompa en silencio.
- La librería compartida del grupo queda fijada en **v0.59.0** (incluye los defaults y tokens de esta ronda).

## v1.0.156

### Asistente «Carga con IA»

- **Pegás un texto y el asistente propone**: el botón ✨ del topbar abre un diálogo donde se pega una lista, un correo o una planilla, y la IA devuelve clientes y equipos de inventario detectados para revisar antes de cargar.
- **Vista previa editable por tarjetas**: cada registro se puede corregir y trae sus avisos (datos dudosos o faltantes, recortes y registros descartados). Nada se crea sin confirmación explícita con «Crear todo».
- **La carga usa los endpoints de siempre**: mismos permisos por rol, mismo aislamiento por empresa y misma auditoría que el alta manual, sin atajos.
- **El texto pegado no se guarda**: no queda en la app ni en la base; solo se registra la transferencia al proveedor (modelo y conteos) en la bitácora de datos personales. El asistente se apaga solo si el servidor no tiene la clave configurada, con un aviso claro.
- **Configuración por entorno y límites**: proveedor/modelo/base configurables (por defecto Groq con `openai/gpt-oss-120b`), texto de hasta 20.000 caracteres, 25 registros por tipo, 30 s de espera y 10 análisis cada 15 minutos por empresa.

### Privacidad (Ley N° 7593/2025)

- **El proveedor de IA queda declarado como encargado** en la Política, el RAT y el inventario de encargados, con la finalidad, el alcance (solo el texto pegado) y la retención (nada): sigue como borrador a aprobar por el dueño.

## v1.0.155

### Privacidad (Ley N° 7593/2025)

- **La base de la ley queda en producción**: consentimientos verificables con la versión del aviso aceptada, pedidos de derechos (acceso, rectificación, supresión, oposición) con estados y vencimiento a 30 días corridos, bitácora de accesos a datos personales y política de retención con corrida de reporte y ejecución.
- **Panel de protección de datos en Configuración** (owner/admin): cola de solicitudes con vencimientos, verificación de identidad, resolución con la acción aplicada (copia, bloqueo o anonimización) y rechazo con motivo; consentimientos vigentes y revocación; retención declarada de solo lectura.
- **Nunca se borra lo que tiene conservación legal**: la supresión bloquea o anonimiza y conserva el historial fiscal y contable; el titular puede descargar su copia en JSON o CSV y los logs quedan barridos de datos personales.
- **Borradores legales y runbook de brecha**: Política, Aviso v1, ARSOP, RAT, encargados, seguridad y el procedimiento de brecha ≤72 h viven en `docs/`, todos marcados como borrador hasta que el dueño apruebe el texto final (el aviso público se muestra «en revisión»).

### Comercial

- **Minimización del contacto del cliente por rol**: quien no gestiona clientes recibe la ficha sin correo, teléfono, RUC ni notas, y la pantalla dice «Contacto reservado» en lugar de disfrazar el dato ausente; el buscador deja de prometer correo o teléfono.
- **Oposición al contacto**: las oportunidades suman «No contactar» visible y editable, el tablero ya no expone correos y el guardado viaja explícito.
- **Finalidad declarada donde se cargan datos de terceros**: alta y edición de cliente, captación de la landing y acceso del portal muestran el aviso con su enlace.
- **El token del presupuesto sale de las listas**: el enlace público solo se entrega con la acción explícita de compartir.

### Finanzas

- **Contrato de privacidad de Finanzas**: inventario de finalidades, retención declarada y rutas de export/anonimización alineadas al API, en `docs/FIN-PRIVACIDAD-7593.md`.
- **Comisiones con permisos finos**: cada rol ve lo que le corresponde y el contacto se enmascara por capacidad.
- **Avisos en los puntos de captura**: cuenta y plan, comisiones, previsión y cobros declaran para qué se usan los datos.

## v1.0.154

### Privacidad (Ley N° 7593/2025)

- **Aviso de Privacidad versionado y público**: la app publica la ruta `/privacidad` con versión y fecha, enlazada desde el pie, el registro y las invitaciones; mientras el dueño no lo apruebe el documento se muestra marcado como «en revisión».
- **Consentimiento informado sin premarcar**: el alta de cuenta y las invitaciones explican para qué se usan los datos y registran la versión del aviso aceptada; la casilla nunca viene marcada sola.
- **«Mis datos» en el perfil**: cada persona puede pedir su copia, rectificar, suprimir, oponerse y revocar consentimientos, viendo el estado y el vencimiento (≤30 días) de cada pedido. Como la base del API todavía no está publicada, la vista lo dice con todas las letras y deriva al canal de derechos real, sin inventar estados ni pedidos resueltos.
- **El contacto de clientes se enmascara por rol**: correo, teléfono y RUC se muestran parcialmente a los roles sin permiso, y el dato completo ni siquiera llega a la pantalla. El portal del cliente suma el acceso al aviso y al canal de derechos.

### Operaciones

- **Inventario de finalidades y retención**: documento `docs/pdp/OPS-finalidades.md` que ordena dato → finalidad → base legal → retención de producción, proyectos, estudio e inventario; alimenta el RAT y la política de retención de la base de privacidad.
- **Correo interno según rol**: responsables, integrantes y autores de comentarios solo exponen su correo a quien corresponde; el resto ve nombre y foto.
- **Evidencia y orígenes anonimizados**: capturas, fixtures del harness visual y la importación de Trello quedan sin personas, tableros ni correos reales, con una guarda de test que lo fija.
- **Sello de verificación y listas**: el sello de verificación trunca dentro de su celda (sin desbordes) y las proyecciones de reservas dejan de pedir campos que ninguna pantalla lee.

## v1.0.153

### Operación interna

- **Comando `xx` (estado x/100)**: el kit del grupo documenta el reporte que resume cuánto de lo pedido está hecho (%), qué está en vuelo (agentes, ramas y el `hd` automático), qué quedó pendiente y qué espera decisión del dueño.
- La política del vigía queda actualizada en `COMANDOS.md`: el reporte `xx` incluye si el ciclo automático está corriendo, pausado o cuál fue el último disparo.

## v1.0.152

### Arranque y carga

- **La pantalla de carga dura lo que tarda la identidad**: el shell pinta apenas se resuelve el acceso y los datos llegan en paralelo, con esqueletos por bloque. Medición a 1440: 618–2282 ms → 155–311 ms; en móvil, 1223–2649 ms → 168–208 ms.
- **Bloques honestos mientras carga**: los KPIs muestran esqueleto (sin cifras), el encabezado de Clientes dice «Cargando el directorio…» en vez de «Clientes · 0» y el contador de Proyectos no se dibuja hasta tener datos.
- Evidencia con tablas y capturas antes/después en `docs/qa/arranque-dsn/`.

### Rendimiento y medios

- **Fotos y logos como URL cacheable**: la API sirve las identidades de cada listado como URL de medio con ETag/304 y caché privada, en vez de repetir base64 (Equipo 162 KB, responsables de proyectos 362 KB y presencia 80 KB se dejan de duplicar en cada respuesta).
- **El front acepta la URL interna** de medios, así las identidades siguen mostrando la foto y no caen a iniciales.
- **Medición con volumen producción-like** (320 clientes, 80 proyectos, 1580 piezas, 6852 filas de auditoría) y compresión real del proxy; método, hallazgos y comparativa en `docs/qa/carga-prod/`.

### Equipo

- **Vista Lista con nombre completo**: la plantilla prioriza la columna Persona y el cargo es el que cede espacio; los nombres dejan de cortarse con puntos (9 de 9 cortados antes, 0 de 9 después). Evidencia en `docs/qa/equipo-nombres/`.

## v1.0.151

### Fotos y perfiles

- **Un solo objeto de foto** en toda la app (perfil, Equipo, comentarios, actividad, presencia, riel y portal): tamaños y formas canónicos, iniciales cuando falta o falla, y recorte manual solo si el usuario lo pide.
- **La subida guarda la foto completa**: se termina el recorte cuadrado automático (las fotos verticales perdían la cabeza); el encuadre inicial no hace zoom y el usuario ajusta si quiere.
- **Avatares de persona con encuadre superior** (cabeza visible) en comentarios, actividad, Equipo, presencia, perfil y riel; los logos de cliente y el visor ampliado no cambian.
- Si un enlace de foto falla y se vuelve a guardar, la imagen se reintenta sola. Evidencia en `docs/qa/fotos-perfil/`.

### Plataforma

- **Ventanas en listas largas**: Actividad carga de a 20 filas (4,4 KB en vez de 21,6 KB), la Papelera pagina e informa total y tipos, el Historial suma el total y el panel global informa total/`hasMore` con «Ver más» por colección (contrato aditivo).
- **Medición de la carga inicial**: TTFB, peso y llamadas por pantalla y ancho, reproducible; la propuesta de recortes deja a las fotos como data URL como el 75% del peso inicial.
- El padding del panel global queda como regla explícita.

### Sistema (CSS)

- **Restaurada la base que un comentario sin cerrar descartaba** desde el 23-sep: la tarjeta (`.panel`), `metric`, `text-button`, `work-card` y compañía vuelven a publicarse, y las superficies fuera del shell (páginas de error, panel global) recuperan su padding.
- **Guarda nueva** (`tests/css-comments.test.ts`): comentarios CSS cerrados, sin reglas adentro y reglas base presentes; la regla quedó documentada en `AGENTS.md` y `DESIGN-SYSTEM.md`.

## v1.0.150

### Comercial

- **Listas con ventana y contador honesto**: Clientes, Presupuestos, Pipeline y Leads cargan por tramos con «Ver más» («Mostrando 60 de 420 presupuestos»); los indicadores siguen representando el total.
- **Menos peso y menos filas montadas**: la lectura viaja proyectada (clientes 288 KB → 35 KB con ventana; presupuestos 103 → 14 KB) y se montan clientes 420 → 120, presupuestos 420 → 60 y pipeline 300 → 120 tarjetas.
- El API suma `?limit`/`?offset` de forma aditiva (sin `limit` nada cambia), con total exacto y `hasMore` estable.

### Operaciones

- **Inventario compacto**: tarjetas unificadas (foto de 56 px, serie y valor en una fila, «Sin serie»/«Sin valor» explícitos, acciones en un pie común); la tarjeta pasa de 434/324 a 252/232 px.
- **Lista y ubicaciones alineadas**: columnas reales por breakpoint (1/2/3) sin cortes, encabezados de altura fija con contador y «aquí desde» como dato secundario.
- **Ubicaciones ordenables**: el dueño elige el orden de guardado (mover antes/después) y se respeta en el pipeline y en la lista; las ubicaciones nuevas van al final.

### Equipo y plataforma

- **Personas compactas**: cabecera y metadata en chips, correo como dato secundario, «Acceso habilitado» una sola vez, remuneración en chips y acciones al pie, sin espacios vacíos; toolbar en una fila y tabs compactos.
- **La vista Lista/Cuadrícula se recuerda** por navegador en Equipo.
- **Eliminar del equipo (definitivo)**: los integrantes con acceso retirado se purgan con basurero y confirmación; el historial se conserva y una nueva invitación los reactiva.

### Administración global

- **Los borrados globales vuelven a funcionar**: la base rechazaba las acciones del panel (`platform.user.delete`/`platform.agency.delete`); una migración lo habilita conservando la confirmación reforzada, la auditoría y la protección de cuentas demo.
- **Cupones**: el botón de alta no envuelve en el rediseño de la consola.

## v1.0.149

### Administración global

- **Consola operativa en vez de scroll largo**: encabezado compacto y barra de secciones (Resumen · Agencias · Cupones · Accesos · Auditoría) con contadores; el Resumen trae KPIs, agencias por vencer y últimas acciones derivadas de los datos ya cargados.
- **Listas con la toolbar del sistema** (búsqueda + filtro + contador) y tablas densas; el alta de cupones queda en una fila flexible.
- **Estados como filas de una línea** con el detalle en tooltip, chip de rol y hora de actualización en 24 h; carga inicial con la pantalla de carga de la app.
- **Se conservan todas las capacidades**: endpoints, gates de rol (viewer sin mutaciones), confirmación con re-autenticación, auditoría con filtros y borrados globales.
- Evidencia: `docs/qa/admin-redesign/` (30 capturas 1440×900 / 390×844, claro, oscuro y alto contraste).

### Comercial

- **Selección masiva contextual**: la barra de lote aparece recién con algo seleccionado (Clientes gana una fila visible al pliegue).
- **Presupuestos**: tabla densa desde 1280 (12 filas visibles; antes 4 tarjetas), título y cliente en una línea y abrir como icono con tooltip exacto.
- **Pipeline sin embeber Métricas** (chip «Captación digital» + «Ver Métricas» por la navegación del shell) y totales por etapa en cada columna con una sola derivación.
- **Planes y Resumen sin redundancias**: ítems del comparador en una línea con el detalle en tooltip y sin KPIs ni CTA duplicados.

### Finanzas

- **Transferencias en 3 columnas** sin scroll horizontal permanente; las explicaciones largas pasan a tooltip.
- **Mora**: la segunda franja de KPIs se reemplaza por chips de antigüedad y «sin factura» (−128 px antes de la lista).
- **Previsión**: pares de tarjetas en 2 columnas ≥1440 con tablas compactas y una sola rama según el ancho medido.
- **Informes y Comisiones**: exportaciones en el header, ayudas en el acordeón «Cómo leer el informe» y secciones en subtabs con contador.

## v1.0.148

### Sistema y escritorio

- **Sistema de densidad compartido**: el ritmo del shell —márgenes laterales (16/24/32), separación de secciones, alto mínimo de tarjeta (120 px) y separación de controles (8/12)— vive en tokens del sistema, no en medidas sueltas por pantalla.
- **Un solo título por pantalla**: el encabezado deja de repetir el título cuando el shell ya lo muestra, y cada página conserva su nombre accesible.
- **Selección contextual**: la barra de lote del sistema aparece solo con elementos seleccionados, en una línea, y «Seleccionar visibles» vive en la barra de herramientas; los diálogos ajustan su cabecera y el pie solo existe cuando hay acciones.
- **Biblioteca a v0.53.0** (reglas §17 y arreglo de CI), sin cambios de código en la app.

### Operaciones

- **Producción, Proyectos y Estudio sin redundancias**: la tarjeta deja de repetir la etapa y la línea de auditoría, los enlaces/horas/pasos pasan a una fila de metadatos y se retiran las alturas artificiales de 200 px.
- **Responsables en una línea**: el objeto compartido de responsables deja de ser una caja apilada; cuando no hay dato, se muestra texto auxiliar.
- **Inventario y Estudio**: calendarios con celdas de 56 px en escritorio y encabezado en una fila con el mes en línea; las notas del espacio se recortan con salida.
- **Medición**: el primer dato sube hasta 157 px en Producción (4 columnas) y las cinco pantallas muestran contenido real sin scroll; evidencia en `docs/qa/densidad-ops/`.

## v1.0.147

### Sistema (marco)

- **Encabezado, KPIs y filtros compactos**: en escritorio el título de página ocupa una sola fila (56 px), los KPIs quedan en una franja de ~112–140 px y las barras de filtros van en una fila; en mobile cada control conserva sus 44 px.
- **Tabs de sección en una barra fina** con scroll horizontal y una sola hoja de estilos para todo el shell (se retiran las reglas legadas).
- **Auditoría y evidencia por pantalla**: desvíos medidos con el harness y capturas antes/después en `docs/qa/compact-sistema/`.

### Comercial

- **Clientes**: encabezado en una línea, resumen auxiliar y KPIs en franja, sin perder el contrato denso de la lista.
- **Resumen, Pipeline, Métricas, Presupuestos y Planes** muestran la información clave antes del pliegue, sin quitar filtros, totales ni acciones.
- Evidencia antes/después en `docs/qa/compact-com/`.

### Operaciones

- **Inventario**: fila única sin la mega-tarjeta, chips de atención y el listado sube más de un tercio.
- **Proyectos, Producción, Estudio e Historial**: barras en una fila y más contenido visible, sin romper el tablero arrastrable.
- Evidencia en `docs/qa/compact-ops/`.

### Finanzas

- **Finanzas**: la franja «Salarios» sube junto a los KPIs y las tarjetas de cuenta dejan de ocupar 200 px de alto.
- **Mora, Previsión, Informes y Comisiones**: mes, horizonte y filtros viven en el encabezado y la información clave aparece antes.
- Evidencia en `docs/qa/compact-fin/`.

### Equipo y plataforma

- **Equipo**: cabecera compacta, franja de facturación con el KPI compartido y barra de controles en una fila (la barra de lote deja de verse como tarjeta vacía).
- **Configuración, Preferencias, Papelera, Invitaciones, Permisos, Actividad y Superadmin**: menos títulos repetidos, tipo de registro como chip y vacíos compactos.
- Evidencia en `docs/qa/compact-equipo/` y `docs/qa/compact-plt/`.

## v1.0.146

### Finanzas

- **Panel «Salarios» en Finanzas**: el gasto esperado del personal al cierre del mes, con una tarjeta por moneda (esperado al cierre y colaboradores incluidos); sale del mismo contrato y hook que la Previsión, sin recálculos propios.
- **Estados completos**: cargando, error con reintento, vacío con acción («Ver equipo») y lleno; si el API no trae el dato, se muestra «—» en vez de un número inventado.
- **«Ver más» hacia la vista completa**: Salarios abre la Previsión y Cobros pendientes abre Mora, sin duplicar datos en la pantalla.
- **«Personal proyectado» ahora se llama «Salarios»** en la Previsión, con sus títulos y etiquetas de accesibilidad de escritorio y móvil.
- **Fotos completas**: los avatares de la lista de Salarios se dimensionan a 32 px (34 px en mobile) y dejan de recortarse; las iniciales caen en el mismo círculo.

## v1.0.145

### Librería y sistema de diseño (owncoding-ui v0.51.0)

- **Pie institucional único**: el mismo pie (copyright, versión real y “Desarrollado por Owncoding” con enlace) en panel, pantallas de acceso, páginas públicas y tokenizadas; una sola pieza, sin copias locales.
- **Bandeja de avisos oficial**: la campana con contador, panel, estados y vacío con acción sale del objeto compartido; la app conserva solo sus datos y preferencias.
- **Alto contraste y aviso de versión**: tercer tema accesible, y el aviso de “versión nueva” compara contra el API y ofrece recargar. El estado del sistema queda a un clic desde la ayuda del panel.
- **Adopción de las reglas §14–§16** del marco en las cuatro superficies y en las verticales, con el retiro del parche CSS de la librería y su instalación limpia desde el pin fijo.

### Comercial

- **Clientes sin “lista vacía” falsa**: si la lectura falla se ve el error con reintento y, si había datos, se avisa que no se pudieron actualizar.
- **Archivo en lote con confirmación**: informa cuántos clientes entraron y deja el error a la vista en el diálogo si algo falla.
- **Métricas y Pipeline con estados reales**: cargando, error con reintento y vacío con acción; las tarjetas no inventan monto ni probabilidad.
- **Mensajes en español paraguayo**: los fallos de conexión y de servidor dejan de mostrar jerga técnica.

### Operaciones

- **Planificador honesto**: esqueleto mientras carga y error con reintento, en lugar de un vacío falso.
- **Lotes contados por su respuesta**: las reservas del estudio informan cuántas entraron y cuántas faltan; lo que falla queda seleccionado.
- **Inventario y Estudio**: el error de una acción se avisa sin tapar el catálogo o el calendario, y la lista de pendientes tiene tope con aviso.
- **Vacíos con salida y microcopy es-PY**: los estados vacíos ofrecen la acción siguiente y “Checklist” pasa a “Pasos”.

### Finanzas

- **Mora e Informes sin datos fingidos**: la carga se ve, el error ofrece reintento y el DSO fallido lo dice en vez de mostrar “Sin datos”.
- **Acciones de dinero con confirmación reforzada**: cancelar comisiones o revertir descuentos y gastos explica el importe y la consecuencia antes de ejecutar.
- **Fechas y montos con una sola fuente**: la app delega en la librería y en el formateador único, sin cuentas paralelas por pantalla.

### Equipo y plataforma

- **Avisos de envío canónicos (API)**: encolado, enviado, duplicado y fallido, con la bandeja como única fuente del correo; sin relay configurado el envío queda en cola y nunca se marca “enviado”.
- **Correos con cierre y firma**: motivo, acción con enlace de respaldo, cierre es-PY y firma del producto con crédito del grupo.
- **Rutas legadas en una sola fuente** y página de estado con el correo comprobado contra el API, no por suposición.

## v1.0.144

### Operaciones

- **Sin “foto anterior” al reentrar al tablero**: mientras el shell relee clientes y proyectos, las tarjetas de Producción y de Proyectos muestran iniciales en vez del logo/color viejo; la identidad aparece recién con el dato fresco.
- **Identidad invalidada al editar**: al guardar cambios de un cliente o proyecto, la copia en memoria se expira y la próxima visita relee la identidad en lugar de reusar la anterior.

## v1.0.143

### Superadmin (panel global)

- **Rediseño sobre el sistema v2**: header sticky con tokens del tema, KPIs compartidos (agencias activas, usuarios, cupones y suscripciones con su distribución) y paneles del sistema; se retiran las tarjetas propias, la tira de señales y las “zones” heredadas.
- **Listas densas compartidas**: agencias, cupones, accesos y auditoría pasan a la grilla del sistema con columna de acciones fija y vista tarjeta cuando la tabla no entra; fechas y montos con los formatos compartidos y un único chip de estado.
- **Avisos y errores**: los resultados de cada acción usan el sistema único de notificaciones (2–3 s) y los errores de confirmación quedan inline en el diálogo, no como toast.
- **Accesibilidad y mobile**: filas al contrato 44–52 px, targets de 44 px en móvil, contraste AA medido (el micro-rótulo oscuro sube de 3,77 a 5,57) y sin scroll horizontal a 390 px.

### Navegación

- **“Panel” y “Volver al panel” con destino determinista**: el enlace sale del origen de la app (configurable con `NEXT_PUBLIC_APP_ORIGIN`) en vez del hostname del navegador; se termina el clic que volvía al mismo panel en el host admin y el HTML del servidor coincide con el hidratado.

## v1.0.142

### Comercial

- **Lista de Clientes más fina**: las pistas del contrato denso entran ya en 1440 (antes la vista lista caía en fichas de 200 px y parecía cuadrícula); la fila queda en el piso del contrato (44 px) con separadores suaves, datos a 11 px y acciones discretas de 28 px (WhatsApp icon-only). La cuadrícula no cambia.
- **Cobros en una línea**: chip y monto comparten fila; si un monto extremo no entra, baja alineado a la derecha en vez de pisar la columna siguiente.
- **Ficha de la vista lista**: datos en línea con detalle al pasar el cursor en escritorio y orden de fila real desde 1280; en el celular conserva el apilado táctil con áreas de 44 px.
- **Nombre único**: el apartado de Pipeline dice “Pipeline” en todos lados (se retira “Oportunidades”/“comercial” del código).

### Navegación

- **Flujo arranca por Producción**: el grupo queda Producción · Pipeline · Clientes · Presupuestos · Proyectos. Por la regla del encabezado navegable, el clic en Flujo abre `/produccion` y Pipeline sigue como segunda hoja (`/pipeline`). Los redirects históricos no cambian.

## v1.0.141

### Operaciones

- **Barra compacta de Producción**: la toolbar operativa del tablero ocupa menos espacio y queda alineada al rediseño.

### Sistema y formularios

- **Fechas y avisos de vencimiento propios**: formateo de fechas y tono de vencimiento con implementación estable de la app.
- **Envío único propio**: el guardado de un solo disparo vuelve a ser de la app, evitando dobles envíos y regresiones del puente.

## v1.0.140

### Librería y sistema de diseño

- **Segunda fase de adopción de owncoding-ui v0.39** en las cuatro verticales: montos con caret, ciclo de guardado compartido, fechas y vencimientos, seriales, overlays y utilidades (RUC, token de enlaces).
- El **chip de estado de acceso** usa el objeto de la librería con tokens AA; se retiran colores hardcodeados en Equipo.
- Queda documentado el shim temporal de tipos y los gaps pedidos a la librería (`Label.htmlFor`, `SegmentedField`, estados de chip faltantes, `hoyClave` con zona y `normalizarSerial` público, entre otros).

### Comercial

- **Montos con caret en toda la vertical**: tipear `12345678` se ve `12.345.678` y el cursor sigue al dígito insertado; el pegado en formato es-PY/en-US se interpreta bien.
- **Fechas y RUC compartidos**: mora y próximas entregas de Clientes, vigencia de Presupuestos y rango de Métricas usan el formato y el tono de vencimiento de la librería; el RUC usa su validación/normalización.
- **Guardado**: el compositor usa el envío único de la librería y el ciclo `completeSave` compartido avisa solo si falla el refresco.

### Operaciones

- **Inventario, Estudio, Proyectos y Producción** adoptan fechas/vencimientos, seriales enmascarables, montos con caret (valor, compra, residual y mantenimiento) y overlays con foco y estado pendiente.
- Los drawers y confirmaciones pasan al contrato compartido (9 diálogos de Inventario, reservas de Estudio y detalle de Proyecto).

### Plataforma

- **Equipo**: estado de acceso con `ChipEstado` (activo, pausado, anulado, pendiente) y avisos de la librería.
- **Perfil**: fechas de sesiones en zona Asunción con 24 h; errores con `Aviso`.
- **Configuración**: avisos con tono éxito/error y filas de integraciones al contrato 44–52 px.
- **Superadmin**: tarjetas sin contenido recortado, filas al contrato y fechas con zona de la empresa.

### Marco

- **Sin FOUT en la carga**: preload de Outfit y DM Mono latin + `font-display: optional`; la marca ya no cambia de tipografía a mitad de carga (0 px de salto medido en Slow 3G).

## v1.0.139

### Marco y sistema visual

- **Layout compartido más compacto**: ajustes del shell y de las primitivas v2, con el contrato del encabezado del espacio de trabajo cubierto por test.

### Comercial

- **Vista de Clientes**: título y contador en su propia fila cuando el riel acota el ancho (contador sin cortar palabras) y controles de vista alineados al patrón compacto.

## v1.0.138

### Finanzas

- **Buscadores de la librería** en Finanzas (Cobros pendientes) y Mora: lupa, botón de limpiar y `aria-label` del campo compartido, con target de limpieza de 44 px en mobile.
- **Hallazgo para el sistema**: el CSS base de la app pisa el padding de los `Input`/`SearchField` de la línea v2 (la lupa se montaba sobre el texto); FIN lo compensó por uso y queda para DSN resolverlo en la base, porque afecta a todas las verticales.
- **Auditoría de adopción FIN documentada** (con capturas antes/después): quedan listos `MoneyInput`, overlays con `useDialogPending`, fechas y `Vencimiento`, `SectionState`, `PercentField` y los chips AA para la próxima pasada.

## v1.0.137

### Superadmin

- **Centro de control rediseñado**: cabecera de comando con estado del centro y pulso, zona de **flota** (agencias) y zona de **gobernanza**, tablero de señales y tarjetas de métricas.
- Riel interno de navegación, títulos por zona y badge propio: el panel global queda compacto y organizado por secciones.

## v1.0.136

### Plataforma

- **Publicación del front corregida**: el build de la web fallaba porque el parche de la librería se ejecutaba antes de copiarse al contenedor; se corrigió el orden y este release publica el rediseño y la fundación owncoding-ui v0.39 (contenido de v1.0.135), que hasta ahora solo había llegado a la API.

## v1.0.135

### Librería y sistema de diseño

- **Salto a owncoding-ui v0.39**: la app queda pinneada al paquete nuevo (con tipos propios incluidos) y se retiran los parches locales de bordes; un parche temporal de postinstall corrige un comentario CSS roto en la librería (reportado upstream) hasta el tag corregido.
- **Contraste AA de chips**: la familia de textos de estado (`ok`, `warn`, `bad`, `info`, `fono`) pasa a tokens propios en claro y oscuro; medido en la app, “Activo” sube de 4,27 a **5,24:1** y “En mora” de 4,47 a **5,10:1**. El chip de estado es ahora un envoltorio fino del `Badge` de la librería, sin parches locales.
- **Bordes de control** con el token interactivo nuevo (≥3:1 en ambos temas), incluidos los controles outline y las acciones de ícono.

### Operaciones

- **Vida útil y serial compartidos**: la barra de vida útil del equipo usa el objeto de la librería (con `progressbar` y valor accesible) y el alta/edición de seriales usa el campo compartido (capitalización y corrección automáticas, con el normalizador de Scale OS inyectado).
- **Nombre del verificador** sale del helper compartido `primerNombre` (se retira el duplicado local).
- El contrato de Inventario vuelve a la cadena de release (contador “N de M equipos”, catálogo y reservas por `dataFetch`, proyección `?fields=`).

### Plataforma y acceso

- **Verificación e invitación**: el token se extrae del enlace completo con el helper de la librería (se retira el parseo manual con `URLSearchParams`), con test de adopción ampliado.
- **Fase 1 documentada**: quedan auditados los puntos de import por vertical (montos con caret, modales, fechas, lotes y chips de negocio) para completar la adopción en la próxima pasada.

## v1.0.134

### Rediseño de espacios operativos

- **Producción**: las tarjetas destacan **Recursos** y **Capacidad** (con “Sin enlace” / “Sin horas” cuando falta el dato), checklist y “Ver detalle” para la descripción larga; el tablero conserva 4 etapas completas por página con flechas.
- **Inventario**: nueva fila de **Atención** (valor faltante y control físico pendiente, con el criterio “30 días o sin registro”), toolbar compacta de una línea y tarjetas con checkbox de 44 px en móvil.
- **Estudio y Proyectos**: tarjetas de reserva propias en móvil (título y estado, espacio y tipo, fechas, proyecto, responsables y acciones), calendario por celdas de día y tarjetas de proyecto con identidad del cliente, fechas/piezas y responsables.
- **Finanzas, Informes y Previsión**: jerarquía por bloques en cards (período y moneda, comparativa, KPIs, evolución) con las tablas anchas scrolleando dentro de su riel.
- **Configuración y Perfil**: settings compactos en dos columnas en escritorio y editor de perfil plegado que se monta al desplegar (sin acciones huérfanas).
- **Superadmin**: panel global reorganizado por secciones, con agencias en ledger, cupones y suscripción en tarjetas.
- Ajustes compactos de toolbar en Clientes, resumen de Pipeline y buscador en anchos de escritorio.

### Correcciones de la verificación visual (#74)

- **Informes**: sin scroll horizontal del documento en escritorio/tablet; la tarjeta vuelve a una columna y la tabla scrollea solo en su riel.
- **Previsión**: el selector de horizonte (1/3/6/12 meses) llega a 44 px en mobile.
- **Estudio, Inventario y Producción**: el selector de mes ya no corta el año en mobile (el texto entra completo).
- **Perfil y Configuración**: “Guardar nombre” deja de aparecer con la sección plegada, el “Manual de la aplicación” llega a 44 px y los tests de Perfil vuelven a la cadena de release.

## v1.0.133

### Comercial y Resumen

- **Responsables sin fotos en la ventana de Resumen**: el shell pide los nombres livianos de los responsables (`assignee_names`) en vez de las fotos incrustadas; con 300 órdenes la carga pasa de ~3.417 KB a **129 KB**, sin perder nombres en el buscador ni en el planificador.
- **Alertas de vencidos exactas**: se piden directo al endpoint de vencimientos (`?due=overdue`, 30 por página) en vez de depender de la ventana visible, para todos los roles.
- **Cierre contractual**: tests que verifican que cada proyección del front existe en la lista blanca del API y que la ventana de Resumen no arrastra imágenes base64; verificador de producción re-ejecutable (`verify-prod-com.mjs`).

### Operaciones

- **Formularios de diálogo que no guardaban**: los botones de guardar de la librería (Equipo, Inventario, Estudio y otras verticales) ahora se asocian al formulario del diálogo y el envío funciona; con test de regresión.
- **Proyección de estudio corregida**: la lista de espacios deja de pedir campos que el API no expone (adiós al 400 con fallback) y el flujo de reserva se verificó de punta a punta en producción.

### Navegación y plataforma (verificado en producción)

- El encabezado de grupo navega a su primer módulo (Flujo → Pipeline, Recursos → Inventario, Finanzas → Finanzas) también en producción, en claro/oscuro, riel colapsado y drawer móvil; el acceso a Administración queda oculto sin `platform_role` y el bundle desplegado contiene el gate.

### Finanzas (verificado en producción)

- **Informes**: una sola llamada (`months=12&previous=1`), sin duplicados, con el rango y el período anterior completos; el mensaje “sin comparación” es honesto para la demo.
- **Cobros**: la ventana trae 20 con “Ver todos”, y el histórico completo (77 en la demo) carga en una sola llamada sin duplicados.

### API y medición

- El banco de TTFB imprime filas, ids y forma por candidato (deterministas por semilla) y suma modo `--verify` (39/39 chequeos) que falla si el contrato se rompe; los payloads por defecto quedan idénticos antes/después.

## v1.0.132

### Navegación

- **El encabezado de cada grupo del menú ahora navega**: un clic en Flujo lleva a Pipeline, en Recursos a Inventario y en Finanzas a Finanzas, dejando el grupo expandido y el módulo activo marcado; los grupos de un solo módulo (Resumen, Configuración) siguen igual.
- **El grupo activo conserva el acordeón**: un clic expande o contrae sin cambiar de ruta, y el encabezado navegable muestra «Grupo · Módulo» en el tooltip (el activo, «Grupo · Módulo activo»).
- **En el celular**: navegar desde el encabezado del drawer lo cierra, igual que al tocar un enlace.

## v1.0.131

### Resumen

- **Carga mucho más liviana**: la pantalla pide una ventana de 300 órdenes con los campos que el buscador, las alertas y el planificador usan de verdad: la llamada baja de 613 KB a 149 KB (−76 %) y de 60 KB a 7 KB de red (−88 %); el arranque de Resumen pasa de 18 a 13 ms.
- **Conteos exactos**: los chips de “Piezas por etapa” y el KPI “En revisión” salen del resumen del servidor (todas las órdenes), no de la ventana visible.

### Operaciones

- **Inventario y Estudio piden solo lo que dibujan** (`?fields=`), con vuelta automática al payload completo si el API no acepta la proyección: el catálogo completo de inventario pasa de 2.563 KB a 855 KB y a 11 KB cuando además se pide una página de 50.
- **Casilla de la grilla de inventario a 44×44 en el celular** (antes 31×44), pareja con la fila y el resto de las listas.

### Comercial

- **Pipeline y Presupuestos** ya mandan proyecciones de oportunidades y presupuestos (con encendido automático y fallback): la lista de oportunidades baja de 169 a 110 KB y la de presupuestos de 151 a 71 KB; con página de 50, a 8 KB.
- **Contrato optimista**: si el API rechazara una proyección, la lista vuelve sola al payload completo en esa sesión, sin romper la pantalla ni ocultar otros errores.

### Velocidad del API

- **Proyección con lista blanca**: `?fields=` valida los campos (responde 400 si no existen, `id` siempre presente) y `?limit=` pagina con `hasMore`; aplicado a inventario, reservas de inventario, espacios y reservas de estudio, oportunidades y presupuestos, manteniendo la ficha puntual completa.
- Medición con la misma semilla y banco opt-in: reservas de inventario de 1.242 KB a 5 KB con página de 25; reservas de estudio de 467 a 205 KB.

### Diseño y plataforma

- **Bordes de control con contraste ≥3:1** en ambos temas (el token oscuro pasa a `#867493`), incluidos los controles outline de la librería; el pie del shell gana área táctil de 44 px en móvil y Recursos queda ordenado `Inventario · Estudio · Equipo`.
- El contraste pendiente de los chips (4,09–4,47:1) quedó reportado a la librería con propuesta de tokens (`owncoding-ui#5`), sin forkear el objeto.

## v1.0.130

### Marco y sistema visual

- **QA de la ola 2 publicada**: criterios comunes de móvil/tablet, modo oscuro, modales, formularios largos, foco y “reducir movimiento” (con evidencia por dominio).
- **Nav más legible en oscuro**: el grupo activo del riel usa pill translúcido y texto/blanco (antes mezclaba el tono viejo y quedaba en 1,27:1); el toggle de tema y el selector de empresa llegan a 44 px en el celular y el marco apaga animaciones con “reducir movimiento”.
- **Tablas densas con una sola primitiva**: `ListActions` + `pinnedActions` (columna de acciones fija, encabezado por encima, fondo por superficie) y `useDenseTableFit` como medidor común; se retiraron las variantes por vertical (COM migró Clientes y Presupuestos).

### Comercial

- **Clientes y Presupuestos** quedan sobre la primitiva común: acciones siempre visibles, vista tarjeta cuando la tabla no entra y sin scroll horizontal en móvil/tablet; los vacíos usan el CTA canónico.
- **Compositor de presupuestos más liviano**: pide solo id y nombre de clientes para las opciones del select.

### Operaciones

- **QA móvil**: Estudio sin scroll horizontal, checkboxes y targets parejos en Inventario y Proyectos, y el contraste del harness deja de contar bordes de ancho 0.
- **Menos payload**: las pantallas OPS piden proyecciones de clientes y proyectos (el chrome del buscador y las tarjetas), conservando la ventana del buscador y sin arrastrar fotos de asignados.

### Finanzas

- **Informes en una sola llamada**: se reemplazaron las dos consultas (período actual y anterior) por una ventana de 13 meses; el dibujo y el PDF no cambian.
- **Cobros con ventana**: la lista de Finanzas pide los últimos cobros y “Ver todos los cobros” completa el histórico a demanda (antes traía todo de una).
- **QA ola 2**: overflow, targets, filas y foco del modal de cuenta corregidos; el chrome proyectado de Finanzas/Mora/Informes/Previsión/Comisiones recorta ~300 KB por navegación.

### Plataforma y acceso

- **Targets táctiles**: el toggle de tema del login y los 27 switches de Roles y permisos llegan a 44 px en móvil (escritorio igual que antes).
- **Shell proyectado**: las secciones de plataforma piden el chrome mínimo de clientes/proyectos y el prefetch de cuentas se movió de Equipo a Comisiones/Finanzas (deja de calentar datos que no se usaban).

## v1.0.129

### Navegación

- **Menú en 5 grupos**: Resumen · Flujo (Pipeline, Clientes, Presupuestos, Proyectos, Producción) · Recursos (Inventario, Equipo, Estudio) · Finanzas (Finanzas, Informes) · Configuración. Se despliega solo el grupo del módulo activo y el ítem activo marca también a su grupo; las rutas y los apartados (Métricas, Planes, Mora, Previsión, etc.) siguen igual.
- **Riel colapsado más claro**: un ícono por grupo con tooltip que suma el módulo activo (“Flujo · Clientes”), sin hojas ni flechas; en el celular el drawer abre el grupo del módulo en el que estás.
- **Guía del panel contextual**: deja de repetirse en cada página; queda como ayuda en la barra de utilidades y la tarjeta “Primeros pasos” sigue en Resumen.

### Plataforma y acceso

- **Acceso directo a la administración**: quien tiene `platform_role=admin` (validado por el servidor, sin correos fijos) ve “Administración de Scale” encima de su perfil y abre el panel global en pestaña nueva; el resto no lo ve. En el riel colapsado queda como ícono de 44 px con tooltip.
- **Contrato verificado y documentado**: `/api/auth/me` expone `platform_role` (admin / viewer / ninguno) y el correo del dueño queda como admin inicial en cada arranque; otorgar o revocar desde Superadmin se refleja al siguiente refresco de identidad.

## v1.0.128

### Arranque y carga

- **Una sola pantalla de carga**: se retiró el orbe que giraba sobre el logo; queda la marca estática con la identidad (nombre/rol/avatar) y la barra de progreso debajo del nombre, también en la variante sin sesión. Con “reducir movimiento” la barra se apaga.
- **Esqueletos en las secciones**: al abrir una sección cuyo código todavía está bajando se muestra un esqueleto sobre el panel, en vez de una pantalla en blanco (notorio en el celular).
- **Arranque más liviano**: la presencia deja de pedir datos de proyectos en paralelo y cada 30 segundos, y el shell se limpia de cargas duplicadas; Resumen pasa de 14 a 13 lecturas de arranque.

### Estabilidad

- **Resumen ya no se rompe con datos incompletos**: la búsqueda normaliza valores ausentes o nulos y los avisos de vencimiento toleran campos faltantes (“Sin nombre”, fecha vacía) sin cambiar la agrupación ni el orden; una respuesta parcial del API tampoco voltea la pantalla.

### Operaciones

- **Tablero de Producción por bloques**: 1 etapa por página en el celular, 2 en tablet y 4 completas en escritorio, con desplazamiento por bloques y flechas que avanzan una página; el indicador dice el rango visible (“Etapas 1–4 de 7”) y ninguna etapa queda cortada.
- **Tarjetas resumidas**: la descripción se muestra hasta en 2 líneas y “Ver detalle” aparece solo cuando hay texto escondido.
- **Checkboxes parejos**: el checklist de la pieza, el planificador y el enlace “Visible en el portal” usan el mismo control de 24 px, con área táctil de 44 px en móvil.

### Velocidad del API

- **Consultas más livianas**: la proyección por campos (`?fields=`) de órdenes y proyectos se resuelve en la base y ya no trae columnas que después se descartaban; con la misma semilla de 12.000 órdenes, Resumen baja de 57 a 17 ms de wall y Clientes de 71 a 29 ms. El resumen se calcula en una sola pasada.
- **Medición reproducible**: nueva herramienta de TTFB por página (`npm --prefix backend run bench:pages`) con PostgreSQL temporal y semilla fija; es opt-in y no corre en CI.

## v1.0.127

### Comercial

- **Clientes y Presupuestos ya no se cortan**: la tabla densa se muestra solo si el ancho real del contenedor alcanza para su plantilla (reacciona al colapsar el riel); si no entra, la pantalla pasa a tarjetas. Cuando se muestra la tabla, la columna de acciones queda fija al borde del scroll: editar, archivar y WhatsApp nunca se salen de alcance, y los montos de Presupuestos dejan de recortarse.
- **Fila densa más usable**: el carril de acciones de Clientes pasa a 20 rem (WhatsApp + Archivar + plan + editar/papelera entran sin scroll interno) y el CTA de plan en la fila es ícono con tooltip para no inflarla.
- **Vacíos con salida**: Clientes sin plan ofrece “Cargar plan” (abre *Plan y pago*, solo para roles con permiso de términos comerciales; con la ficha abierta aparece junto a “Sin plan registrado”) y el vacío de Presupuestos ofrece “Nuevo presupuesto”; donde el rol no puede operar queda el aviso honesto, sin botón muerto.
- **Selector lista/cuadrícula coherente**: se oculta cuando la tabla no entra, para no ofrecer un cambio sin efecto.

## v1.0.126

### Marco y sistema visual

- **El contenido usa todo el ancho**: con el riel normal o colapsado la pantalla se reparte por flex y desaparecen las franjas muertas (hasta 260 px en pantallas anchas y 132 px al colapsar). El riel y el menú móvil cortan en el mismo ancho (768 px): se termina la banda donde se veían los dos menús a la vez.
- **Pie del riel con un solo divisor** (se retiró la raya duplicada heredada) y el ítem activo/hover del nav recupera sus opacidades reales de Tailwind.
- **Botón primario legible**: el texto del CTA violeta sale del token de marca y cumple AA en claro (14,07:1) y oscuro (5,30:1).

### Operaciones

- **Tablero de Producción**: indicador “N de 7 etapas” con flechas para recorrer el riel, contadores que respetan los filtros activos y mensajes claros de carga y vacío (“Nueva pieza”, “Restablecer filtros”) en lugar de un “0 órdenes” engañoso.
- **Inventario**: toolbar en una sola línea (vista, búsqueda, categoría, vista de equipos, selección, contador y acciones) y CTA “Agregar valor” cuando falta el dato monetario.
- **Estudio y Proyectos**: vacíos compactos con CTA primario (“Agregar espacio”, “Nuevo proyecto”); sin espacios ni reservas ya no se dibuja el calendario vacío.

### Finanzas

- **Informes**: el período visible y el anterior se muestran completos y ordenados, con año y último día de cada mes (p. ej. “1 oct. 2025 — 30 sept. 2026”), igual en pantalla y en el PDF.
- **Vacíos con salida**: Finanzas, Mora, Previsión, Comisiones e Informes ofrecen el CTA que resuelve el vacío (registrar cuenta, factura, cobro o comisión; transferir; limpiar filtros; ver el último mes con datos); los estados sin acción posible según el rol quedan honestos y sin botón.

### Plataforma

- **Equipo**: búsqueda, filtros, contador, vista y acciones en una sola fila que envuelve sin huecos; los chips Activos/Inactivos ahora filtran de verdad y el nombre completo se lee hasta en dos líneas en las tarjetas.
- **Vacíos con CTA**: “Agregar primera persona” en Equipo, “Generar enlace” en Invitaciones, reintento en Roles y permisos y “Crear el primer cupón” en Superadmin; donde no hay acción posible, el vacío no ofrece botón.

### Diseño (documentación)

- Publicado el patrón de **tablas densas responsive**: columna de acciones fija por defecto (las acciones no dependen del scroll), menú “⋯” como excepción cuando la fila no entra y vista tarjeta en anchos medios por plantilla.
- Publicado el patrón de **estados vacíos con CTA contextual**; `DESIGN-SYSTEM.md` y el harness visual quedan sincronizados con el corte md único.

## v1.0.125

### Accesibilidad AA (verticales Comercial, Operaciones, Finanzas y Plataforma)

- **Comercial**: las listas de Clientes y Presupuestos anuncian cada dato en su columna y quedan sin violaciones propias de la vertical; el arrastre del pipeline y del compositor de presupuestos se opera por teclado con instrucciones y anuncios en castellano, y las manijas distinguen “Reordenar ítem” de “Reordenar sección”.
- **Comercial**: con “reducir movimiento” activo, las transiciones propias (manijas de arrastre y barras del tablero de crecimiento) quedan apagadas.
- **Operaciones**: los chips de tipo de trabajo del planificador y del detalle se leen correctamente en tema oscuro; los botones de las tarjetas del tablero y el enlace “Drive” ganan área táctil de 44 px en el celular, y cada columna del tablero anuncia su etapa y cantidad.
- **Finanzas**: 15 campos (mes, montos, fechas, referencias, notas, extracto y semana) pasan a tener etiqueta asociada, y las listas de contratos, personal proyectado y gastos anuncian sus encabezados como columnas.
- **Plataforma**: el panel de Superadmin recupera contraste en oscuro (1,78:1 → 5,10:1), la selección en la cuadrícula de Equipo llega a 44 px en mobile y el comprobante de eliminación queda etiquetado para lectores de pantalla.
- **Verificación**: recorrido real de teclado con foco visible, contraste medido en claro y oscuro y harness de las verticales sin hallazgos; sin cambios de datos ni de permisos.

## v1.0.124

### Accesibilidad y sistema visual

- **Foco visible único**: un solo indicador sólido de 3 px con contraste AA en claro y oscuro; sobre el riel es blanco (el de marca no llegaba al mínimo). Se retiró el halo translúcido que lo hacía casi invisible.
- **Contraste corregido**: el gris de textos secundarios y el ámbar de avisos pasan a valores ≥4,5:1 (con el mapeo de Tailwind alineado); barrido del marco sin fallos y todo el marco por encima de AA.
- **Teclado verificado**: abrir el menú con Enter deja el foco adentro (trampa en Tab, Escape cierra y devuelve el foco) y las animaciones se apagan con “reducir movimiento”.
- Pendiente en la librería: el ámbar del chip de advertencia de `owncoding-ui` mide 3,65:1; quedó el pedido con la propuesta de valor (`#8A6207`).

## v1.0.123

### Comercial

- **Presupuestos en lote**: barra de selección con contador, tope del sistema y confirmación; el lote se resuelve en una operación y la lista se refresca al terminar.

### Operaciones

- **Estudio**: selección múltiple de reservas con el mismo patrón de lote (seleccionar visibles, limpiar y confirmar), con el permiso correspondiente.

### Plataforma y acceso

- **Aviso de suspensión por falta de pago**: se envía una sola vez por ciclo de cobro (con sello), después de la gracia.
- **Gate del integrador**: el hook de push a `main` pasa a `SCALE_INTEGRATOR=1` (hook, script de setup, release y documentación alineados).

### Diseño (documentación)

- Definición única del **estado de cobro del cliente**: etiqueta y tono salen del `payment_status` del API (`days_overdue` solo para el número y la antigüedad de Mora), documentada en `DESIGN-SYSTEM.md` con la adopción propuesta en Clientes y en la ficha de pieza.

## v1.0.122

### Documentación y reglas

- La lista de componentes canónicos suma los **patrones v2** (`PageHeader`, `FilterToolbar`, `ListGrid`/`ListRow`, `Kpi`/`KpiStrip`, `StateChip`, `MoneyText`, `CurrencyField`, `ViewSwitch`, estados de carga/vacío/error), con su contrato en `DESIGN-SYSTEM.md`.
- La validación de Prisma queda documentada para correr sin `.env` (solo valida el schema, no se conecta).

## v1.0.121

### Marco y sistema visual

- **Topbar sin desborde**: las utilidades envuelven y el buscador se trunca (o pasa a icono) en pantallas chicas; “Métricas” queda como tab real dentro de Pipeline, con su ruta y redirect alineados, y se retiró una regla legacy de toolbars.

### Finanzas

- **Rótulos al patrón del marco**: toda la familia de eyebrows de la vertical financiera usa el eyebrow canónico (Previsión, Informes y el resto).

## v1.0.120

### Marco y sistema visual

- **Una sola medida**: el título de panel (17 px) y el radio de tarjeta (12) vuelven a un valor único en toda la app, para que las verticales no divergieran tras el rediseño.

### Comercial

- Encabezado del directorio y títulos de panel (métricas, compositor y ficha) al lenguaje del marco nuevo; clones del harness sincronizados.

### Operaciones

- Un solo encabezado por pantalla, filas del sistema y auditoría en una línea; tablero, planificador y Proyectos alineados al marco.

### Finanzas

- Encabezados canónicos y hover de fila en toda la vertical.

### Plataforma y acceso

- Equipo, Actividad y Uso alineados al sistema v2, con fixtures sincronizados.

## v1.0.119

### Marco y sistema visual

- **Nav rediseñado**: cada ítem lleva un tile de ícono; el activo suma barra dorada y pill en el riel (tono de marca en el menú móvil); el foco se ve en claro y oscuro; el pie del usuario es una tarjeta y el menú móvil mantiene su encabezado fijo al scrollear.
- **Contenido**: encabezado de página unificado (título 22/24, subtítulo 13, acciones que envuelven a ancho completo en el celular) y filas con hover en ambos temas.
- **Carga y superficies**: los esqueletos usan el alto de fila del sistema (44) y el topbar/estados ganan una sombra sutil; todo por tokens (`ink-*`/marca), con el riel lila en claro y casi negro en oscuro.
- Evidencia: harness de 121 fixtures con 0 altas/medias y contraste AA+ en los dos temas.

## v1.0.118

### Operaciones

- **Inventario más liviano**: la foto de cada equipo dejó de viajar en las listas; ahora se sirve como imagen del API (con sello para cachear) y se carga solo cuando se ve. Con 2.000 equipos la lista pasa de ~18,6 MB a un payload normal.
- **Piezas por proyecto**: el detalle pide solo las piezas del proyecto (`?project_id=` paginable, negociado automáticamente) y muestra el total real del proyecto aunque la lista esté resumida.
- **Proyectos**: conmutador lista/cuadrícula del sistema v2 y fila de lista con acciones de ícono (44 px en celular, 28 en escritorio), con “Archivar/Reactivar proyecto” descripto para lectores de pantalla.

## v1.0.117

### Comercial

- **Pipeline**: al editar una oportunidad, su fecha de actualización se refleja (PATCH corregido), así el orden por actividad queda al día.

### Operaciones

- **Mi día** quedó completo y el detalle de proyecto acotado, según la ronda de QA con datos reales (piezas y responsables sin cortes).

### Plataforma y acceso

- **Equipo y Papelera** cumplen el contrato de listas en escritorio y celular (filas finas y acciones alineadas).
- **API**: la negociación de compresión atiende bien `q=0` y el comodín de `Accept-Encoding` (no comprime cuando el cliente lo prohíbe).

### Medición

- El harness mide claro y oscuro por separado y dejó de marcar el falso solape del campo de contraseña.

## v1.0.116

### Rendimiento y datos

- **Producción quedó con una sola fuente de datos**: el shell ya no pide la lista de órdenes para esa pantalla — las columnas las carga el tablero con sus conteos exactos y “Ver más” — y se retiró el código superado, así no quedan lecturas duplicadas.
- El buscador y la presencia en Producción operan con lo que aporta el tablero (compromiso documentado).

## v1.0.115

### Rendimiento y datos

- **Producción deja de pedir la lista completa**: el shell carga el tablero por columnas (ventanas por etapa) y comparte con el tablero los totales exactos de cada columna; el buscador y la presencia usan esas ventanas en esa pantalla.
- El medidor de carga y los contratos del modo por columna quedan como verificación permanente.

### Marco y sistema visual

- Se retiraron reglas de estilo muertas (avisos y chips viejos) y se actualizó su clon del harness para medir el markup real.
- Nuevos fixtures de suscripción y zona de peligro; contraste del riel, topbar, drawer y pantalla de carga verificado en claro y oscuro (todo por encima de AA, 0 hallazgos).

## v1.0.114

### Rendimiento y datos

- **El API comprime sus respuestas** (brotli o gzip según lo que pida el navegador): las listas grandes bajan hasta **−97/−99 % de bytes transferidos** (piezas 1,5 MB → 43 KB; clientes 281 KB → 3 KB), con cabeceras correctas para cachés y sin tocar PDF ni binarios.
- **Tablero de Producción por columna**: cada columna pide solo su ventana de 50 piezas y los totales exactos viajan aparte; el badge muestra el total real, “Ver más” completa la columna sin perder piezas y el arrastre sigue siendo inmediato con reversión si falla. −87 % de bytes y 3,1× más rápido en 4G.
- **Facturas**: el saldo por moneda (receivables) viaja siempre con la lista, aunque la ventana deje afuera facturas viejas.

## v1.0.113

### Corrección del shell y el marco

- **La carga de datos volvió a funcionar**: el prefijo de API se duplicaba en las lecturas del shell y devolvía 404; ahora es idempotente en todo el transporte, así que las secciones cargan sus datos al arrancar y al navegar (incluido el buscador, la presencia y los selectores de los modales).
- **Cambiar de sección ya no rompe el tablero**: cada pantalla pide su propia proyección y no reutiliza una lista cargada con otro recorte; Producción vuelve a mostrar la clasificación del trabajo.
- **Marco móvil corregido**: una regla vieja dejaba el riel de 254 px en el celular (578 desbordes medidos, hasta +2584 px); queda retirada y Pipeline/Planes ya no estiran el documento.

### Rendimiento y datos

- **API con agregados por etapa y por proyecto**: Resumen y Clientes dejan de calcular esos números en el navegador y el modo por columna del tablero (`?status=` + `?counts=1`) devuelve conteos exactos.
- La ventana del buscador y la presencia viajan proyectadas (50 KB en lugar de 254 KB), y el medidor de carga por pantalla quedó como herramienta de verificación.

## v1.0.112

### Rendimiento y datos

- **Las pantallas piden solo lo que necesitan**: las que no listan órdenes usan una ventana de 300 piezas recientes en lugar de la lista completa (hasta −72 % de datos por pantalla) y la frescura se controla por recurso y recorte, sin que una ventana tape una lista completa.
- **API con proyección de campos** (`?fields=`): las listas pueden pedir solo las columnas necesarias y el payload por defecto queda recortado.
- **Medidor de carga por pantalla** para comparar antes/después y verificar mejoras (incluye mobile).

### Notas para el equipo

- Resumen y Clientes mantienen la lista completa hasta que existan los agregados por etapa/cliente propuestos; Producción conserva la lista completa por ser tablero.

## v1.0.111

### Rendimiento y datos

- **El shell dejó de repetir lecturas**: cada sección pide solo lo suyo y muestra esqueleto de carga mientras espera, con un medidor de carga para verificar mejoras.
- **API más rápida en listas grandes**: índices nuevos para piezas, proyectos e inventario, agregados en una sola consulta y paginación opcional; el panel responde mejor con volúmenes altos.
- Bench opcional del API (`npm run bench:agency`) para medir estas listas cuando haga falta.

### Comercial

- **Pipeline y presupuestos**: el arrastre de oportunidades y el reordenar ítems del compositor funcionan de forma confiable, con targets táctiles en el celular y la fila densa de Presupuestos.

### Operaciones

- **Producción e inventario**: se corrigió el arrastre del tablero y del pipeline (zonas, sensores y actualización inmediata); el inventario ahora muestra errores accionables, con tiempo límite por sección y reintento del catálogo.

### Finanzas

- **Comisiones**: carga más liviana (catálogos diferidos) tras la auditoría de carga de la vertical financiera.

## v1.0.110

### Marco y sistema visual

- **Riel, encabezado y topbar consolidados** en una sola fuente: nav sin subrayado, riel colapsado sin recortes y la pantalla de carga con la identidad de marca.
- Los espacios y márgenes del contenido quedan parejos en todos los anchos.

### Comercial

- **Pasada de responsividad 360–1440** en clientes, presupuestos, planes, pipeline y métricas: barras de filtro, indicadores y botones con targets táctiles de 44 px en el celular; nada se corta ni se superpone.

### Operaciones

- **Inventario y estudio**: targets táctiles de 44 px, filas y código de barras, con scroll contenido dentro de cada panel.
- **Producción y proyectos**: calendario y tarjetas legibles en mobile, acciones sin desbordes y enlaces de Drive tocables.

### Finanzas

- **Finanzas, mora, previsión e informes**: targets, paddings y títulos ajustados al celular, chips largos sin cortes y modales medidos para que nada quede fuera de pantalla.

### Plataforma y acceso

- **Plataforma, acceso y superadmin**: diálogos y páginas de acceso sin cortes en 360, con targets de 44 px y los hallazgos de la auditoría de Papelera cerrados.

## v1.0.109

### Comercial

- **Montos y monedas unificados**: presupuestos, pipeline, ficha de reportes y ciclo comercial usan el objeto de dinero v2 (las 6 monedas de la empresa, sin recortes) y el selector de moneda con el catálogo real; el indicador multi-moneda del pipeline ya no se corta en el celular.
- **Vista y limpieza**: el cambio lista/cuadrícula sale del objeto compartido y se retiró el CSS muerto del directorio de clientes.

### Operaciones

- **Inventario** pasa al mismo objeto de dinero para sus importes, sin cambiar los datos que muestra.
- Se retiraron las reglas muertas de `production-focus.css` (la pantalla ya vive en el sistema v2).

### Finanzas

- **Finanzas, Mora, Previsión y Comisiones** adoptan el dinero y el selector de moneda compartidos, con importes y fechas siempre completos.
- Se retiró el CSS legacy de las listas de cobranza (`.mora-list`, `.client-list`), que ya no emitía ningún módulo.

### Plataforma y API

- **Tests del API con PostgreSQL real** ejecutables con un solo comando (`npm --prefix backend run test:postgres`), con el entorno documentado para cualquier máquina.
- **Manual operativo del API** en `backend/OPERATIONS.md` y reglas de onboarding/deploy actualizadas en el monorepo.

## v1.0.108

### Navegación y sistema visual

- **Corrección de contraste del riel**: en tema claro vuelve el violeta de marca con el wordmark, el usuario, el caption y los enlaces en blanco (antes quedaba blanco sobre blanco); en oscuro se mantiene el casi negro aprobado.
- El fondo del riel pasa a una única sección del sistema visual, sin reglas viejas que puedan pisarlo, y la marca duplicada ya no aparece dentro del riel de escritorio.

## v1.0.107

### Navegación y sistema visual

- **Menú reordenado por flujo de trabajo** (resumen → captar y cerrar → ejecutar → cobrar y medir → equipo → administrar) con iconos propios por sección, aprobado por el dueño.
- **Riel con la marca en claro**: wordmark blanco con acento dorado y el bloque del usuario (nombre y rol) legible sobre el fondo lila; el ancho del riel ya no afecta a otros paneles.
- **Dinero y moneda v2**: un solo objeto de dinero formatea las 6 monedas de la empresa y el selector de moneda ofrece exactamente ese catálogo.

### Comercial

- **Clientes**: la fila finita cumple el contrato (48–51 px), con los cobros y la actividad sin superponerse, las acciones en una línea con desplazamiento silencioso y la ficha con la cápsula grande; se retiró el CSS del directorio viejo.

### Operaciones

- **Historial de trabajo** rediseñado al sistema v2: bloques apilados con autor, título y la acción (“Creó/Actualizó/Eliminó · estado → estado”), filtros por persona, tamaño de página y paginación contra el mismo API; el historial importado de Trello sigue disponible.
- El fixture de proyectos ahora mide el markup real de la fila (incluidas las variantes por lista), cerrando un punto ciego del harness.

### Finanzas

- **Finanzas, Mora y Previsión**: todas las listas quedan en una línea por fila (44–52 px), con actores compactos, importes y fechas sin cortes, y los textos largos recortados con su valor completo disponible al pasar el cursor.

### Plataforma y acceso

- **Auditoría v2 cerrada**: Equipo, Invitaciones, Papelera, Roles y permisos, Superadmin, Estado y Configuración alineados al contrato (filas finitas, scroll contenido, encabezados y acciones alineados).
- **Ayudas v2**: bandeja de notificaciones, zona de peligro, panel de suscripción y confirmación destructiva del panel global, sin hojas de estilo propias.
- **Registrar cobro desde la fila**: el modal abre con la factura ya elegida; además, los tipos compartidos de Finanzas y la limpieza de datos de Mora en el shell.

## v1.0.106

### Comercial

- **Presupuestos**: propuestas con sus indicadores (a la espera, borradores, aceptadas y las que vencen esta semana), lista al contrato de filas y acciones por presupuesto; los montos se ven completos en todas las monedas de la empresa.
- **Planes**: comparador y alta/edición con los datos reales, gating por permiso y papelera, sin cambiar la forma de trabajar.
- **Pipeline**: tablero de oportunidades con totales por etapa (ponderado y abierto por moneda), arrastre para marcar ganado/perdido y alta/edición con contacto, monto, probabilidad y próximo paso.
- **Métricas**: panel de crecimiento para dueños y administradores, y estado “sin eventos” cuando todavía no hay datos (sin inventar ceros).

### Operaciones

- **Producción**: el tablero y el planificador se rehicieron con el sistema v2; cada tarjeta muestra tipo de trabajo, horas estimadas y reales, nivel de aprobación, enlaces y checklist, además de etapa, entrega y responsables.
- **Mi día, calendario y lista y lotes**: entregas de hoy y vencidas, piezas asignadas, el mes en grilla o en lista según la pantalla y el armado de lotes con el tope del sistema.
- **Proyectos**: lista densa con una sola plantilla y tarjetas grandes a elección; cada proyecto abre su ficha con responsables, enlaces, piezas y nivel de aprobación.

### Finanzas

- **Finanzas**: cuentas con institución, número, titular y custodia; transferencias con notas e importe recibido cuando hay cambio de moneda; cobros pendientes con filtros y cobros registrados con su reversión.
- **Mora**: semáforo de cobranza, antigüedad de la deuda por tramos, días promedio de cobro y lista por cliente con facturas y pendiente.
- **Comisiones**: sección propia con liquidación por colaborador, comisiones por venta y referido, descuentos con reversión y pagos registrados con quién los cargó.

### Plataforma

- **Superadmin**: el panel global quedó dividido en secciones (agencias y suscripciones, accesos entre agencias, cupones y auditoría) con los mismos permisos, acciones y datos.
- **Perfil y seguridad**: mi perfil y la seguridad de la cuenta se alinean al sistema v2; las sesiones muestran su estado y el aviso de contraseña es más claro.

### Sistema visual

- El riel de navegación, el encabezado de la app y el menú móvil pasan al sistema v2: mismos tamaños y objetivos táctiles, sin archivos de estilo propios del marco.
- Los contratos automáticos del marco quedan centralizados en una sola verificación y las pruebas apuntan a las fuentes nuevas.

## v1.0.105

### Marco y referencias del sistema visual v2

- El espacio de trabajo estrena el nuevo sistema visual (Tailwind + la librería compartida del grupo): la barra lateral, el encabezado y el pie mantienen la identidad de marca y ahora se alinean al mismo contrato de tamaños, colores y estados.
- El **Panel**, **Clientes** y **Configuración** son las primeras pantallas reconstruidas sobre el contrato v2: jerarquía más clara, estados de vacío, carga y error en cada bloque, y montos, fechas y códigos que nunca se cortan.
- Las listas densas comparten una única plantilla entre encabezado y filas (también en mobile, con scroll silencioso), y los avisos y confirmaciones salen de una sola pieza.

### Comercial

- **Clientes**: la lista y la ficha se rehicieron con la información completa del cliente — contacto, RUC y datos fiscales, cartera, cobros y pie comercial — sin depender del rol: lo que no corresponde ver no se dibuja.
- **Pipeline** y **Métricas**: el tablero de oportunidades y el panel de crecimiento muestran los mismos datos de siempre con la lectura v2 (etapas, montos ponderados por moneda, serie diaria y comparación de períodos).
- **Presupuestos** y **Planes**: el compositor de propuestas y el comparador de planes mantienen los totales y el PDF, ahora con validaciones y estados al nuevo contrato.

### Operaciones

- **Inventario**: la lista, la cuadrícula y el pipeline de ubicaciones se rehicieron con el sistema v2; el detalle y las reservas siguen el mismo contrato de filas y chips, con la verificación física y la depreciación visibles sin cortes.
- **Estudio**: espacios y reservas quedan en una sola grilla y una sola lista, con los mismos permisos y la misma validación de superposición.

### Finanzas

- **Informes**: los indicadores, la comparativa de períodos, el gráfico y la tabla histórica se reordenaron al contrato v2, con la exportación en un solo lugar y la regla “sin datos ≠ cero”.
- **Previsión**: el resumen por moneda, la proyección de caja, los contratos y los gastos mantienen su cálculo y ganan estados de carga/error propios por bloque.
- **Tesorería, mora y comisiones**: las listas de cuentas, facturas, cobros, transferencias, cartera y comisiones comparten el contrato de filas; las acciones aparecen solo para quien puede ejecutarlas.

### Plataforma y acceso

- **Roles y permisos**: la matriz se lee por dominio, distingue valores por defecto de los ajustes de la empresa y agrupa los cambios con confirmación.
- **Invitaciones, papelera y preferencias**: listas al contrato v2, con la actividad de cada enlace y las acciones de recuperación a mano.
- **Acceso**: registro, invitación, recuperación de cuenta, verificación de correo y la página de estado comparten un mismo marco visual, con los mismos mensajes y validaciones de siempre.
