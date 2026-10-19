# Parches compatibles de dependencias — Refs #277

Base: main195 `fca3c8e5`, 19 octubre 2026 UTC. No cambia versión de producto,
OwnCoding UI19, esquema, rutas ni reglas de permisos.

| Paquete | Antes → después | Motivo y alcance |
| --- | --- | --- |
| Next |15.5.24 →15.5.27| Parches de cache poisoning SSG/ISR en servidor propio, GHSA-4jqv-mc3x-m676 / GHSA-mcj8-r9mp-w47p. Misma rama15.5; no salto a Next16. |
| sharp |0.35.4 →0.35.5| GHSA-wq5f-xc86-pv6w, librsvg. Dependencia directa API y opcional transitiva Next; override raíz fija el parche también en frontend. La API procesa imágenes de usuarios y conserva límites de píxeles/formatos. |
| source-map-js |1.2.1 →1.2.2| GHSA-68fv-2mgg-jv7q, DoS al procesar offsets de sourcemaps. Override patch para PostCSS y consumidores. |

Se generaron ambos locks con npm, sin `--force`, sin edición manual del lock y
sin instalar sobre dependencias compartidas. Ambos conservan OwnCoding
`v0.68.19` / commit `7cf63ad530384b2887551ddb50c9261270762202`.

## Auditoría npm y riesgos pendientes

- Antes: raíz19 hallazgos agregados (14 high,5 moderate); backend1 high.
- Después de estos tres parches: raíz11 (5 high,6 moderate); backend0.
- Raíz con `npm audit --omit=dev --json`:4 moderate,0 high (cadena
  gray-matter/js-yaml/argparse/sprintf-js). Omitir dev aquí sirve para distinguir
  alcance; el informe completo y los riesgos del toolchain siguen registrados.
- Los conteos incluyen consumidores indirectos del mismo aviso; no son19 ni11
  vulnerabilidades independientes. La clasificación agregada cambia al resolver
  las ramas más graves; por eso puede subir el contador moderate al bajar high.
- Residual **braces <=3.0.3**: el registro sólo publica hasta3.0.3. Afecta el
  procesamiento de patrones de Tailwind/chokidar/micromatch/fast-glob durante
  build/dev. No se alimenta aquí con patrones enviados por usuarios del API.
- Residual **sprintf-js <=1.1.3**: el registro sólo publica hasta1.1.3. Cadena
  gray-matter → js-yaml → argparse; el contenido editorial se compila desde el
  repositorio. No se declara eliminación del riesgo ni se sustituye el parser
  editorial por una implementación distinta durante este parche.
- Residual **postcss-selector-parser <7.1.6**: hay parche7.1.6, pero Tailwind3 y
  postcss-nested6 requieren6.x. El changelog7.0 cambia inserciones durante
  iteración. No se fuerza un major transitivo sin validar equivalencia de la
  compilación CSS; queda como actualización de toolchain por acreditar.

No se usa una opción de exclusión para ocultar estos resultados. Los informes
completos de npm están al lado de este documento. La API de Dependabot devolvió
403 a esta integración; la fuente aquí es npm audit, no una lectura de alertas
privadas de GitHub. Los hallazgos residuales mantienen abierto #277.

## Validación focal

- Backend `npm ci --no-audit` propio: PASS, lock congelado.
- `cd backend && node test-media.mjs`: PASS; decodificación/resize, limpieza,
  límites, rechazo de documentos/SVG/oversize.
- `cd backend && node test-agency-media.mjs`: PASS; imágenes internas/ETag304,
  externos, permisos/empresa y listados sin base64.
- `cd backend && npm audit --json`:0 hallazgos.
- Raíz `npm audit --json`:11 residuales descritos arriba.

El integrador corre build/regresión/CI finales con estos locks sobre el árbol
consolidado. No se afirma deploy ni mitigación productiva antes de esa evidencia.
Reversión: revertir juntos los cuatro manifiestos/locks y reconstruir; conserva
datos, fotos y documentos, aunque reintroduce los avisos anteriores.
