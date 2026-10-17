# Objetos, formularios e inventario — campaña #221

Fecha: 17 de octubre de 2026, Paraguay. Issues de implementación: #224 y #226.

## Cambio

- `SelectCustom` conserva su contrato y delega los selectores de personas en
  `BuscadorPersonas` de `owncoding-ui@0.68.7`: búsqueda, nombre, avatar,
  selección vacía y selección por teclado. `EntityPicker` para personas delega
  en ese mismo objeto; los listados de facturas/clientes conservan su contexto.
- `Editor` admite anchos relativos de campo y placeholders; la grilla común
  admite campos más compactos sin cambiar sus validaciones ni guardados.
- Inventario muestra Editar directamente en cuadrícula, desde la misma lista
  de acciones que usa la vista de lista. El formulario distribuye los campos
  en una grilla de doce columnas y conserva una columna en móvil.
- Valor del equipo empieza vacío con placeholder `0`; un cero guardado se
  conserva. Vacío sigue significando valor sin registrar y se guarda como cero.
- Propiedad se registra explícitamente: sin registrar, empresa o persona del
  equipo. Es independiente del custodio. No se atribuyen equipos existentes
  por el nombre del artículo ni se supone que pertenecen a una persona.
- Propiedad admite cambios individuales y masivos, valida miembros activos
  de la empresa al asignar y audita antes/después. Una propiedad histórica
  intacta sobrevive a la baja del miembro. El lote es transaccional.
- Nombres/fotos de inventario se resuelven por la identidad canónica de la
  organización y las imágenes embebidas se convierten en URLs autenticadas.
- Crear cuenta usa `BancoCombobox` del paquete compartido, con logos y catálogo
  paraguayo. Admite nombres personalizados y conserva el contrato de la API.
- `FormActions` impide que un formulario dentro de `details` cerrado, un
  ancestro `hidden` o `inert` publique botones en el pie fijo del diálogo.
  Abrir/cerrar registra y retira las acciones sin duplicarlas. Se mantiene la
  asociación nativa entre el botón del portal y su formulario.

## Integración requerida

Registrar `20261017_inventory_ownership.sql` en `backend/server.js` y
`backend/scripts/migration-order.mjs`, después de las migraciones existentes
del inventario. Es aditiva e idempotente: las filas existentes quedan como
`unspecified`, sin propietario asignado. Amplía la lista de eventos auditables.
El integrador administra ambos registros; esta rama no los modifica.

El selector acepta opciones `{value,label,photoUrl,secondary,kind:'person'}`.
Los consumidores que solo conocen el nombre muestran iniciales. Los datos
de personas de tareas ya incluían foto desde el servidor; se tipó y conectó
esa foto en el filtro y en los responsables.

## Validación

- TypeScript y build de Next: PASS.
- Backend `test:release`: las 46 suites PASS.
- Inventario focal: 235 casos API PGlite PASS; validación, propiedad,
  auditoría, lote, aislamiento y mantenimiento PASS.
- PostgreSQL 17.11 real: siete carreras de handlers y una carrera GiST PASS.
  Se acreditó el bloqueo entre dos PIDs, la cadena de auditoría de propiedad
  concurrente y el rechazo de un propietario ajeno sin modificación parcial.
  Clúster temporal detenido y eliminado al terminar.
- Alta de inventario: once pruebas PASS, incluidos importe vacío/cero guardado
  y propiedad separada del custodio.
- Editor, diálogos, tareas, cuentas y banco personalizado: focales PASS.
- Chromium real a 390 px: regresión del pie del diálogo PASS. Reproduce
  Editor real en `details`, abrir/cerrar/reabrir, guardado nativo una sola vez
  y aparición/desaparición por `hidden`. Ejecutar con:

  ```bash
  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium node tests/dialog-footer-browser.test.mjs
  ```

La regresión de navegador requiere Chromium instalado y se ejecuta separada
de la cadena habitual de Node. No representa una prueba en dispositivo físico.
El banco no hace consultas externas ni obtiene saldos: usa el catálogo y los
assets ya incluidos en `owncoding-ui`. El deploy corresponde al integrador.
