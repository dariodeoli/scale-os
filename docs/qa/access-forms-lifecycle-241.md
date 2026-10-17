# #241 · Ciclo de formularios de acceso

Base `e0eecafa`, rama `codex/ui-access-forms`. Cambios sólo frontend, sin endpoints, versiones, dependencias ni política de credenciales nueva.

## Consumidores y decisiones

- Portal: `/cliente/ingresar`, `/cliente/invitacion`, `/cliente/recuperar` (solicitar enlace y reset).
- Panel: `/recuperar-cuenta`, `/verificar-correo` (reenvío), `/invitacion`.
- Registro: `/registro` conserva sus estados Identidad→Acceso→Agencia y la resolución de cuenta existente previa a pedir agencia.

Las seis acciones manuales usan `useSingleFlightSubmit` y `PendingFields` existentes: bloqueo síncrono antes de validación/red y recuperación al terminar. El fieldset exterior conserva los hijos directos de form/sección y sus reglas CSS; `display:contents` no elimina la semántica nativa disabled. Nombre de la invitación interna pasa a estado controlado: bloquear controles no puede vaciar su payload al construir FormData.

Registro mantiene deliberadamente su única ref `inFlight`: abarca resolver identidad, alta final con Google y alta por correo. Hooks separados permitirían carreras entre acciones. Adopta PendingFields para bloquear también agencia, moneda y consentimientos, además del primer paso. Se conservan consentimientos explícitos, privacidad, destinos allowlist, demo→cuenta real y credenciales históricas sin mínimo nuevo de alta.

Los errores generales conservan datos y se enfocan tras terminar pending; no se adivina un campo a partir del mensaje backend. Corregir otro dato no borra arbitrariamente ese error general; un nuevo intento lo revalida. Los errores de consentimiento sólo se retiran al aceptar. Los enlaces públicos de privacidad/derechos siguen accesibles: no se usa inert ni interceptación general de anchors. Navegación alternativa de formularios pendientes se bloquea explícitamente.

`ProviderSignIn` corrige una vez la rama href: con disabled renderiza botón nativo `type=button`, mismo contenido/clase, sin enlace navegable. Portal y registro lo consumen; no se simula deshabilitación sólo con estilo.

Verificación automática de correo comparte una promesa por instancia entre suscripciones del efecto: React StrictMode puede repetir el efecto, pero no la petición que consume el token. Mantiene los destinos fijos pendiente/producción/inicio. Al desmontar cancela el timer e impide navegación tardía; no cambia las respuestas genéricas de reenvío ni el mensaje de rate limit.

## Evidencia local reproducible

```
node_modules/.bin/tsx --test tests/access-form-lifecycle-241.test.tsx tests/invitation-page.test.tsx tests/client-portal-integration.test.tsx tests/registration-consent-e2e.test.tsx tests/password-panel.test.tsx
#31 tests PASS
node tests/registration-flow.test.mjs
#PASS
node_modules/.bin/tsc --noEmit --incremental false
#exit0
node tests/access-forms-browser-241.test.mjs
#Chromium real PASS
```

La prueba browser compila el CSS local con el pipeline Tailwind existente, bloquea red externa y usa transporte sintético en loopback. Cubre las siete rutas y reset, `:disabled` nativo de todos los inputs/buttons/selects del fieldset, doble requestSubmit, consentimiento sin mutación, payload de nombre preservado, error/foco/borrador, OAuth alternativo bloqueado, token verify1POST en StrictMode de desarrollo, registro1366×768 y390×844 claro/oscuro sin overflow horizontal. No afirma equivalencia visual completa con todas las páginas productivas: usa un host de prueba y las composiciones reales.

Componentes cubren además reintento, contraseña existente corta, respuesta genérica de privacidad aun si el transporte agrega datos,429 conservado y destinos de verificación con timer cancelado al desmontar.

No se llamó OAuth, email ni cuentas de producción. No se ejecutó build ni regresión completa propios: el integrador valida el candidato conjunto. Deploy pendiente de integración y verificación.
