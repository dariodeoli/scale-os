# Compartir con OwnCoding UI después de consolidar Scale

Refs #241. La auditoría, decisión de canónicos, migración local y catálogo se prepararon antes de inspeccionar la implementación externa. La dependencia existente se mantuvo en v0.68.16, sin incorporar otra librería.

## Candidatos

- Button: modelo único con variantes, tamaños, pending, iconos, props HTML y ref.
- Input/Textarea: primitivas nativas sin política comercial ni normalización.
- DateInput/TimeInput/DateTimeInput: composición nativa sin convertir fechas civiles.
- Comportamiento de SearchField: callback de valor, limpiar sin submit y recuperación del foco.

## No publicar como genérico

- Entry completo `app/ui/index.ts`: incluye adaptadores específicos de campos e identidad de Scale.
- PhoneField y field-rules: catálogo de países y validación de su API.
- ui-v2: importa operaciones, formatos comerciales y contexto de moneda.
- AssigneePicker: filtra activos, interpreta IDs y responsable principal.
- ClientEditor, RUC lookup, políticas de foto/medios internos, permisos, roles y cálculos.

## Preparación de publicación

1. Comparar únicamente contratos equivalentes de la versión instalada, después de las verificaciones locales.
2. Transportar mejoras como cambios compatibles del componente existente; evitar un segundo Button/Input con otro nombre.
3. Mapear tokens de Scale a tokens públicos del paquete, sin copiar URLs ni políticas comerciales.
4. Llevar tests de comportamiento, refs, teclado, loading y formularios. Añadir las capturas de catálogo claro/oscuro y responsive como evidencia de Scale, sin atribuirlas a todos los consumidores del paquete.
5. Abrir revisión en el repositorio compartido antes de liberar versión; ejecutar sus propios consumidores y CI. Recién entonces adoptar en Scale una versión compatible y retirar el puente que resulte redundante.

No se libera una versión del paquete desde esta rama de Scale. La revisión de compatibilidad y sus diferencias concretas se registran en ENTREGA.md; no se asume equivalencia por el nombre del componente.

## Comparación realizada al finalizar la consolidación local

Fuente: declaraciones publicadas en la dependencia instalada `owncoding-ui@0.68.16`, `dist/index.d.ts` (Button64–73, Input76–89, SearchField288–290). Se revisaron después de que la regresión integrada de Scale completó243 entradas. No se cambió la dependencia de UI ni su resolución; los metadatos de versión de Scale se actualizan por el flujo de release.

| Modelo | Paquete instalado | Contrato local consolidado | Decisión |
|---|---|---|---|
| Button | variant primary/success/danger/outline/ghost, cargando/exito/motion; declaración como función | primary/secondary/outline/ghost/danger; size, loading, iconPosition, iconOnly, fullWidth; forwardRef explícito | Proponer extensión compatible del Button existente, conservar aliases/semántica success y cargando. No sustituir a ciegas ni publicar otro Button paralelo |
| Input/Textarea | Input HTML+CampoExtras, ref; adornos inicio/fin, cargando, estado y motion | Contrato HTML nativo+ref, sin adornos comerciales; wrappers semánticos fuera de la base | Equivalencia solo del subconjunto nativo realmente usado por consumidores migrados. Preservar extras públicos si se traslada el cambio al paquete |
| SearchField | callback de evento; onClear/limpiable/cargando/motion y ref | callbackstring; label/ariaLabel; clearable y foco | Se requiere adaptador o extensión compatible. Migración directa alteraría el contrato de los20 consumidores locales |
| Fecha/hora | No se encontraron exports tipados DateInput/TimeInput/DateTimeInput equivalentes; RangoFecha es otro modelo | Inputs nativos individuales, strings civiles y props del consumidor | Candidatos de composición genérica; no equiparar selector de rango con campo civil individual |
| Moneda/personas | MoneyInput y BuscadorPersonas ya consumidos por adaptadores locales | AmountInput/PersonSelect conservan esos adaptadores estables | Continuar reutilizándolos sin cambios de dependencia ni reemplazo por parecido |

No se verificó la totalidad de consumidores del repositorio público del paquete ni su runtime de refs/transiciones. Estas diferencias impiden declarar un reemplazo externo idéntico. La preparación queda documentada y la publicación requiere su propia revisión/CI de compatibilidad.
