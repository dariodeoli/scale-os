/*
 * In-page measurement library for the SOS-DSN visual harness.
 * Runs inside headless Chrome after fonts are ready. Pure DOM geometry:
 * no screenshots, no assertions, no test framework.
 */
(() => {
  const EPS = 1.5;

  function visible(el) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    if (['absolute', 'fixed'].includes(s.position) && r.width <= 2 && r.height <= 2) return false;
    return true;
  }

  function isScreenReaderOnly(el) {
    const s = getComputedStyle(el);
    if (s.position === 'absolute' && el.clientWidth <= 2 && el.clientHeight <= 2 && ['hidden', 'clip'].includes(s.overflow)) return true;
    return false;
  }

  function pathOf(el) {
    const parts = [];
    let node = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      const cls = (node.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) part += '.' + cls.join('.');
      const parent = node.parentElement;
      if (parent) {
        const twins = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
        if (twins.length > 1) part += `:nth-of-type(${twins.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = node.parentElement;
      depth += 1;
      if (node && node.hasAttribute && node.hasAttribute('data-fixture')) {
        parts.unshift('[data-fixture="' + node.getAttribute('data-fixture') + '"]');
        break;
      }
    }
    return parts.join(' > ');
  }

  function ownText(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) text += node.textContent;
      else if (node.nodeType === 1 && ['BR'].includes(node.tagName)) text += ' ';
    }
    return text.replace(/\s+/g, ' ').trim();
  }

  function deepText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function textOverflowKind(el, s) {
    const boxes = el.getClientRects();
    if (boxes.length === 0) return null;
    const horizontal = el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1;
    const vertical = el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1;
    if (!horizontal && !vertical) return null;
    const nowrap = s.whiteSpace === 'nowrap' || s.whiteSpace === 'pre';
    const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none';
    const hidden = ['hidden', 'clip'].includes(s.overflowX) || ['hidden', 'clip'].includes(s.overflow);
    if (s.textOverflow === 'ellipsis' && nowrap && horizontal) return 'ellipsis';
    if (clamp && vertical) return 'line-clamp';
    if (hidden && nowrap && horizontal) return 'clip-sin-elipsis';
    if (hidden && vertical) return 'altura-recortada';
    return null;
  }

  function titleSource(el) {
    if (el.hasAttribute('title') && el.getAttribute('title').trim()) return 'self';
    const holder = el.closest('[title]');
    if (holder && holder.getAttribute('title').trim()) return 'ancestro';
    return null;
  }

  function scrollableAncestor(el, root) {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['auto', 'scroll'].includes(s.overflowX)) return p;
      if (['hidden', 'clip'].includes(s.overflowX)) return null;
    }
    return null;
  }

  function clippingAncestor(el, root) {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (['hidden', 'clip', 'auto', 'scroll'].includes(s.overflowX)) return p;
    }
    return null;
  }

  function isGridItem(el, container) {
    let node = el.parentElement;
    while (node) {
      const s = getComputedStyle(node);
      if (node === container) return true;
      if (s.display !== 'contents') return false;
      node = node.parentElement;
    }
    return false;
  }

  function gridItems(container) {
    return Array.from(container.querySelectorAll('*')).filter((el) => isGridItem(el, container) && visible(el));
  }

  function measureFixture(root, doc) {
    const out = {
      fixture: root.getAttribute('data-fixture'),
      section: root.getAttribute('data-section') || '',
      kind: root.getAttribute('data-kind') || '',
      rect: rectInfo(root.getBoundingClientRect()),
      selfOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      doc: {
        innerWidth: window.innerWidth,
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        bodyScrollWidth: doc.body ? doc.body.scrollWidth : 0,
        horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
      },
      overflow: [],
      clipped: [],
      overlaps: [],
      lists: [],
      grids: [],
      scrollables: [],
    };

    /* ---- horizontal overflow / bleed ---------------------------------- */
    const rootRect = root.getBoundingClientRect();
    const all = Array.from(root.querySelectorAll('*'));
    const rawOverflow = [];
    for (const el of all) {
      if (!visible(el)) continue;
      if (isScreenReaderOnly(el)) continue;
      if (['SVG', 'PATH', 'CIRCLE', 'RECT', 'LINE', 'POLYLINE', 'POLYGON', 'G', 'DEFS', 'USE'].includes(el.tagName)) continue;
      const s = getComputedStyle(el);
      if (s.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      const bleedRight = r.right - (rootRect.right - parseFloat(getComputedStyle(root).paddingRight || 0));
      const bleedLeft = (rootRect.left + parseFloat(getComputedStyle(root).paddingLeft || 0)) - r.left;
      if (bleedRight > 2 || bleedLeft > 2) {
        const scroller = scrollableAncestor(el, root);
        const clip = clippingAncestor(el, root);
        const entry = {
          selector: pathOf(el),
          tag: el.tagName.toLowerCase(),
          text: deepText(el).slice(0, 80),
          bleedRight: Math.round(bleedRight * 10) / 10,
          bleedLeft: Math.round(bleedLeft * 10) / 10,
          width: Math.round(r.width * 10) / 10,
          depth: (() => {
            let d = 0;
            let node = el;
            while (node && node !== root) {
              d += 1;
              node = node.parentElement;
            }
            return d;
          })(),
          el,
        };
        if (scroller) {
          entry.kind = 'scrollable';
          entry.container = pathOf(scroller);
        } else if (clip) {
          entry.kind = 'bleed-clip';
          entry.container = pathOf(clip);
        } else {
          entry.kind = 'bleed';
        }
        rawOverflow.push(entry);
      }
    }
    for (const entry of rawOverflow) {
      if (entry.kind === 'scrollable') continue;
      const dominated = rawOverflow.some((other) => other !== entry && other.depth < entry.depth && other.el.contains(entry.el));
      if (dominated) continue;
      const samples = rawOverflow
        .filter((other) => other.depth > entry.depth && entry.el.contains(other.el))
        .slice(0, 3)
        .map((other) => ({selector: other.selector, text: other.text, kind: other.kind}));
      const {el, ...clean} = entry;
      out.overflow.push({...clean, samples});
    }
    out.bledPaths = rawOverflow.filter((entry) => entry.kind !== 'scrollable').map((entry) => entry.selector);

    /* ---- truncated text without escape -------------------------------- */
    for (const el of all) {
      if (!visible(el)) continue;
      if (el.tagName === 'SVG' || el.closest('svg')) continue;
      const s = getComputedStyle(el);
      const kind = textOverflowKind(el, s);
      if (!kind) continue;
      if (!deepText(el)) continue;
      const title = titleSource(el);
      out.clipped.push({
        selector: pathOf(el),
        tag: el.tagName.toLowerCase(),
        kind,
        text: deepText(el).slice(0, 120),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        title: title || '',
      });
    }

    /* ---- overlaps between atomic leaves ------------------------------- */
    const atomicSelector = 'button,a,input,select,textarea,label,span,b,strong,small,em,time,dt,dd,h1,h2,h3,h4,p,li,th,td,img,output,summary';
    const clippedOut = (el) => {
      const clip = clippingAncestor(el, root);
      if (!clip) return false;
      const s = getComputedStyle(clip);
      const cr = clip.getBoundingClientRect();
      const left = cr.left + (parseFloat(s.borderLeftWidth) || 0);
      const right = cr.right - (parseFloat(s.borderRightWidth) || 0);
      const top = cr.top + (parseFloat(s.borderTopWidth) || 0);
      const bottom = cr.bottom - (parseFloat(s.borderBottomWidth) || 0);
      const r = el.getBoundingClientRect();
      return r.left < left - 2 || r.right > right + 2 || r.top < top - 2 || r.bottom > bottom + 2;
    };
    const atoms = Array.from(root.querySelectorAll(atomicSelector)).filter((el) => {
      if (!visible(el)) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) return false;
      const s = getComputedStyle(el);
      if (s.position === 'fixed') return false;
      if (clippedOut(el)) return false;
      return ownText(el).length > 0 || ['INPUT', 'SELECT', 'TEXTAREA', 'IMG', 'BUTTON', 'SUMMARY'].includes(el.tagName);
    });
    for (let i = 0; i < atoms.length; i += 1) {
      for (let j = i + 1; j < atoms.length; j += 1) {
        const a = atoms[i];
        const b = atoms[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (w <= 2 || h <= 2) continue;
        const area = w * h;
        const minArea = Math.min(ra.width * ra.height, rb.width * rb.height);
        const ratio = area / minArea;
        if (ratio < 0.12 && area < 24) continue;
        const positioned = (el) => {
          let node = el;
          while (node && node !== root) {
            const s = getComputedStyle(node);
            if (['absolute', 'fixed'].includes(s.position)) return true;
            node = node.parentElement;
          }
          return false;
        };
        if ((positioned(a) || positioned(b)) && ratio < 0.4) continue;
        out.overlaps.push({
          a: pathOf(a),
          b: pathOf(b),
          aText: deepText(a).slice(0, 50),
          bText: deepText(b).slice(0, 50),
          aRect: rectInfo(ra),
          bRect: rectInfo(rb),
          overlapPx: Math.round(area),
          ratio: Math.round(ratio * 100) / 100,
        });
        if (out.overlaps.length >= 40) break;
      }
      if (out.overlaps.length >= 40) break;
    }

    /* ---- declared lists ----------------------------------------------- */
    let lists = [];
    try {
      lists = JSON.parse(root.getAttribute('data-lists') || '[]');
    } catch {
      lists = [];
    }
    for (const spec of lists) {
      const container = root.querySelector(spec.container);
      if (!container) {
        out.lists.push({ container: spec.container, missing: true });
        continue;
      }
      const head = spec.head ? container.querySelector(spec.head) : null;
      const rows = spec.row ? Array.from(container.querySelectorAll(spec.row)) : [];
      const entry = {
        container: spec.container,
        head: spec.head || null,
        row: spec.row || null,
        label: spec.label || spec.container,
        headDisplay: head ? getComputedStyle(head).display : null,
        headCols: head ? getComputedStyle(head).gridTemplateColumns : null,
        rowCols: rows[0] ? getComputedStyle(rows[0]).gridTemplateColumns : null,
        headTemplate: head && spec.template ? getComputedStyle(head).getPropertyValue(spec.template).trim() : null,
        rowTemplate: rows[0] && spec.template ? getComputedStyle(rows[0]).getPropertyValue(spec.template).trim() : null,
        rowCount: rows.length,
        rows: [],
        cellAlign: [],
        collapsed: [],
      };
      const target = spec.rowHeight || [44, 52];
      const exempt = spec.exemptBelow && window.innerWidth <= spec.exemptBelow;
      for (const row of rows.slice(0, 4)) {
        const r = row.getBoundingClientRect();
        entry.rows.push({ height: Math.round(r.height * 10) / 10, width: Math.round(r.width * 10) / 10 });
      }
      if (!exempt) {
        entry.heightViolations = entry.rows.filter((r) => r.height < target[0] - 0.5 || r.height > target[1] + 0.5);
      } else {
        entry.heightViolations = [];
        entry.exemptRows = true;
      }
      if (head) {
        const hs = getComputedStyle(head);
        if (hs.display !== 'none' && rows.length > 0) {
          const contentLeft = (el) => {
            const style = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return rect.left + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.paddingLeft) || 0);
          };
          const contentRight = (el) => {
            const style = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return rect.right - (parseFloat(style.borderRightWidth) || 0) - (parseFloat(style.paddingRight) || 0);
          };
          const headOriginLeft = contentLeft(head);
          const rowOriginLeft = contentLeft(rows[0]);
          const headOriginRight = contentRight(head);
          const rowOriginRight = contentRight(rows[0]);
          const headCells = gridItems(head);
          const rowItems = gridItems(rows[0]);
          for (const cell of headCells) {
            const hr = cell.getBoundingClientRect();
            const edge = getComputedStyle(cell).justifySelf === 'end' ? 'right' : 'left';
            let best = null;
            for (const item of rowItems) {
              const ir = item.getBoundingClientRect();
              const delta = Math.abs((edge === 'right' ? ir.right - rowOriginRight : ir.left - rowOriginLeft) - (edge === 'right' ? hr.right - headOriginRight : hr.left - headOriginLeft));
              if (!best || delta < best.delta) best = { delta, item };
            }
            if (best) {
              entry.cellAlign.push({
                head: deepText(cell).slice(0, 24),
                headLeft: Math.round(hr.left * 10) / 10,
                rowLeft: Math.round(best.item.getBoundingClientRect().left * 10) / 10,
                delta: Math.round(best.delta * 10) / 10,
              });
            }
          }
          for (const item of rowItems) {
            const ir = item.getBoundingClientRect();
            if (ir.width < 14) {
              entry.collapsed.push({ selector: pathOf(item), width: Math.round(ir.width * 10) / 10, text: deepText(item).slice(0, 40) });
            }
          }
        }
      }
      out.lists.push(entry);
    }

    /* ---- declared grids ----------------------------------------------- */
    let grids = [];
    try {
      grids = JSON.parse(root.getAttribute('data-grids') || '[]');
    } catch {
      grids = [];
    }
    for (const spec of grids) {
      const container = root.querySelector(spec.container);
      if (!container) {
        out.grids.push({ container: spec.container, missing: true });
        continue;
      }
      const cards = Array.from(container.querySelectorAll(spec.card));
      out.grids.push({
        container: spec.container,
        card: spec.card,
        label: spec.label || spec.container,
        minHeight: spec.minHeight || 200,
        heights: cards.slice(0, 6).map((card) => Math.round(card.getBoundingClientRect().height * 10) / 10),
        violations: cards
          .map((card) => Math.round(card.getBoundingClientRect().height * 10) / 10)
          .filter((height) => height < (spec.minHeight || 200) - 0.5),
      });
    }

    return out;
  }

  function rectInfo(r) {
    return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };
  }

  window.__visualHarness = {
    ready: false,
    measure() {
      const doc = document.documentElement;
      const fixtures = Array.from(document.querySelectorAll('[data-fixture]'));
      return {
        width: window.innerWidth,
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
        docOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
        fixtures: fixtures.map((fixture) => measureFixture(fixture, doc)),
      };
    },
  };
})();
