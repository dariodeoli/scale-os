"use client";
import {TrashWorkspace} from '../archive-controls';

// Papelera (restaurar registros).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type PapeleraSectionProps = {
  load: () => Promise<void>;
};
export function PapeleraSection({load}: PapeleraSectionProps){
  return (
    <TrashWorkspace refresh={load}/>
  );
}
