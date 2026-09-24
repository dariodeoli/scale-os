/**
 * Piezas del detalle de proyecto (ronda 7, #58): contrato `?project_id=` con
 * negociación segura.
 *
 * El API todavía no acepta `?project_id=` (issue #58). Para no perder piezas, la
 * primera lectura decide el soporte con una prueba **decisiva**: pide
 * `?project_id=<id imposible>&limit=1`; si el API respeta el filtro devuelve 0
 * filas, y si lo ignora devuelve 1 (una fila de verdad). Con el filtro sin
 * confirmar, el detalle pide la lista completa con la proyección mínima y la
 * acota al dibujar (nunca se manda `limit` sin filtro: eso dejaría piezas afuera).
 * La lista que se dibuja siempre se filtra por proyecto en el cliente, así que
 * el resultado es el mismo con o sin soporte del API.
 */

/** Proyecto imposible para la prueba de soporte (ids bigint reales nunca lo usan). */
export const PROJECT_FILTER_PROBE_ID='999999999';
/** Campos que dibuja el detalle (proyección mínima del API). */
export const PROJECT_PIECES_FIELDS='id,title,status,due_date,due_time,project_id';
/** Piezas que lista el detalle antes de resumir el resto. */
export const PROJECT_PIECES_LIMIT=50;

export type ProjectPiece={id:string;title:string;status:string;due_date?:string|null;due_time?:string|null;project_id?:string|number};

/** ¿La respuesta respeta el filtro por proyecto? `null` si no hay filas para decidir. */
export function projectFilterHonored(rows:ProjectPiece[],projectId:string):boolean|null{
 if(!rows.length)return null;
 return rows.every(row=>String(row.project_id??'')===String(projectId));
}

/**
 * URL de las piezas del detalle. Con soporte viaja el filtro y la ventana; sin
 * soporte se pide la lista completa con la misma proyección (el cliente filtra y
 * el tope se aplica al dibujar, así no se pierde ninguna pieza del proyecto).
 */
export function projectPiecesUrl(projectId:string,{supported,limit=PROJECT_PIECES_LIMIT,offset=0}:{supported:boolean;limit?:number;offset?:number}):string{
 const query:string[]=[];
 if(supported){query.push(`project_id=${encodeURIComponent(projectId)}`,`limit=${limit}`);if(offset)query.push(`offset=${offset}`);}
 query.push(`fields=${PROJECT_PIECES_FIELDS}`);
 return `/api/agency/work-orders?${query.join('&')}`;
}

/** URL de la prueba de soporte: un proyecto imposible no debe devolver filas. */
export function projectFilterProbeUrl():string{
 return `/api/agency/work-orders?project_id=${PROJECT_FILTER_PROBE_ID}&fields=id&limit=1`;
}

/** ¿El API respeta `?project_id=`? La prueba es decisiva (0 filas = sí). */
export function projectFilterHonoredByProbe(rows:ProjectPiece[]):boolean{
 return rows.length===0;
}

/** Piezas del proyecto dentro de la respuesta (red de seguridad del cliente). */
export function piecesOfProject(rows:ProjectPiece[],projectId:string):ProjectPiece[]{
 return rows.filter(row=>String(row.project_id??'')===String(projectId));
}

/**
 * Soporte del filtro por proyecto en esta sesión: `null` = sin probar, `true` =
 * el API lo respeta, `false` = lo ignora (se sigue con la lista completa).
 */
let projectFilterSupported:boolean|null=null;
export function projectFilterState(){return projectFilterSupported;}
/** Reinicia la negociación (tests). */
export function resetProjectFilterSupport(){projectFilterSupported=null;}

/**
 * Piezas del proyecto para el detalle. La primera vez decide el soporte con la
 * prueba del proyecto imposible; después pide con filtro + ventana (si el API lo
 * respeta) o la lista completa con proyección mínima (si no). Siempre devuelve
 * solo las piezas del proyecto (red de seguridad del cliente).
 */
export async function fetchProjectPieces(projectId:string,fetcher:(url:string)=>Promise<ProjectPiece[]>){
 if(projectFilterSupported===null){
  const probe=await fetcher(projectFilterProbeUrl());
  projectFilterSupported=projectFilterHonoredByProbe(probe);
 }
 const rows=await fetcher(projectPiecesUrl(projectId,{supported:projectFilterSupported===true,limit:PROJECT_PIECES_LIMIT}));
 return piecesOfProject(rows,projectId);
}

/** Texto del resumen cuando la lista quedó acotada. */
export function remainingPiecesLabel(total:number,shown:number):string{
 const remaining=Math.max(0,total-shown);
 return `y ${remaining} pieza${remaining===1?'':'s'} más: el detalle completo está en el tablero de Producción.`;
}
