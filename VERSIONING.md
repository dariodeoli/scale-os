# Versión y footer

Próxima versión preparada: **1.0.13** (12-09-2026, Paraguay). No implica publicación.

`app/app-version.ts` es la única fuente editable de la versión visible del producto. La versión técnica de `package.json` no representa una entrega comercial.

Regla de publicación: cada actualización que llegue a producción incrementa el último número de parche. No publicar sin actualizar la fuente y regenerar la landing. El mismo criterio se aplica a las demás aplicaciones del ecosistema: una única fuente de versión por aplicación y un footer visible.

`app/workspace-footer.tsx` es la única fuente del contenido del footer: panel, login, registro, invitación, espera de acceso y landing. La variante comercial conserva sus enlaces y no incluye el crédito interno ni el aviso de actividad del panel.

La landing sigue siendo HTML estático: `build-tools/sync-landing-footer.tsx` renderiza la variante comercial del mismo componente, con la versión compartida y el año del build, dentro de `public/scale-os.html`. No editar ese footer manualmente. Funciona sin JavaScript, sin consultas a la API y sin carga adicional en el navegador.

Al cambiar la versión o el footer, ejecutar `npm run footer:sync` e incluir el HTML actualizado en la entrega. `npm run dev` y `npm run build` lo sincronizan automáticamente. `npm run footer:check` detecta divergencias sin escribir archivos; `npx tsx --test tests/workspace-footer.test.tsx` comprueba ambas variantes y la salida estática.

Los estilos compartidos viven en `app/workspace-footer.css`, cargado desde los estilos globales. Las pantallas públicas de acceso usan texto de 12 px, interlineado 1,6 y enlaces de 44 px de alto; el tablero conserva sus ajustes de densidad existentes.
