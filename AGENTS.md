# Reglas operativas — Scale OS

## Comando abreviado `ht` (integrar y desplegar)
- Cuando Dario escribe solo `ht`, ejecutar el ciclo completo sin preguntar: (0) preámbulo: matar servidores zombies (`lsof -ti :3000 :<PUERTO_API> | xargs kill -9` y procesos `next-server` de worktrees de Scale OS) y verificar que no haya otro merge en curso (`.git/MERGE_HEAD` ajeno); (1) `git fetch origin --prune` en scale-os y scale-core-api y relevar ramas con trabajo pendiente; (2) integrar a main una rama por vez (core-api antes que scale-os), verificando el árbol mergeado (API `npm run test:release`; frontend `npm run test:release-regression` + `npx next build`); (3) conflictos: si la rama quedó superseded por main, resolver del lado de main y verificar diff neto vacío; si hay trabajo real en conflicto, parar y preguntar; (4) pushear ambos repos con `MOBOS_INTEGRATOR=1`; (5) desplegar solo con `npm run release:patch` y validar el smoke con `npm run release:smoke` (reintentar hasta que Coolify sirva la versión nueva). Reportar al final qué ramas integraron y la versión desplegada.

## Hook y protección de main (regla obligatoria)
- Nadie pushea ni mergea a `main` salvo el integrador. El hook local `pre-push` bloquea pushes a main sin `MOBOS_INTEGRATOR=1`; instalar en cada checkout con `bash scripts/setup-hooks.sh` (deja `core.hooksPath = .githooks`).
- La protección de rama en GitHub exige los checks de CI en modo strict y tiene force-push deshabilitado; el integrador pushea con `MOBOS_INTEGRATOR=1 git push origin main`.
- Conflicto de merge → parar y consultar con Dario; nunca resolver en silencio.

## Despliegues (regla obligatoria)
- Cada deploy a producción incrementa el parche de versión. Usar siempre `npm run release:patch`: exige árboles limpios, sube la versión, sincroniza footer y versiones (frontend + API), corre regresiones y build, pushea en orden API → interfaz y dispara Coolify; el smoke valida las URLs públicas al final.
- No publicar sin bump de versión ni sin el footer regenerado (`footer:sync` / `footer:check`). Detalle en `VERSIONING.md`.
- La versión visible vive en `release/version.json`, sincronizada con `app/app-version.ts`, `package.json` y el footer.
- Las sesiones de worktree (SOS-01/02/03) nunca despliegan. El deploy es exclusivo del integrador, y solo con pedido explícito.

## Integración a main (regla obligatoria)
- main pertenece al integrador. Ningún agente de worktree hace `git merge`, edita main ni pushea a main: los cambios se integran únicamente a través del integrador.
- Antes de tocar archivos: `git fetch origin --prune && git rebase origin/main`. Conflicto → se resuelve en la rama propia; force-push solo a la rama propia, jamás a main.
- Entrega (handover): commitear por unidad de trabajo (conventional commits, sin atribución de IA), correr la verificación mínima, pushear la rama propia y avisar con: nombre de rama, `git log --oneline origin/main..HEAD`, qué hace cada commit, rutas tocadas y resultado de las verificaciones.
- Después de una integración anunciada, verificar por contenido contra `origin/main` (`git merge-base --is-ancestor <sha> origin/main` + `git show origin/main:<ruta>`), no por memoria. Si algo falta, reaplicarlo sobre main actualizado.
- Estado raro de git (fetch que falla, refs rotas): parar y avisar al integrador. No borrar ni arreglar refs por cuenta propia.
- Matá tus servidores zombies al terminar: `lsof -ti :3000 :<PUERTO_API> | xargs kill -9` (y procesos `next-server` de worktrees de Scale OS).
- Verificación mínima antes de entregar: `npm run test:release-regression` y `npx next build` (el release los corre igual).

## Issues (backlog)
- Cada pedido se trabaja desde un issue: abrirlo en el repo donde vive el cambio principal (frontend → scale-os; API → scale-core-api) y referenciar el otro si aplica.
- En commits y handover citar `Refs #<n>`; el integrador cierra el issue solo después de verificar por contenido contra `main`.

## Checks de entrega obligatorios (frontend)
1. `npm run test:release-regression` en verde (incluye release-version, audit, landing y contracts).
2. `npx next build` exit 0 sin errores de tipos y con artefacto verificado (`.next/BUILD_ID` existe; no alcanza el mensaje de éxito). El prebuild sincroniza versiones y footer.
3. `rg "<<<<<<<" app tests build-tools` sin resultados (nunca commits con marcadores de conflicto).
4. Si tocaste el API (scale-core-api): `npm run test:release` en verde, y toda columna/tabla nueva del schema exige su migración **aditiva, idempotente y re-ejecutable**. No exportar símbolos que no sean handlers de Next en `app/api`, no duplicar slugs dinámicos, y los seeds usan guards por conteo + `on conflict do nothing`, nunca «si el dato no existe, salir».
5. Versión y footer sincronizados: `npm run release:check` y `npm run footer:check` verdes.
6. `npx prisma validate` si tocaste `prisma/`.

## Pedidos de Dario (backlog de issues)
- Un issue por repo, según dónde vive el cambio principal: permisos, migraciones o lógica de API → `dariodeoli/scale-core-api`; UI, formularios o navegación → `dariodeoli/scale-os`. El issue del otro repo se referencia desde el cuerpo (ej. "API: dariodeoli/scale-core-api#N"). Nunca duplicar el mismo pedido en los dos backlogs.
- Al entregar, citá los commits de la rama en el handover y en el issue.
- Si el cambio toca ambos repos sin un lado claro, el issue va al repo del commit bloqueante (datos/permisos → API; experiencia visual → frontend).
- El integrador cierra issues solo después de verificar por contenido contra `origin/main` del repo del issue.

## Roles y permisos (fuente única)
- Roles: `owner`, `admin`, `management` (Gerencia), `finance`, `sales`, `production`, `editor`, `viewer`, `collaborator` (Colaborador). La matriz de capacidades vive en `permissions.js` (API) con overrides por empresa; el NAV se filtra en `app/workspace-access.ts`.
- Regla: **Rol → módulos → acciones → campos**. Todo control mutante nace con gate de rol/capacidad y el API revalida con `roleCan`; `viewer` nunca ve acciones (ocultas, no deshabilitadas).
- Campos sensibles (`salary.view` = owner/admin/finance): `compensation_amount`, `monthly_salary_amount/currency`, `payment_day`, `invoices_company`. La API los sirve en `null` a los demás roles y rechaza su edición (403).
- Equipo: owner/admin/finance ven el panel completo; management ve equipo y accesos sin montos; sales/production/editor/viewer ven el directorio (foto, nombre, cargo).
- Preferencias personales (página inicial, tema, perfil propio por NAV) pertenecen a cada usuario y no dependen de su rol.
- Auditoría de sensibles verificada: team/collaborators (filtrado por campo), dashboard/forecast/salary-overrides (`finance.view`), papelera y actividad (solo nombre y metadatos), superadmin (sin salarios).
- **Equipo (cápsula)**: no muestra el salario individual (solo modalidad y estado); el salario se edita en el diálogo de perfil y se ve únicamente en Finanzas. El pago a colaboradores vive en Finanzas, no en la cápsula de Equipo. Ningún bloque de acciones vacío: si un rol no tiene acciones, el contenedor no se renderiza (nada de objetos al pedo).

## Diseño
- No duplicar identidad ni datos en el shell: empresa en el TopBar, usuario autenticado al pie del Sidebar, versión solo en el footer.
- Montos, fechas y códigos nunca se cortan (nowrap + tabular-nums). Usar las clases compartidas (`kpi-strip`/`kpi-card`, `panel`, `ops-card`, `Dialog`/`Editor`, `SaveActions`) y tokens de `ui-system.css`; nada de estilos inline salvo valores dinámicos.
- Los datos que muestra la UI deben venir del contrato real del API; nunca inventar estados, totales ni métricas.
- **Componentes primitivos (fuente única)**: un solo diseño por tipo que varía únicamente en tamaño, acción y texto — botones (`primary`, `secondary`, `text-button`, `icon-button`), inputs del `Editor`, dropdowns (`SelectCustom`), cápsulas de usuario (`PersonContainer`), buscadores, selectores visibles, popups de edición y creación (`Dialog`/`Editor`), notificaciones, cápsulas de estado, de disponibilidad y de verificación. No crear variantes paralelas.
- **Tamaños de campo por tipo**: moneda 9–11 rem; fecha ~9 rem; hora ~7 rem; número/porcentaje ~7 rem; moneda (select) ~9 rem; texto corto 12–16 rem; notas a ancho completo. Ningún input ocupa una pantalla entera.
- **Iconos de acción** (editar, borrar, archivar, verificar, mover): mismo set y tamaño; al pasar el cursor se oscurecen levemente; al clicar cambian de color (tono semántico); siempre con `title` + `aria-label` que nombran la acción exacta (ej.: "Editar equipo: Memoria SD").
- **WhatsApp**: botón con el icono de WhatsApp. Si la empresa no tiene número, el botón no se muestra y el resto **no se reordena ni se reemplaza** por otro objeto.

## Formatos de listas (tablas densas)
- **Grilla**: encabezado y filas comparten la misma grilla (una sola constante); `gap-x` de 8 px (nunca 12/16); contenedor con scroll horizontal silencioso y etiqueta de la vista cuando no entra.
- **Anchos de columna**: identidad `minmax(Xrem, Nfr)` con el mayor `fr` (ej.: artículos 1.6fr > cliente 1.15fr > serial 0.9fr); categórico corto fijo 2.5–6 rem; fecha fija 5–6.5 rem; monto fijo 5.5–8.5 rem; acciones 8–15 rem.
- **Tipografía por celda**: encabezado 10 px bold uppercase con tracking; encabezado ordenable igual + icono inline con gap 4 px y color de marca cuando la columna está activa; identidad 13.5 px semibold truncada con `title`; dato secundario 11–12 px muted; monto a la derecha, bold, tabular-nums; serial mono 11 px.
- **Fila**: borde redondeado (radio 12), borde sutil + fondo tenue, padding compacto (14 px horizontal, 8 px vertical).
- **Badge**: ancho de contenido, alineado al inicio, sin wrap, padding 6/2 px, 10 px bold.
- **Botón de acción**: alto 32 px, padding 8 px, 12 px sin wrap; los iconos de acción usan el mismo set y tamaño.
- **Fechas**: corta de tabla `dd-MMM` (`17-sept`); completa `dd MMM yy · HH:mm`; reserva `dd-MMM · HH:mm`. Siempre en hora de Asunción.
- **Serial/IMEI**: `SerialTexto` (cabeza + últimos 4 en negrita); enmascarado `••••4821` donde no aporta; la cola nunca se pierde al truncar.
- **Vencimientos**: fecha muted; se pinta (`data-tone="warn"`, semibold) solo si venció o cae dentro de 3–7 días.
- **Fuente única**: `app/list-format.tsx` + `app/list-format.css` (`SerialTexto`, `listDateShort`, `listDateFull`, `dueTone`, `list-amount`, `list-date`, `list-identity`, `list-secondary`). Ninguna lista escribe fechas, seriales o montos a mano.

## Reglas de contenedores y acciones (UI)
- **Alineación**: todo contenedor o cápsula (productos, clientes, personal, proyectos, reservas) alinea su contenido vertical y horizontalmente sin importar el largo del texto: misma altura en cuadrícula, encabezado alineado, hechos/meta alineados por columnas y acciones ancladas al pie. Referencia: tarjetas de Inventario.
- **Acciones en una sola línea**: los botones de acción de una tarjeta nunca se envuelven; son iconos compactos con `title` (tooltip visible al pasar el cursor) y, si no entran en pantallas chicas, scroll horizontal silencioso. La fila de acciones no compite con contenido.
- **Sello de verificación**: check del resultado + foto + primer nombre + fecha/hora en 24 h, centrado verticalmente en su fila; el botón de verificar vive al lado del último verificador, no en la fila de acciones.
- **Espaciado**: gaps y padding consistentes entre objetos laterales y verticales (tokens de `ui-system.css`), sin saltos por largo de texto ni filas colapsadas.
- **Selección múltiple**: donde haya lista o cuadrícula, se puede seleccionar varios y operar en lote (reservar, verificar, mover de ubicación, archivar), con contador "N seleccionados", acción de seleccionar visibles y limpiar; el lote se resuelve en una sola operación por API cuando exista el endpoint.
- **Aplica a TODO contenedor existente y a los nuevos**: al crear uno nuevo o tocar uno existente, adoptar estas reglas tanto en cuadrícula como en lista. Un contenedor que no las cumple es deuda de diseño.

## Reglas de campos (fuente única)
- Un componente por tipo de dato: antes de escribir un input a mano, usá el tipo del `Editor` o el componente compartido que ya cubre el caso; si no existe, se crea ahí (`app/`) y se adopta en TODOS los lugares que hoy escriben a mano. No crear inputs paralelos.
- Teléfono: `app/phone-field.tsx` (+ reglas puras en `app/field-rules.ts`), tipo `phone` del Editor. Guarda `+<código> <dígitos>` (Paraguay: 9 móvil / 8 fijo; resto 6–12); el API revalida con `phone()` en `suite-validation.js`.
- Correo: `app/email-field.tsx`, tipo `email` del Editor (autofill nativo + sugerencias de dominio que no bloquean pegado ni envío); el API valida con `email()`.
- Serial/IMEI: `normalizeSerial()` al tipear (trim, sin separadores, mayúsculas); el API normaliza con `serial()`.
- Moneda: `AmountInput`/`money()` (`app/amount-format.ts`); el símbolo nunca va dentro del valor guardado.
- Contraseña: `PasswordField` (`app/password-field.tsx`). Excepción: el comprobante de eliminación (`app/deletion-danger-zone.tsx`) conserva su contrato propio de foco/aria.
- Fechas `type="date"`/`type="time"`; enteros y porcentajes con `integer:true` (inputMode numeric); decimales con inputMode decimal.
- Mensajes de error: uno por regla, en el módulo compartido; el backend revalida siempre (nunca confiar en el cliente).
- Checklist antes de entregar: ¿usa el componente compartido? ¿respeta defaults (país/moneda)? ¿el API revalida? ¿`npm run test:release-regression` + `npx next build` verdes?
