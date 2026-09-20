/*
 * Turns raw harness measurements into prioritized findings and a markdown
 * baseline. No domain knowledge beyond the design contract in AGENTS.md.
 */

const NUMERIC = /[0-9]/;
const MONEY = /(gs|\$|usd|pyg|eur|brl|ars|clp|mxn|uyu|r\$|₲)/i;

const PROPOSALS = {
  'overflow-documento': 'Algo excede el ancho del viewport. Ubicar el primer nodo marcado como bleed y corregir el ancho mínimo del contenedor o su plantilla.',
  bleed: 'El nodo se sale de su contenedor. Ajustar min-width/overflow con la plantilla compartida de la vista; nada de anchos fijos por tarjeta.',
  'bleed-clip': 'El contenedor recorta al nodo. Revisar la plantilla de columnas y permitir shrink (min-width:0) o wrap donde corresponda al campo.',
  'texto-cortado': 'Texto recortado sin salida. Si es nombre o texto libre: permitir wrap o agregar title con el valor completo. Si es monto/fecha/código: nowrap + tabular-nums y ancho de columna suficiente.',
  'clip-sin-elipsis': 'Texto recortado sin elipsis ni title: el usuario no ve que falta contenido. Aplicar ellipsis + title o permitir wrap.',
  'altura-recortada': 'Contenido recortado en vertical sin salida. Revisar altura fija o line-clamp: debe poder verse completo (o title).',
  superposicion: 'Dos elementos se pisan. Revisar posicionamiento absoluto, márgenes negativos o layouts que se solapan en este ancho.',
  'plantilla-encabezado-fila': 'El encabezado y las filas no comparten la variable de plantilla. Unificar en --<vista>-cols (una sola plantilla por lista).',
  'desalineacion-celdas': 'Las celdas del encabezado no arrancan en la misma x que las de la fila. Compartir plantilla, gap-x y padding lateral entre encabezado y fila.',
  'altura-fila': 'Fila fuera del contrato 44–52 px: revisar padding vertical, min-height y contenido que hace wrap.',
  'columna-colapsada': 'Una celda quedó más angosta que su contenido o desapareció: la columna debe reservar su lugar aunque no haya dato.',
  'tarjeta-baja': 'Tarjeta de cuadrícula por debajo de ~200 px: el contenido queda amontonado. Distribuir con flex column y pie anclado.',
};

function severityFor(type, item) {
  if (type === 'overflow-documento') return 'alta';
  if (type === 'bleed' || type === 'bleed-clip') return 'alta';
  if (type === 'superposicion') return item.overlapPx >= 24 ? 'alta' : 'media';
  if (type === 'texto-cortado') {
    if (item.kind === 'clip-sin-elipsis') return 'alta';
    if (MONEY.test(item.text) || NUMERIC.test(item.text)) return 'alta';
    return 'media';
  }
  if (type === 'clip-sin-elipsis' || type === 'altura-recortada') return 'alta';
  if (type === 'plantilla-encabezado-fila' || type === 'columna-colapsada') return 'alta';
  return 'media';
}

export function buildFindings(run, width) {
  const findings = [];
  const push = (type, fixture, evidence, extra = {}) => {
    findings.push({
      type,
      width,
      severity: extra.severity || severityFor(type, evidence),
      fixture: fixture.fixture,
      section: fixture.section,
      evidence,
      proposal: PROPOSALS[type] || '',
      ...extra,
    });
  };

  for (const fixture of run.fixtures) {
    if ((fixture.selfOverflow || 0) > 1) {
      push('overflow-documento', fixture, {
        overflowPx: fixture.selfOverflow,
        clientWidth: fixture.rect?.width,
        scrollWidth: (fixture.rect?.width || 0) + fixture.selfOverflow,
        docOverflow: fixture.doc?.horizontalOverflow || 0,
      });
    }
    const bledSelectors = new Set(fixture.bledPaths || (fixture.overflow || []).filter((item) => item.kind !== 'scrollable').map((item) => item.selector));
    for (const item of fixture.overflow || []) {
      if (item.kind === 'bleed' || item.kind === 'bleed-clip') {
        push(item.kind, fixture, {
          selector: item.selector,
          text: item.text,
          bleedRight: item.bleedRight,
          bleedLeft: item.bleedLeft,
          container: item.container || '',
          width: item.width,
        });
      }
    }
    for (const item of fixture.clipped || []) {
      if (item.title) continue;
      push('texto-cortado', fixture, {
        selector: item.selector,
        text: item.text,
        kind: item.kind,
        clientWidth: item.clientWidth,
        scrollWidth: item.scrollWidth,
        clientHeight: item.clientHeight,
        scrollHeight: item.scrollHeight,
      });
    }
    for (const item of fixture.overlaps || []) {
      if (bledSelectors.has(item.a) || bledSelectors.has(item.b)) continue;
      push('superposicion', fixture, item);
    }
    for (const list of fixture.lists || []) {
      if (list.missing) {
        push('lista-ausente', fixture, {container: list.container}, {severity: 'info', skipped: true});
        continue;
      }
      if (list.headTemplate && list.rowTemplate && list.headTemplate !== list.rowTemplate) {
        push('plantilla-encabezado-fila', fixture, {
          container: list.container,
          head: list.head,
          row: list.row,
          headCols: list.headTemplate,
          rowCols: list.rowTemplate,
        });
      } else if (!list.headTemplate && list.headDisplay !== 'none' && list.headCols && list.rowCols && list.headCols !== list.rowCols) {
        push('plantilla-encabezado-fila', fixture, {
          container: list.container,
          head: list.head,
          row: list.row,
          headCols: list.headCols,
          rowCols: list.rowCols,
        });
      }
      for (const cell of list.cellAlign || []) {
        if (cell.delta > 2.5) {
          push('desalineacion-celdas', fixture, {...cell, container: list.container, headSelector: list.head, rowSelector: list.row});
        }
      }
      for (const row of list.heightViolations || []) {
        push('altura-fila', fixture, {container: list.container, label: list.label, height: row.height, measuredWidth: row.width, contract: '44–52 px'});
      }
      for (const item of list.collapsed || []) {
        push('columna-colapsada', fixture, {...item, container: list.container});
      }
    }
    for (const grid of fixture.grids || []) {
      if (grid.missing) {
        push('cuadricula-ausente', fixture, {container: grid.container}, {severity: 'info', skipped: true});
        continue;
      }
      for (const height of grid.violations || []) {
        push('tarjeta-baja', fixture, {container: grid.container, label: grid.label, height, contract: `≥${grid.minHeight} px`});
      }
    }
  }
  return findings;
}

function groupKey(finding) {
  const evidence = finding.evidence || {};
  return [
    finding.type,
    finding.fixture,
    evidence.selector || evidence.container || '',
    evidence.head || '',
    evidence.height || '',
    evidence.text || '',
    evidence.a || '',
    evidence.b || '',
  ].join('|');
}

export function groupFindings(findings) {
  const groups = new Map();
  for (const finding of findings) {
    const key = groupKey(finding);
    const existing = groups.get(key);
    if (existing) {
      existing.widths.push(finding.width);
      if (!existing.proposal && finding.proposal) existing.proposal = finding.proposal;
    } else {
      groups.set(key, {...finding, widths: [finding.width]});
    }
  }
  const order = {alta: 0, media: 1, baja: 2, info: 3};
  return Array.from(groups.values()).sort((a, b) => order[a.severity] - order[b.severity] || a.section.localeCompare(b.section) || a.widths[0] - b.widths[0]);
}

function describeEvidence(finding) {
  const evidence = finding.evidence || {};
  const parts = [];
  if (evidence.selector) parts.push(`\`${evidence.selector}\``);
  if (evidence.container && evidence.container !== evidence.selector) parts.push(`cont: \`${evidence.container}\``);
  if (evidence.text) parts.push(`“${String(evidence.text).slice(0, 60)}”`);
  if (evidence.bleedRight !== undefined && evidence.bleedRight > 2) parts.push(`se sale ${evidence.bleedRight}px`);
  if (evidence.bleedLeft !== undefined && evidence.bleedLeft > 2) parts.push(`se sale ${evidence.bleedLeft}px a la izquierda`);
  if (evidence.kind && finding.type === 'texto-cortado') parts.push(`recorte: ${evidence.kind}`);
  if (finding.type === 'texto-cortado') parts.push(`${evidence.scrollWidth}px en ${evidence.clientWidth}px`);
  if (finding.type === 'overflow-documento') parts.push(`scrollWidth ${evidence.scrollWidth} > clientWidth ${evidence.clientWidth} (+${evidence.overflowPx}px)`);
  if (finding.type === 'superposicion') parts.push(`solape ${evidence.overlapPx}px² (${Math.round((evidence.ratio || 0) * 100)}%) entre “${String(evidence.aText || '').slice(0, 30)}” y “${String(evidence.bText || '').slice(0, 30)}”`);
  if (finding.type === 'plantilla-encabezado-fila') parts.push(`head: ${evidence.headCols} · row: ${evidence.rowCols}`);
  if (finding.type === 'desalineacion-celdas') parts.push(`“${evidence.head}” head ${evidence.headLeft}px vs fila ${evidence.rowLeft}px (Δ${evidence.delta}px)`);
  if (finding.type === 'altura-fila') parts.push(`${evidence.height}px (contrato ${evidence.contract})`);
  if (finding.type === 'columna-colapsada') parts.push(`${evidence.width}px de ancho`);
  if (finding.type === 'tarjeta-baja') parts.push(`${evidence.height}px (contrato ${evidence.contract})`);
  if (finding.type === 'lista-ausente' || finding.type === 'cuadricula-ausente') parts.push(`no se encontró \`${evidence.container}\` en el fixture`);
  return parts.join(' · ');
}

export function renderBaselineMarkdown(payload) {
  const all = payload.runs.flatMap((run) => buildFindings(run, run.width)).filter((finding) => !finding.skipped);
  const grouped = groupFindings(all);
  const lines = [];
  lines.push(`# Baseline visual SOS-DSN (harness)`);
  lines.push('');
  lines.push(`- Generado: ${payload.generatedAt}`);
  lines.push(`- Chrome: ${payload.chrome}`);
  lines.push(`- Anchos: ${payload.widths.join(', ')} px`);
  lines.push(`- Fixtures: ${payload.fixtureCount}`);
  lines.push(`- CSS: ${payload.cssChunks.length} chunks construidos (incluye los diferidos por sección)`);
  lines.push(`- Hallazgos únicos agrupados: ${grouped.length} (${all.length} ocurrencias sección × ancho)`);
  lines.push('');
  const bySeverity = {alta: 0, media: 0, baja: 0, info: 0};
  for (const finding of grouped) bySeverity[finding.severity] = (bySeverity[finding.severity] || 0) + 1;
  lines.push(`Altas: ${bySeverity.alta} · Medias: ${bySeverity.media} · Bajas: ${bySeverity.baja}`);
  lines.push('');
  lines.push('| # | Sev. | Sección | Tipo | Anchos | Evidencia | Fix propuesto |');
  lines.push('|---|------|---------|------|--------|-----------|----------------|');
  grouped.forEach((finding, index) => {
    lines.push(`| ${index + 1} | ${finding.severity} | ${finding.section} | ${finding.type} | ${finding.widths.join(', ')} | ${describeEvidence(finding).replace(/\|/g, '\\|')} | ${finding.proposal} |`);
  });
  lines.push('');
  return lines.join('\n');
}

export {describeEvidence, PROPOSALS};
