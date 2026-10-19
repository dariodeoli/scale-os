# Acciones móviles y formularios internos — Refs #295

Esta prueba amplía la revisión de geometría de #265 con interacciones táctiles
sobre siete componentes reales. Se monta React de producción y se compila el
CSS del checkout. Los registros y las respuestas HTTP son sintéticos y viven
únicamente en la página de prueba local: no se conecta a producción, API ni DB.

## Matriz

35 combinaciones: siete flujos en 320×844, 390×844, 768×844, 390×568 y 844×390.
Las dos últimas cubren altura baja y orientación horizontal. Chromium emula
viewport móvil y touch; no equivale a un dispositivo físico ni a Safari.

Cada interacción usa `page.tap()`. Antes de tocar se desplaza el control a la
vista y se comprueba que su centro sea alcanzable dentro del viewport. Los
campos visibles de diálogos no pueden salir horizontalmente del viewport y el
documento no puede ensancharse. Los botones inferiores se activan después del
scroll real del diálogo; no se envía el formulario artificialmente desde JS.

| Flujo | Componente real | Comportamiento comprobado |
| --- | --- | --- |
| Cliente | `ClientEditor` | Crear cliente; checkbox vincula y bloquea nombre del representante; payload conserva el nombre vinculado. |
| Inventario | `InventoryItemForm` | Importe comienza vacío; nombre inválido no escribe; importe 250000 no agrega cero; fallo HTTP simulado conserva borrador y permite reintentar. |
| Cuenta | `AccountForm` | Crear cuenta mediante el formulario real y conservar nombre en solicitud. |
| Cobro | `PaymentForm` | Elegir factura/cuenta, ingresar 1000, guardar importe numérico y clave de idempotencia. |
| Equipo | `TeamPersonSheet` | Crear persona desde la pestaña Perfil y conservar nombre enviado. |
| Tareas | `EmployeeTasks` | Abrir detalle, completar checklist, agregar comentario y marcar tarea completada. |
| Contratos | `ContractsWorkspace` | Crear borrador con plantilla; emisión permanece bloqueada sin revisión humana. |

Se comprueban 75 aserciones explícitas de comportamiento, además de las
comprobaciones de geometría, alcanzabilidad de cada tap y ausencia de errores
JavaScript. El JSON adjunto conserva cada combinación y cantidad de controles
visibles inspeccionados en el formulario.

## Reproducción

```sh
node build-tools/qa-mobile-actions-295.mjs
```

Requiere dependencias de frontend/backend y Chromium. `SCALE_QA_CHROME` permite
seleccionar su binario; `OUT` cambia la ruta del JSON. Por defecto se escribe
`/tmp/scale-mobile-actions-295.json`. El runner se agrega también al gate
`npm run test:ui:browser`, que falla si el navegador no está disponible.

## Límites precisos

Esta prueba no acredita rutas completas ni navegación del shell autenticado;
prueba componentes con transporte interceptado, no persistencia ni permisos del
API. Tampoco cubre todas las acciones posibles dentro de los siete módulos.
Quedan fuera de esta matriz: edición/borrado de registros existentes, reservas
y drag-and-drop de inventario, cambios de salario y accesos, conciliación de
pagos, cierres de mes, emisión/PDF de contratos y proveedores externos. Sus
pruebas de dominio existentes siguen siendo necesarias.

No incluye Configuración (empresa/perfil/preferencias/papelera), biblioteca UI,
auth, portal privado ni superadmin. El portal y superadmin corresponden a #292;
la validación física de Safari/iPhone/iPad/Android se sigue en #296. No debe
usarse este reporte para afirmar «todo mobile probado».

No se modifican componentes de producto, datos, versión ni despliegue. El
integrador registra CI, merge y deploy del SHA final antes de cerrar #295.
