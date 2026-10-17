# Consultas confirmables · #241

`app/ui/smart-field.tsx` contiene UI sin fuentes, endpoints, permisos, formato RUC ni reglas comerciales.

- `LookupField`: compone `Field`, `InputBase` y `Button`. Conserva ref/eventos nativos y valor crudo. Recibe label/help/error, estado `idle/loading/found/not-found/error/conflict`, mensaje, acción de búsqueda y política de disponibilidad (`allowed/reason`). Consultar bloquea la acción, permite seguir editando y no modifica el valor. El consumidor valida y normaliza en la frontera de consulta.
- `LookupReview`: grupo de revisión con contenido y evidencia aportados por el consumidor, más Aplicar/Descartar explícitos. Ambos botones tienen `type=button`; montar o encontrar no aplica datos.

Uso real: `Editor` renderiza LookupField para `Field.lookup`; `client-ruc.tsx::RucConfirmCard` compone LookupReview. La normalización y el proveedor siguen en `client-ruc.tsx`/backend. El resultado real sólo aporta nombre, RUC, estado, fuente y fecha; no se agregan ciudad, dirección, email ni teléfono.

`Field.lookup.run(value, context?)` recibe opcionalmente `{signal,snapshot,onReview}`. `onReview()` cambia la presentación de consulta de red a revisión sin resolver ni aplicar. `onApplied` sólo corre después de comprobar que origen y destinos siguen iguales a la instantánea. `errorState` permite diferenciar falta de resultado de fallo usando evidencia del consumidor; no clasifica por texto de error. Se preservan consumidores de un argumento.

Uso correcto: previsualizar un registro encontrado, confirmar y aplicar sólo si el borrador no cambió. Ante conflicto, conservar el borrador y pedir otra consulta. Uso incorrecto: poner un endpoint, obtener permisos por label, inferir CI desde RUC, autocompletar propiedades que la fuente no entrega, convertir coincidencia de contacto en identidad autenticada o escribir al encontrar.

La selección de fichas existentes usa `Selector` canónico como otra operación: abrir una ficha existente no aplica ni crea nada en el borrador nuevo.
