import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #103 Inventario — cards, lista y ubicaciones: guarda de la corrección.
// Fija la estructura compacta (grilla compartida, sin filas vacías, placeholder
// limpio, acciones en una sola zona, KPIs acotados) y que no se oculte nada
// crítico: lo que no existe se dice en corto o viaja en tooltip.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const inventory=read('app/inventory-workspace.tsx');

// ── Componentes compartidos (una fuente para tarjeta, fila y pipeline).
// La foto/ícono se comparte desde `equipment-photo.tsx` (#103/#132).
const equipmentPhoto=read('app/equipment-photo.tsx');
assert.match(equipmentPhoto,/export function EquipmentPhoto\(/,'la foto/placeholder se comparte');
assert.match(inventory,/from '\.\/equipment-photo'/,'inventario usa la pieza compartida de foto/ícono');
assert.match(inventory,/function InventoryItemMeta\(/,'los metadatos se comparten');
assert.match(inventory,/function InventoryItemActions\(/,'las acciones se comparten');
assert.match(inventory,/function inventoryItemActionList\(/,'las acciones salen de una sola lista');
assert.match(equipmentPhoto,/role="img" aria-label=\{`Sin foto: \$\{nombre\}`\} title="Sin foto"/,'sin imagen va un placeholder limpio, nunca un ícono roto');
assert.equal((inventory.match(/>Foto</g)||[]).length,1,'«Foto» solo sobrevive como encabezado de la columna');

// ── Grilla de la lista: plantilla única, columnas reales y acciones en una línea.
assert.match(inventory,/const EQUIPMENT_COLS='\[--eq-cols:/,'la lista declara su plantilla');
assert.equal((inventory.match(/\$\{EQUIPMENT_GRID\}/g)||[]).length,2,'encabezado y filas comparten la plantilla');
assert.match(inventory,/flex shrink-0 flex-nowrap items-center justify-end gap-1/,'las acciones no envuelven');
assert.match(inventory,/min-h-\[56px\]/,'la fila densa mantiene su alto acotado');
assert.match(inventory,/<b className="truncate text-\[13px\] font-semibold text-fore" title=\{item\.name\}>/,'el artículo puede truncar con título');
assert.match(inventory,/<code className="shrink-0 whitespace-nowrap font-mono text-\[11px\] text-mute">\{code\}<\/code>/,'el código nunca se corta');
assert.match(inventory,/StateChip tone=\{statusTone\(item\.status\)\}/,'el estado nunca se corta');

// ── Sin filas vacías: serie/valor se dicen una vez y en corto.
assert.match(inventory,/item\.serial_number\?<>.*:'Sin serie'/s,'la serie ausente se dice en corto');
assert.match(inventory,/Number\(item\.value\)>0\?<CeldaMoneda.*:'Sin valor'/s,'el valor ausente se dice en corto');
assert.doesNotMatch(inventory,/etiqueta="Serie \/ IMEI"/,'la tarjeta no repite una fila por serie');
assert.doesNotMatch(inventory,/etiqueta="Valor" etiquetaComo="dt"/,'la tarjeta no repite una fila por valor');

// ── Cabecera de la tarjeta: checkbox, foto 56, nombre flexible y estado a la derecha.
assert.match(inventory,/size="card"/,'la tarjeta usa la foto grande');
assert.match(equipmentPhoto,/size==='card'\?'h-14 w-14'/,'la foto de la tarjeta mide 56 px');
assert.match(inventory,/<h3 className="truncate text-sm font-semibold text-fore" title=\{item\.name\}>/,'el nombre es flexible y truncable');
assert.match(inventory,/<StateChip tone=\{statusTone\(item\.status\)\}>\{equipmentStatusLabel\(item\.status\)\}<\/StateChip>\s*<\/div>/,'el estado cierra la cabecera');

// ── KPIs acotados: «Sin valor» + contador secundario + enlace chico.
assert.match(inventory,/:<span className="text-base font-semibold text-mute">Sin valor<\/span>/,'sin datos el KPI dice «Sin valor»');
assert.match(inventory,/text-\[clamp\(1\.15rem,1\.6vw,1\.875rem\)\]/,'el monto se acota sin cortarse');
assert.match(inventory,/>Agregar valor<\/button>/,'el CTA del valor sigue disponible');
assert.match(inventory,/className="min-h-11 shrink-0 text-\[11px\] font-semibold text-fono-light underline-offset-2 hover:underline focus-visible:underline md:min-h-0"/,'«Agregar valor» es un enlace chico (44 px en mobile)');

// ── Ubicaciones: ancho fluido, encabezado fijo y estructura interna fija.
assert.match(inventory,/\[--location-cols:1\] sm:\[--location-cols:2\] xl:\[--location-cols:3\]/,'las columnas del pipeline se reparten por breakpoint (no quedan cortadas)');
assert.match(inventory,/<header data-board-head className="flex min-h-11 min-w-0 items-center gap-2">/,'los encabezados comparten altura');
assert.match(inventory,/ml-auto shrink-0 whitespace-nowrap text-xs tabular-nums text-mute/,'el contador va alineado a la derecha');
assert.match(inventory,/Aquí desde \$\{dateTime\(item\.location_changed_at\)\}/,'«aquí desde» es metadata secundaria');
assert.match(inventory,/title=\{movedAt\}/,'la metadata secundaria tiene tooltip');

// ── El pipeline no pierde el arrastre de equipos ni la verificación.
assert.match(inventory,/<DndContext sensors=\{sensors\}/,'el pipeline conserva el dnd');
assert.match(inventory,/useDroppable\(\{id:column\.key/,'las columnas siguen siendo destinos');

console.log('PASS: inventario #103 — foto/placeholder, metadatos, acciones y columnas compartidas; sin filas vacías ni datos cortados.');
