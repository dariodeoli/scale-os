import assert from 'node:assert/strict';

// Piezas del detalle de proyecto (#58): negociación de `?project_id=`, red de
// seguridad del cliente y resumen de las piezas que no se listan.

require.extensions['.css']=()=>{};
const {PROJECT_PIECES_FIELDS,PROJECT_PIECES_LIMIT,PROJECT_FILTER_PROBE_ID,projectFilterHonored,projectFilterHonoredByProbe,projectFilterProbeUrl,projectPiecesUrl,piecesOfProject,remainingPiecesLabel,fetchProjectPieces,projectFilterState,resetProjectFilterSupport}=require('../app/project-pieces') as typeof import('../app/project-pieces');
type ProjectPiece=import('../app/project-pieces').ProjectPiece;

const piece=(id:string,projectId:string|number):ProjectPiece=>({id,title:`Pieza ${id}`,status:'editing',project_id:projectId});

// URL: con soporte viaja el filtro; sin soporte, la lista completa con la misma proyección.
const withFilter=projectPiecesUrl('7',{supported:true});
assert(withFilter.startsWith('/api/agency/work-orders?project_id=7&'),'con soporte el filtro viaja primero');
assert(withFilter.includes(`fields=${PROJECT_PIECES_FIELDS}`),'la proyección es la mínima del detalle');
assert(withFilter.includes(`limit=${PROJECT_PIECES_LIMIT}`),'la lista va acotada');
const withoutFilter=projectPiecesUrl('7',{supported:false});
assert(!withoutFilter.includes('project_id='),'sin soporte no se manda el parámetro');
assert(!withoutFilter.includes('limit='),'sin filtro NO se manda tope: la lista completa es la única que no pierde piezas del proyecto');
assert(projectPiecesUrl('7',{supported:true,offset:50}).includes('offset=50'),'la paginación viaja cuando se pide');
assert.equal(projectFilterProbeUrl(),`/api/agency/work-orders?project_id=${PROJECT_FILTER_PROBE_ID}&fields=id&limit=1`,'la prueba usa un proyecto imposible y una sola fila');
assert.equal(projectFilterHonoredByProbe([]),true,'sin filas el API respeta el filtro');
assert.equal(projectFilterHonoredByProbe([piece('1','7')]),false,'si devuelve filas con un proyecto imposible, el parámetro se ignora');
assert.notEqual(projectPiecesUrl('7',{supported:true}),projectPiecesUrl('7',{supported:false}),'los dos caminos se distinguen');

// Negociación: filas del proyecto ⇒ soportado; filas ajenas ⇒ ignorado; vacío ⇒ inconcluso.
assert.equal(projectFilterHonored([piece('1','7'),piece('2','7')],'7'),true);
assert.equal(projectFilterHonored([piece('1','7'),piece('2','9')],'7'),false);
assert.equal(projectFilterHonored([],'7'),null,'sin filas no se decide (y el próximo proyecto reintenta)');
assert.deepEqual(piecesOfProject([piece('1','7'),piece('2','9')],'7').map(row=>row.id),['1'],'la red de seguridad filtra igual');

// Resumen del resto.
assert.equal(remainingPiecesLabel(3000,50),'y 2950 piezas más: el detalle completo está en el tablero de Producción.');
assert.equal(remainingPiecesLabel(51,50),'y 1 pieza más: el detalle completo está en el tablero de Producción.');

// fetchProjectPieces: prueba una vez y recuerda el soporte; siempre filtra por proyecto.
async function run(){
 resetProjectFilterSupport();
 const calls:string[]=[];
 const honoring=async(url:string)=>{calls.push(url);return url.includes(`project_id=${PROJECT_FILTER_PROBE_ID}`)?[]:url.includes('project_id=')?[piece('1','7')]:[piece('1','7'),piece('2','9')];};
 const first=await fetchProjectPieces('7',honoring);
 assert.equal(calls.length,2,'la primera vez prueba (proyecto imposible) y después pide las piezas');
 assert.equal(calls[0].includes(PROJECT_FILTER_PROBE_ID),true,'la prueba es la del proyecto imposible');
 assert.equal(projectFilterState(),true,'queda recordado que el API respeta el filtro');
 assert.deepEqual(first.map(row=>row.id),['1']);
 const before=calls.length;
 await fetchProjectPieces('7',honoring);
 assert.equal(calls.length,before+1,'la segunda vez no vuelve a probar');
 assert.equal(calls[before].includes('project_id=7'),true,'usa el filtro');
 assert.equal(calls[before].includes('limit='),true,'y con filtro la lectura va acotada');

 resetProjectFilterSupport();
 const ignoring=async(url:string)=>{calls.push(url);return [piece('1','7'),piece('2','9')];};
 const fallback=await fetchProjectPieces('7',ignoring);
 assert.equal(projectFilterState(),false,'un API que ignora el parámetro queda marcado como sin soporte');
 assert.deepEqual(fallback.map(row=>row.id),['1'],'el resultado es el mismo con o sin soporte del API');
 assert.equal(calls[calls.length-1].includes('limit='),false,'sin soporte no se acota: se pide la lista completa con proyección mínima');

 resetProjectFilterSupport();
 const empty=async()=>[];
 await fetchProjectPieces('7',empty);
 assert.equal(projectFilterState(),true,'un API sin filas para el proyecto imposible se considera con soporte');
 await fetchProjectPieces('7',empty);
 assert.deepEqual((await fetchProjectPieces('7',empty)).map(row=>row.id),[],'un proyecto sin piezas devuelve vacío');

 console.log('PASS project-pieces: negociación de ?project_id=, red de seguridad del cliente y resumen del resto.');
}
void run();
