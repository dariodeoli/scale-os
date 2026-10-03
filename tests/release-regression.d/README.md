# Cadena de regresión en fragmentos (#160)

La cadena que corre `npm run test:release-regression` se arma con los archivos
`*.list` de este directorio (orden lexicográfico; una entrada por línea):

```
node tests/release-version.test.mjs
tsx tests/mi-test.test.tsx
npm run test:docker-build-secrets
```

## Cómo sumar tests (sin conflictos)

1. Creá **tu propio fragmento**: `tests/release-regression.d/<NN>-<slot>-<issue>.list`
   (por ejemplo `40-plt-160.list`). No edites fragmentos de otra rama ni uses
   `00-base.list` para tests nuevos.
2. Una entrada por línea, con `node` o `tsx`; `#` comenta.
3. Corré `npm run test:release-regression` (o
   `node build-tools/run-release-regression.mjs --only <substr>` para tu subset).

Dos ramas que agregan tests crean archivos distintos, así que el merge no
conflictúa y `package.json` queda intacto.

`00-base.list` es el preludio histórico migrado tal cual desde `package.json`
(2026-10-03); se mantiene por compatibilidad de comportamiento, no como lugar
para tests nuevos.
