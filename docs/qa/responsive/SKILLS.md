# Skills de diseño verificadas para Scale

Alcance: investigación de fuentes y comandos, sin instalar skills globales, sin ejecutar instaladores ni motores externos. Repos clonados mediante proxy heredado con TLS habilitado.

| Fuente | SHA verificado | Licencia | Carpeta local |
|---|---|---|---|
| https://github.com/Leonxlnx/taste-skill | a9c73c3d5dbf401e3e47f86e7b41f29ede1687df | MIT | /tmp/scale-skill-taste |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | 56ea9cf174ed86786187daa9de0e6247cb0747e4 | MIT | /tmp/scale-skill-pro-max |
| https://github.com/pbakaus/impeccable | 0665bd812ae0908fcab17b96fd4f840defb882d9 | Apache-2.0 | /tmp/scale-skill-impeccable |

## Taste Skill

Skill real: skills/taste-skill/SKILL.md, nombre design-taste-frontend. README: compatible Codex. Instalación oficial documentada, NO ejecutada:

```
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
codex plugin marketplace add Leonxlnx/taste-skill
codex plugin add taste-skill@taste-skill
```

Alternativas, no ejecutar ambas simultáneamente. La página marketing y la app siguen rutas distintas. Para app leer references/app-screens.md; inspector --app. Node22+ y Chrome/Chromium. Inspector default 1440/768/390, datos geométricos y capturas antes/después. Para Scale mantener paleta/tipo con --keep palette,type. Priorizar estructura, primera acción, estados, alineación monetaria, control de overflow. No imponer mínimo de imágenes o animaciones del flujo landing sobre dashboard. Sus bans violeta/sidebar y tablas 2 líneas contradicen marca/AGENTS Scale: prevalece Scale; no crear otro sistema de tokens o biblioteca paralela.

## UI/UX Pro Max

Fuentes: src/ui-ux-pro-max/templates/base/skill-content.md y quick-reference.md, configuración Codex src/ui-ux-pro-max/templates/platforms/codex.json. Nombre ui-ux-pro-max. Instalación oficial documentada, NO ejecutada:

```
npm install -g ui-ux-pro-max-cli
uipro init --ai codex
```

Paquete vigente ui-ux-pro-max-cli; uipro-cli antiguo obsoleto según README. Destino local Codex .agents/skills/ui-ux-pro-max. Soporta --dry-run y --global explícito; para proyecto evitar --global/--force. Datos/scripts Python3 estándar, búsquedas locales sin red. Para auditoría existente usar consultas puntuales --domain ux y --stack nextjs/html-tailwind/react, no regenerar --design-system --persist sobre la fuente canónica existente. Distingue WCAG2.2 AA target24 CSSpx o excepción vs recomendación touch44px; no confundir pt/dp nativos con CSSpx. Verificar resultados recuperados, no tratarlos como reglas superiores.

## Impeccable

Skill plugin/skills/impeccable/SKILL.md v4.6.0; audit/adapt en reference/. Instalación oficial documentada, NO ejecutada:

```
npx impeccable install --providers=codex --scope=project --no-hooks
```

README Codex usa $impeccable; instalación local .agents/skills. Sin --no-hooks crea .codex/hooks.json; trust se aprueba en /hooks de Codex y no debe fingirse desde terminal. Lanzador ejecuta binario nativo, puede descargar release en primer uso; hook puede ejecutarlo automáticamente. No ejecutar ni instalar binario/hook para investigación. No sobrescribir hooks propios.

Audit es modo diagnóstico (no edita), después adapt/polish implementan petición ya autorizada. Modo correcto para Scale interno Operate: precisión y consistencia encima de expresión; landing Persuade. Cinco dimensiones: accesibilidad, rendimiento, temas, responsive, integridad. Findings P0-P3 verificables, guardar ruta/línea, viewport, medida, impacto y resultado después. No dar score perfecto sin comprobar. Impeccable pide contexto y detector; si no se ejecutaron, declararlo y usar documentación/proyecto directamente.

## Recomendación aplicada

1. Un solo dueño de primitivos CSS/OwnCoding; agentes por dominios y QA sin editar las mismas rutas.
2. Matriz 320,375/390,768,1024,1440 y landscape; check orientación, teclado/focus/Escape, diálogo+scroll, hover/touch, inputs, logos, encabezados+columnas y montos.
3. A/B visual en Chromium más geometría: documento sin overflow; scroll de tabla intencional en contenedor; nada cortado/inaccesible. Campos y acciones principales funcionando.
4. P0/P1 primero; no rediseñar tokens ni marca por preferencias externas. Validar escritorio tras ajustes móviles.
5. Declarar pruebas reales: viewport emulado no equivale a Safari ni teléfono físico, screenshot no demuestra drag/touch ni teclado virtual.
6. El código existente de Scale y AGENTS/WORKFLOW/DESIGN-SYSTEM prevalecen sobre cualquier recomendación externa.

Licencias permisivas verificadas, conservar notices si se vendorizan/copían recursos. Licencias de imágenes/terceros son independientes y requieren revisión individual; para Scale preferir assets reales existentes. No se instaló nada global ni se modificó la app en esta tarea.

## Enlaces inmutables de fuentes leídas

- [Taste SKILL](https://github.com/Leonxlnx/taste-skill/blob/a9c73c3d5dbf401e3e47f86e7b41f29ede1687df/skills/taste-skill/SKILL.md) y [reglas app](https://github.com/Leonxlnx/taste-skill/blob/a9c73c3d5dbf401e3e47f86e7b41f29ede1687df/skills/taste-skill/references/app-screens.md).
- [Pro Max plantilla de skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/56ea9cf174ed86786187daa9de0e6247cb0747e4/src/ui-ux-pro-max/templates/base/skill-content.md), [referencia](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/56ea9cf174ed86786187daa9de0e6247cb0747e4/src/ui-ux-pro-max/templates/base/quick-reference.md) y [Codex](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/56ea9cf174ed86786187daa9de0e6247cb0747e4/src/ui-ux-pro-max/templates/platforms/codex.json).
- [Impeccable SKILL](https://github.com/pbakaus/impeccable/blob/0665bd812ae0908fcab17b96fd4f840defb882d9/plugin/skills/impeccable/SKILL.md), [audit](https://github.com/pbakaus/impeccable/blob/0665bd812ae0908fcab17b96fd4f840defb882d9/plugin/skills/impeccable/reference/audit.md) y [adapt](https://github.com/pbakaus/impeccable/blob/0665bd812ae0908fcab17b96fd4f840defb882d9/plugin/skills/impeccable/reference/adapt.md).
