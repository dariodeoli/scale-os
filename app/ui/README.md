# Biblioteca interna de interfaz de Scale

`app/ui/index.ts` es la entrada pública **selectiva** para consumidores cliente. Las implementaciones de componentes usan imports directos a sus dependencias, nunca `app/ui/index.ts` ni un alias que lo resuelva. Así una base no depende del conjunto de consumidores que la compone.

## Módulos y contratos

| Módulo | API pública y responsabilidad |
| --- | --- |
| `input` | `InputBase`, `TextareaBase`: refs DOM y eventos nativos; `invalid`, `describedBy`, `pending`. Sin límites de negocio implícitos. |
| `input-control` | `InputControl`: selección del control nativo/temporal existente según tipo. |
| `field` | `Field`: etiqueta, ayuda, error e IDs relacionados. Render-prop `{id,invalid,describedBy}` para controles compuestos. |
| Adaptadores de texto | `TextField`, `EmailField`, `PasswordField`, `PhoneField`: mantienen `onChange(string)` y ref al input. No cambian las políticas de contraseña ni verifican identidad. |
| `amount` | `AmountInput`: contrato local `onChange(string)`, moneda explícita y renderer MoneyInput existente. Mantiene precisión/formato/caret, sin convertir monedas. |
| `number` | `NumericControl` conserva eventos/ref reales; `InputControl type=number`, `NumberInput` y `PercentageInput` usan ese motor. Borradores parciales intactos; límites, precisión y step explícitos con customValidity. `numberInputValid`/`numberInputProblem` no cambian el valor. No convierten porcentajes y ratios. |
| `temporal` | `DateInput`, `TimeInput`, `DateTimeInput`, `MonthInput`: valores civiles con texto parcial conservado, selector preparado con Aplicar/Cancelar y reloj de 24 horas. La conversión a instantes pertenece al dominio. |
| `button` | `Button`, `IconButton`: botón nativo, variantes/tamaños/colores y pending. Ninguna operación remota. |
| `select` | `Selector`: opciones suministradas por consumidor; selección simple/múltiple según contrato, búsqueda y accesibilidad. No carga catálogos ni decide permisos. |
| `smart-field` | `LookupField`, `LookupReview`: presentación de búsqueda/revisión y callbacks. El consumidor decide autorización, consulta, fuente y aplicación de cambios. |
| `surface` | `CardSurface`: reexport de `Card`, con firma/ref/polimorfismo del renderer instalado conservados. |
| `collection` | `DataTable`: reexport directo; conserva inferencia genérica, columnas y renderers móvil/escritorio. No filtra, ordena ni agrega dinero por sí mismo. |

La entrada también expone selectivamente los diálogos/confirmación/acciones de formulario existentes, los patrones de presentación de `ui-v2` y las identidades visuales `FotoPerfil`, `PersonContainer` y `ActorIdentity`. No agrega una segunda implementación de esos objetos.

`Editor` es una composición de Scale: incluye adaptadores de Drive, políticas de campos, moneda y mensajes del API. Se importa desde `app/scale-ui.ts` (o su entrada histórica `operations`), separado de esta entrada visual. No se publica como primitiva genérica ni se exportan funciones de API. `ui-v2` utiliza el formateador monetario directamente y no depende del módulo de operaciones.

Las identidades `ActorIdentity` y `PersonContainer` son composiciones internas de Scale sobre `FotoPerfil`; sus políticas de medios autorizados y autoría importada no pertenecen a una futura publicación genérica. La portabilidad se decide por módulo, no copiando el barrel entero.

## Permitido

- Importar símbolos concretos de `app/ui` en consumidores cliente; los imports directos existentes siguen compatibles durante la migración.
- Definir límites, moneda, opciones y reglas usando el contrato real del campo/API; preservar campos opcionales, parciales y errores del servidor.
- Pasar datos, estado, refs y callbacks explícitos. Fuentes de catálogos, sesión y autorización quedan en el consumidor.
- Añadir una exportación pública explícita cuando se autorice un componente común; conservar su firma original cuando la fachada sólo adapte el import.

## Fuera de la API pública

No se exportan `api`, endpoints, hooks de carga de negocio, credenciales, permisos, mutaciones financieras, repositorios ni un wildcard de `operations`/`ui-v2`/OwnCoding. Tampoco se exportan contextos internos de navegación ni algoritmos de foco/posicionamiento por el mero hecho de existir en esos archivos.

No añadir `export *`, nuevas llamadas de red, reglas RUC/dirección/código postal inferidas, catálogos inventados, cambios de proveedor ni copias del renderer externo. Los estilos globales y tokens mantienen su dueño; estas fachadas no redefinen estilos o componentes por pantalla.

## Dependencias de integración

La entrada une módulos producidos en ramas coordinadas: `button`, `select`, `temporal`/`input-control`, `smart-field`, bases/campos y fachadas. Aplicar esos lotes antes de comprobar el barrel completo. Las bases no deben importar esta entrada, y el integrador debe verificar TypeScript y ciclos sobre el árbol integrado. La validación final debe cubrir el árbol integrado y sus consumidores.
