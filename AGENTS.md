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
- Verificación mínima antes de entregar: `npm run test:release-regression` y `npx next build` (el release los corre igual).

## Checks de entrega obligatorios (frontend)
1. `npm run test:release-regression` en verde (incluye release-version, audit, landing y contracts).
2. `npx next build` exit 0 sin errores de tipos.
3. `rg "<<<<<<<" app tests build-tools` sin resultados (nunca commits con marcadores de conflicto).
4. Si tocaste el API (scale-core-api): `npm run test:release` en verde, y toda columna/tabla nueva del schema exige su migración idempotente.
5. Versión y footer sincronizados: `npm run release:check` y `npm run footer:check` verdes.

## Roles y permisos (fuente única)
- Roles: `owner`, `admin`, `management` (Gerencia), `finance`, `sales`, `production`, `editor`, `viewer` (Solo lectura). La matriz de capacidades vive en `permissions.js` (API) con overrides por empresa; el NAV se filtra en `app/workspace-access.ts`.
- Regla: **Rol → módulos → acciones → campos**. Todo control mutante nace con gate de rol/capacidad y el API revalida con `roleCan`; `viewer` nunca ve acciones (ocultas, no deshabilitadas).
- Campos sensibles (`salary.view` = owner/admin/finance): `compensation_amount`, `monthly_salary_amount/currency`, `payment_day`, `invoices_company`. La API los sirve en `null` a los demás roles y rechaza su edición (403).
- Equipo: owner/admin/finance ven el panel completo; management ve equipo y accesos sin montos; sales/production/editor/viewer ven el directorio (foto, nombre, cargo).
- Preferencias personales (página inicial, tema, perfil propio por NAV) pertenecen a cada usuario y no dependen de su rol.
- Auditoría de sensibles verificada: team/collaborators (filtrado por campo), dashboard/forecast/salary-overrides (`finance.view`), papelera y actividad (solo nombre y metadatos), superadmin (sin salarios).

## Diseño
- No duplicar identidad ni datos en el shell: empresa en el TopBar, usuario autenticado al pie del Sidebar, versión solo en el footer.
- Montos, fechas y códigos nunca se cortan (nowrap + tabular-nums). Usar las clases compartidas (`kpi-strip`/`kpi-card`, `panel`, `ops-card`, `Dialog`/`Editor`, `SaveActions`) y tokens de `ui-system.css`; nada de estilos inline salvo valores dinámicos.
- Los datos que muestra la UI deben venir del contrato real del API; nunca inventar estados, totales ni métricas.

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
