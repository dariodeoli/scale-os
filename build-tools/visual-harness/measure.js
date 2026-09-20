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
    if (r.right < -500 || r.left > window.innerWidth + 500) return false;
    if (hiddenByDetails(el)) return false;
    if (['absolute', 'fixed'].includes(s.position) && r.width <= 2 && r.height <= 2) return false;
    return true;
  }

  function isScreenReaderOnly(el) {
    const s = getComputedStyle(el);
    if (s.position === 'absolute' && el.clientWidth <= 2 && el.clientHeight <= 2 && ['hidden', 'clip'].includes(s.overflow)) return true;
    return false;
  }

  function hiddenByDetails(el) {
    const details = el.closest('details');
    if (!details || details.open) return false;
    return !details.querySelector(':scope > summary')?.contains(el);
  }

  function visualRects(el) {
    return Array.from(el.getClientRects()).filter((rect) => rect.width > 2 && rect.height > 2);
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
      cardBleed: [],
      clipped: [],
      overlaps: [],
      pseudoOverflow: [],
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

    /* ---- bleed outside card/panel padding boxes ------------------------ */
    const CARD_SELECTOR = '.panel,.ops-card,.metric,.kpi-card,.work-card,.client-hub-card,.project-entry,.person-hub-card,.budget-hub-card,.financial-stat,.inventory-equipment,.studio-reservation,.delivery,.login-card,.client-portal-card,.status-shell,.settings-card,.catalog-card';
    const rawCardBleed = [];
    for (const el of all) {
      if (!visible(el)) continue;
      if (el.tagName === 'SVG' || el.closest('svg')) continue;
      const card = el.closest(CARD_SELECTOR);
      if (!card || card === el) continue;
      const cs = getComputedStyle(card);
      const cr = card.getBoundingClientRect();
      if (cr.width < 40 || cr.height < 40) continue;
      let intentional = false;
      for (let p = el.parentElement; p && p !== card; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(s.overflowX)) {
          intentional = true;
          break;
        }
      }
      if (intentional) continue;
      const padLeft = cr.left + (parseFloat(cs.borderLeftWidth) || 0);
      const padRight = cr.right - (parseFloat(cs.borderRightWidth) || 0);
      const r = el.getBoundingClientRect();
      const bleedRight = r.right - padRight;
      const bleedLeft = padLeft - r.left;
      if (bleedRight <= 3 && bleedLeft <= 3) continue;
      rawCardBleed.push({
        selector: pathOf(el),
        card: pathOf(card),
        text: deepText(el).slice(0, 80),
        bleedRight: Math.round(bleedRight * 10) / 10,
        bleedLeft: Math.round(bleedLeft * 10) / 10,
        el,
        cardEl: card,
      });
    }
    for (const entry of rawCardBleed) {
      if (rawCardBleed.some((other) => other !== entry && other.cardEl === entry.cardEl && other.el !== entry.el && other.el.contains(entry.el))) continue;
      const {el, cardEl, ...clean} = entry;
      out.cardBleed.push(clean);
    }
    out.cardBledPaths = rawCardBleed.map((entry) => entry.selector);

    /* ---- decorative pseudo-elements that extend the scroll area -------- */
    for (const el of all) {
      if (!visible(el)) continue;
      for (const which of ['::before', '::after']) {
        const ps = getComputedStyle(el, which);
        if (!ps || ps.content === 'none' || ps.display === 'none' || ps.visibility === 'hidden') continue;
        if (ps.position !== 'absolute' && ps.position !== 'fixed') continue;
        const width = parseFloat(ps.width);
        const height = parseFloat(ps.height);
        if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
        if (width < 2 || height < 2) continue;
        let base = el;
        if (!['relative', 'absolute', 'fixed', 'sticky'].includes(getComputedStyle(el).position)) {
          base = null;
          for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
            const s = getComputedStyle(p);
            if (['relative', 'absolute', 'fixed', 'sticky'].includes(s.position)) {
              base = p;
              break;
            }
          }
        }
        if (!base) continue;
        const br = base.getBoundingClientRect();
        let left;
        if (ps.left !== 'auto') left = br.left + parseFloat(ps.left);
        else if (ps.right !== 'auto') left = br.right - parseFloat(ps.right) - width;
        else left = br.left;
        const right = left + width;
        if (right <= rootRect.right + 2 && left >= rootRect.left - 2) continue;
        const scroller = scrollableAncestor(el, root);
        if (scroller) continue;
        const ownOverflow = getComputedStyle(el).overflowX;
        const clip = ['hidden', 'clip'].includes(ownOverflow) ? el : clippingAncestor(el, root);
        if (clip) {
          const cr = clip.getBoundingClientRect();
          if (left >= cr.left - 2 && right <= cr.right + 2) continue;
        }
        const container = clip || root;
        const scrollBefore = container.scrollWidth;
        const hideAttribute = which === '::before' ? 'data-harness-hide-before' : 'data-harness-hide-after';
        el.setAttribute(hideAttribute, '1');
        const scrollAfter = container.scrollWidth;
        el.removeAttribute(hideAttribute);
        out.pseudoOverflow.push({
          selector: `${pathOf(el)}${which}`,
          text: deepText(el).slice(0, 60),
          width: Math.round(width),
          height: Math.round(height),
          left: Math.round(left),
          right: Math.round(right),
          bleedRight: Math.round((right - rootRect.right) * 10) / 10,
          bleedLeft: Math.round((rootRect.left - left) * 10) / 10,
          contributes: scrollAfter < scrollBefore - 0.5,
          clipped: Boolean(clip),
        });
      }
    }

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
        if (/avatar/i.test(String(a.className)) && /avatar/i.test(String(b.className))) continue;
        const controlAffordance = (control, overlay) => {
          if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tagName)) return false;
          const cr = control.getBoundingClientRect();
          const or = overlay.getBoundingClientRect();
          const inside = or.left >= cr.left - 1 && or.right <= cr.right + 1 && or.top >= cr.top - 1 && or.bottom <= cr.bottom + 1;
          if (!inside) return false;
          const overlayPosition = getComputedStyle(overlay).position;
          return overlayPosition === 'absolute' || overlayPosition === 'fixed' || overlay.tagName === 'BUTTON';
        };
        if (controlAffordance(a, b) || controlAffordance(b, a)) continue;
        let area = 0;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const minArea = Math.min(ra.width * ra.height, rb.width * rb.height);
        for (const rectA of visualRects(a)) {
          for (const rectB of visualRects(b)) {
            const w = Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left);
            const h = Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top);
            if (w <= 2 || h <= 2) continue;
            area = Math.max(area, w * h);
          }
        }
        if (area <= 2) continue;
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
