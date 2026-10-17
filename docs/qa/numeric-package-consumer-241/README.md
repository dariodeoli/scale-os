# Consumo piloto de OwnCoding UI (#241 / OwnCoding #55)

Estado: OwnCoding UI [v0.68.17](https://github.com/dariodeoli/owncoding-ui/tree/v0.68.17) publicado y consumido desde Git en una copia privada de dependencias. `package.json` fija la etiqueta y el lockfile resuelve `ce28d33b879571801b7b27124483bd84e830ad63`. No se modificó la instalación compartida.

La referencia previa es Scale `11affc1c`. Se capturaron antes del traslado 1.584 vectores de validez/mensajes y 14 configuraciones de pasos en `tests/fixtures/numeric-pilot-241-baseline.json`, con hashes de los archivos originales. El test compara datos congelados; no copia ni mantiene un segundo motor.

`app/ui/input.tsx` reexporta InputBase y TextareaBase del entry cliente `owncoding-ui/numeric`. `app/ui/number.tsx` reexporta los renderers desde ese entry y los validadores desde `owncoding-ui/number-utils`, sin marcar la fachada completa como cliente. Las declaraciones reales incluidas en el artefacto conservan eventos/ref nativos y políticas anteriores. El CSS, tokens, AmountInput, Editor y reglas de Scale siguen fuera del paquete piloto.

La identidad estricta acredita que las fachadas y los tres entries públicos exponen los mismos objetos. El bundle puro no importa React ni contiene la marca cliente; el bundle de fachadas carga una sola instancia de React y no arrastra el renderer root ni estilos. El guard AST permite sólo los símbolos concretos de cada fachada y sus módulos exactos. Rechaza aliases directos, root alternativo, subpaths ajenos/profundos, símbolos inexistentes y imports opacos/dinámicos.

Validaciones sobre el artefacto final y la instalación Git publicada indicados en `pilot.json`:

- Baseline, identidad de exports y fixture TypeScript con casos negativos: PASS.
- Motor numérico, bases InputBase/TextareaBase, MoneyInput existente y browser nativo/RHF/Editor: PASS. Pegado real por clipboard, identidad target/currentTarget/ref y rerender ajeno conservan texto/caret.
- Pickers temporales con eventos/ref reales: PASS.
- Ocho fixtures de arquitectura y auditoría del código real: PASS.
- Los 39 archivos dist de release 0.68.17 son byte-idénticos al primer candidato, verificado independientemente. También se compararon todos contra la instalación Git real. Baseline/identidad/bundle/browser se repitieron contra el pack final y el paquete instalado desde la etiqueta publicada.
- Catálogo servido por Next con CSS real: 39 comprobaciones PASS; 1366/390, claro/oscuro/contraste, ocho capturas en `catalog/`. Cero API, proveedores y errores de consola/runtime.

El catálogo usa datos ficticios y callbacks en memoria. Las capturas se inspeccionaron visualmente; no se probaron dispositivos físicos. La publicación externa la ejecutó el integrador mediante [OwnCoding UI PR #56](https://github.com/dariodeoli/owncoding-ui/pull/56). Esta rama entrega las fachadas, pruebas y el pin/lock reproducible. El merge, gates del candidato integrado y deploy de Scale pertenecen al integrador.
