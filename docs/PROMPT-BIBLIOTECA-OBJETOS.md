# Prompt para trabajar con la biblioteca de objetos

Scale reutiliza **OwnCoding UI**, fijada en `v0.68.16`. Los adaptadores y las
reglas propias del producto viven en Scale. Este texto es un modelo reutilizable
del criterio de trabajo, no una transcripción literal de las instrucciones de
un agente.

```text
Usá OwnCoding UI como biblioteca compartida de objetos.

Antes de crear un componente, revisá el catálogo compartido y los componentes
canónicos del proyecto. Reutilizalos. Si el componente requiere una mejora,
modificá su fuente única y actualizá sus consumidores; evitá variantes por página.

Unificá diálogos, formularios, botones, campos, selectores, avatares y tablas.
Cada entidad debe tener un único formulario reutilizable en sus distintos puntos
de entrada. Distribuí campos por el espacio que necesitan y respetá responsive.
Usá columnas alineadas, importes completos, fotos y logos circulares, botones
rectangulares con esquinas suaves y contraste en temas claro y oscuro.

Conservá datos, errores y foco al abrir un diálogo secundario. No desmontes el
formulario principal para crear una entidad relacionada. Evitá guardados dobles.
Los importes nuevos empiezan vacíos y respetan la precisión de su moneda.

Las reglas generales van en la biblioteca compartida; las reglas de negocio
permanecen en la aplicación. Publicá y fijá una versión de la biblioteca cuando
la modifiques. No copies su implementación dentro del proyecto.

Registrá el trabajo en un issue antes de implementar. Trabajá en una rama
aislada, probá los consumidores afectados y entregá commit, pruebas y PR.
El integrador coordina merge y deploy.
```

En esta entrega, `AccountCreateDialog` reutiliza `AccountForm` desde Cuentas y
desde Recibir pago. El cobro conserva su `Editor` mientras se crea la cuenta.
Clientes reutiliza su editor canónico desde el directorio y desde Balance.
La cronología de planes y salarios comparte `FinanceHistoryPanel`.
