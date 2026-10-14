// Fuente concatenada de Equipo para los contratos de código (#186): la sección
// vive en `team-workspace.tsx` (lista/cuadrícula), la ficha en
// `team-person-sheet.tsx` + `person-sheet.tsx`, y `operations.tsx` conserva el
// `Editor` y el directorio de solo lectura.
import {readFileSync} from 'node:fs';

const read = (path: string) => readFileSync(new URL(`../app/${path}`, import.meta.url), 'utf8');

export const teamWorkspaceSource = () => read('team-workspace.tsx');
export const teamSheetSource = () => read('team-person-sheet.tsx') + '\n' + read('person-sheet.tsx');
export const teamSource = () => [teamWorkspaceSource(), teamSheetSource(), read('operations.tsx')].join('\n');
