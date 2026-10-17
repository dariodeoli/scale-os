# Encabezados y proyectos compactos — issues #222 y #223

Se eliminó la fila duplicada del título de Contratos en el shell. PageHeader y
FilterToolbar usan altura natural, sin acumular márgenes con el gap de su
cuadrícula. Las acciones envuelven según el ancho disponible y los enlaces
`.text-button` conservan 44 px en móvil, incluido «Volver arriba».

Las tarjetas de proyectos muestran el nombre completo, cliente, estado,
urgencia, inicio, entrega, piezas, niveles de aprobación, responsables y Drive.
La lista mantiene sus cinco columnas e incorpora el logo del cliente. El
objeto ClientLogo reutiliza FotoPerfil con círculo, imagen completa e iniciales;
se aplica también a las coincidencias de clientes en IA y a sus fichas.

## Evidencia local

- TypeScript sin emisión: aprobado.
- Focales de UI, densidad, shell, fotos, proyectos e IA: aprobadas.
- Geometría en Chromium a 360, 390, 768, 1024, 1440 y 2576 px: 54 combinaciones
  de encabezados, filtros y tarjetas renderizados desde los componentes reales,
  con nueve nombres de superficies. Sin desbordamiento horizontal; logos
  circulares con ancho y alto iguales y controles principales de 44 px en móvil.
- Artefactos locales ignorados: `work/qa-design-compact/geometry.json`,
  `contratos-1440.png`, `contratos-390.png`, `proyectos-1440.png` y
  `proyectos-390.png`.

La medición usa HTML generado por renderizado de los componentes y CSS local;
no acredita pruebas funcionales de las nueve páginas, de backend ni de equipos
físicos. La validación de la aplicación integrada, su build, CI y publicación
corresponde al integrador y debe documentarse antes de cerrar los issues.
