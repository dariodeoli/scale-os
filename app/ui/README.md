# Biblioteca interna de ScaleOS

`index.ts` es la entrada tipada de fundamentos y adaptadores de campos locales. Los imports de hoja (`./ui/button`, `./ui/input`) evitan arrastrar componentes ajenos al consumidor.

## Contratos

| Modelo | Canónico | API / composición |
|---|---|---|
| Acción | Button | variant primary/secondary/outline/ghost/danger; size compact/medium/large; icon, iconPosition, loading, disabled, fullWidth, color, iconOnly; props HTML y ref. type por defecto button; submit explícito |
| Entrada visual | Input / Textarea | Props HTML y ref, sin transformaciones ni validaciones comerciales. TextField, EmailField, PhoneField y PasswordField componen Input |
| Fecha / hora | DateInput / TimeInput / DateTimeInput | Props HTML y ref; strings civiles, min/max/step del consumidor, control de calendario nativo. Sin conversión UTC |
| Búsqueda | SearchField | value + onChange(string), label/ariaLabel, clearable, invalid/describedBy. Limpiar no envía formulario y devuelve foco |
| Overlay | Dialog / ConfirmDialog | Modal y drawer sobre la misma primitiva; tamaños y acciones por props. SaveActions conserva asociación al formulario real en el portal |
| Selección sencilla | SelectCustom de profile-controls | SelectProps / SelectChoice tipados; disabled por opción, loading/error/vacío, búsqueda y metadatos. Fuente de datos del consumidor |
| Combobox / varias personas | PersonSelect / AssigneePicker | Modelos existentes distintos por interacción. AssigneePicker incluye reglas de identificadores/estado activo: adaptador comercial, no exportarlo como genérico |
| Identidad | FotoPerfil + PersonContainer / ActorIdentity | Una base para foto/logo/fallback. Confianza y auditoría se resuelven en adaptadores y origen del dato |
| Listas / superficies / estados | ui-v2 + ui-system.css | Composición local existente; no exportar ui-v2 como paquete genérico porque importa formatos y contexto de Scale |

## Qué puede compartirse

`button.tsx`, `input.tsx` y `temporal-input.tsx` son candidatos puros. La entrada interna completa no es un paquete externo: PhoneField y EmailField usan contratos de Scale y la política de fotos reconoce sus medios internos. Mantener esos adaptadores dentro de la aplicación. No exportar permisos, endpoints, roles, monedas comerciales o reglas de responsables a OwnCoding UI.

## Reglas de uso

- Cambiar el modelo base una sola vez; texto/ícono/acción se eligen desde props.
- No crear CreateClientButton, SaveButton ni variantes por pantalla.
- `Button loading` bloquea interacción nativa; el consumidor conserva además el guard de envío y su ciclo de error.
- Las clases semánticas heredadas se conservan durante la migración. Button infiere su apariencia cuando una clase dinámica usa primary/secondary/text-button; una prop variant explícita tiene prioridad.
- No recortar valores cargados. Validar al corregir un campo, conservar errores y no resetear los demás.
- Un lookup solo propone datos. Aplicar/Descartar requiere una decisión explícita antes de sustituir el borrador; campos deshabilitados y claves ajenas se excluyen.
- País/ciudad/departamento, unicidad RUC, permisos y consultas son responsabilidad del módulo/API.
- El tema usa los tokens existentes en globals.css/ui-system.css; no hay colores por módulo en componentes genéricos.

## Catálogo local

Con la build disponible:

```sh
SCALE_UI_CATALOG=1 npm run start -- --hostname 127.0.0.1 --port 4891
```

Abrir `/ui-catalog`. Sin la variable, devuelve 404. El catálogo no llama a APIs de clientes ni consulta proveedores; los datos son ilustrativos. Su formulario simula un fallo para comprobar que conserva borrador y foco. Los controles temporales nativos dependen del idioma y capacidades del navegador; no se acredita un calendario personalizado con confirmación separada ni un selector de rueda móvil propio.

`lookup.confirmedByProvider` se usa solo si el adaptador de consulta ya pidió una confirmación explícita a la persona antes de resolver `run` (como ClientEditor/RucConfirmCard). No significa que los datos del proveedor sean una autorización para sobrescribir campos. Los lookups genéricos conservan la confirmación del Editor por defecto.
