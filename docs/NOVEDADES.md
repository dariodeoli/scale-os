# Novedades de Scale OS

Acumulativo por versión, en lenguaje de producto. Lo mantiene el integrador en cada ciclo `hd`.

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
