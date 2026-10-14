# Evidencias de QA

Esta carpeta guarda **solo los informes de texto** de QA (`.md`, `.txt`, `.json`).
Las capturas (`.png`, `.jpg`, `.webp`), los HAR (`.har`, `.har.gz`), los `.zip` y
los logs **no se commitean**: `.gitignore` los ignora y `.dockerignore` excluye
`docs/` completo del contexto de build.

Motivo: en Agendese, las evidencias commiteadas inflaron el contexto de build de
Coolify de 300 MB a 2 GB y el build se cortaba. En Scale OS, `docs/qa` llegó a
232 MB (2.287 imágenes) de los 241 MB rastreados.

## Dónde van las capturas

- **Local:** los scripts de `build-tools/visual-harness/capture-*.mjs` siguen
  escribiendo en `docs/qa/<tanda>/`; git las ignora, así que quedan solo en tu
  máquina.
- **Para compartir:** subilas como artefacto de CI (`actions/upload-artifact`),
  adjuntalas al issue o PR, o publicalas en una carpeta compartida fuera del repo.
  Desde el informe `.md` enlazá a ese artefacto, no a un archivo del repo.

## Recuperar las capturas históricas

Las imágenes que estaban versionadas siguen en el historial de git. Se sacaron
del árbol en el commit que agregó este README; para traer una tanda:

```bash
git checkout de1a12e -- docs/qa/<tanda>
```

## Controles

- `node scripts/verificar-contexto-build.mjs` (y `--context backend`): falla si
  el contexto de build pasa 400 MB o si un archivo pesa más de 5 MB. Corre en
  `npm run release:patch` antes del build.
- `tests/build-context.test.mjs` (en `test:release-regression`): falla si
  `.dockerignore` deja de excluir estas carpetas, si Tailwind escanea fuera de
  las rutas acotadas o si un componente `'use client'` importa la base de datos.
