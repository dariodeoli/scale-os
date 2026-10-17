import assert from 'node:assert/strict';
import {readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import ts from 'typescript';

// Guarda estática de accesibilidad (AGENTS.md › Interacción y accesibilidad).
// Recorre el JSX de app/**/*.tsx con el AST de TypeScript y exige:
//  - icon-button: <button> sin texto visible necesita aria-label o title
//    (AGENTS.md pide ambos; acá se exige al menos el nombre accesible).
//  - input-label: <input>/<select>/<textarea> visibles necesitan etiqueta
//    (aria-label, aria-labelledby, <label> ancestro o <label htmlFor> con su id).
//  - img-alt: <img> necesita alt (alt="" para decorativas).
//  - click-sin-teclado: <div>/<span> con onClick necesita role + onKeyDown.
//  - dialog-nombre: role="dialog"/"alertdialog" o <dialog> necesita
//    aria-labelledby o aria-label.
//  - id-duplicado: un id literal no se repite dentro del mismo archivo.
// `node tests/a11y-static.test.mjs --report` imprime todos los hallazgos.
const root = fileURLToPath(new URL('..', import.meta.url));
const appDir = join(root, 'app');

// Excepciones justificadas: `regla archivo` (o `regla archivo#id`) → motivo.
const ALLOWLIST = new Map([
  // Ramas excluyentes de un ternario (Input entero vs MoneyInput): nunca conviven en el DOM.
  ['id-duplicado app/client-reporting.tsx#client-reporting-commission-value', 'ternario: un solo control renderizado'],
  // Delegación: el cuerpo del menú cierra el cajón cuando el clic cae en un enlace;
  // los enlaces/botones hijos ya son operables con teclado.
  ['click-sin-teclado app/mobile-navigation.tsx', 'delegación de cierre, no es un control'],
]);

// Primitivas de campo (owncoding-ui y app/) que renderizan un control nativo
// sin etiqueta propia: el consumidor la provee con FormField/label htmlFor.
// Las que reciben `label`/`legend` la renderizan ellas mismas.
const FIELD_PRIMITIVES = new Set([
  'Input', 'Select', 'Textarea', 'MoneyInput', 'AmountInput', 'CurrencyField',
  'EmailField', 'PhoneField', 'TextField', 'PasswordField', 'Checkbox', 'Switch',
]);

// Native bases do not render a label merely because someone passes a label prop.
const BASE_FIELD_PRIMITIVES = new Set(['InputBase','TextareaBase','InputControl','NumericControl','NumberInput','PercentageInput','DateInput','TimeInput','DateTimeInput','MonthInput']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

function tagName(node) {
  return node.tagName.getText();
}

// Spreads que pueden traer nombre/etiqueta (props reenviadas). `{...form.register(x)}`
// solo trae value/onChange, así que no exime de la etiqueta.
const FORWARDING_SPREAD = /^(?:props|rest|others|attrs|inputProps|buttonProps|triggerProps|field)$/;

function attrs(opening) {
  const map = new Map();
  let spread = false;
  for (const prop of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(prop)) {
      if (FORWARDING_SPREAD.test(prop.expression.getText())) spread = true;
      continue;
    }
    const name = prop.name.getText();
    let value = true;
    if (prop.initializer) {
      if (ts.isStringLiteral(prop.initializer)) value = prop.initializer.text;
      else if (ts.isJsxExpression(prop.initializer) && prop.initializer.expression) {
        const expr = prop.initializer.expression;
        value = ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) ? expr.text : {expr: expr.getText()};
      }
    }
    map.set(name, value);
  }
  return {map, spread};
}

// ¿El nodo JSX puede renderizar texto visible? (texto literal o expresión).
function hasText(node) {
  if (ts.isJsxText(node)) return node.getText().trim().length > 0;
  if (ts.isJsxExpression(node)) return Boolean(node.expression);
  if (ts.isJsxElement(node)) {
    const opening = node.openingElement;
    const {map} = attrs(opening);
    if (map.get('aria-hidden') === 'true' || map.get('aria-hidden') === true) return false;
    // Componentes (Mayúscula): un icono lucide no tiene hijos; si tiene hijos, se inspeccionan.
    return node.children.some(hasText);
  }
  if (ts.isJsxSelfClosingElement(node)) {
    const name = tagName(node);
    const {map} = attrs(node);
    // <img alt="..."> aporta nombre; un componente con label/text también.
    if (name === 'img') return typeof map.get('alt') === 'string' ? map.get('alt').length > 0 : map.has('alt');
    if (/^[A-Z]/.test(name)) {
      // Iconos (lucide u otros) no aportan texto; componentes con texto por prop sí.
      return ['label', 'text', 'children', 'name', 'value', 'title'].some((key) => map.has(key));
    }
    return false;
  }
  if (ts.isJsxFragment(node)) return node.children.some(hasText);
  return false;
}

function forwardsIdProp(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current) && current.parameters?.length) {
      const first = current.parameters[0].name;
      return ts.isObjectBindingPattern(first) && first.elements.some((element) => element.name.getText() === 'id' && !element.propertyName);
    }
  }
  return false;
}

// Only the exported local Field owns the render-prop ID/description contract.
function canonicalFields(source, path) {
  const bindings = new Set();
  const modules = new Set(['app/ui', 'app/ui/index', 'app/ui/field'].map(name => resolve(root, name)));
  for (const node of source.statements) {
    if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
    const name = node.moduleSpecifier.text;
    const module = name.startsWith('.') ? resolve(dirname(path), name) : name.startsWith('@/') ? resolve(root, name.slice(2)) : undefined;
    if (!modules.has(module) || node.importClause?.isTypeOnly) continue;
    const imported = node.importClause?.namedBindings;
    if (!imported || !ts.isNamedImports(imported)) continue;
    for (const item of imported.elements) if (!item.isTypeOnly && (item.propertyName || item.name).text === 'Field') bindings.add(item.name.text);
  }
  return bindings;
}

function renderFieldContext(opening, bindings) {
  let callback;
  for (let parent = opening.parent; parent; parent = parent.parent) {
    if (ts.isFunctionLike(parent)) { callback = parent; break; }
  }
  if (!callback || !ts.isJsxExpression(callback.parent) || !ts.isJsxElement(callback.parent.parent)) return undefined;
  const field = callback.parent.parent.openingElement;
  // A render callback is not arbitrary props forwarding: prove its actual owner.
  const fieldAttrs = attrs(field).map;
  const label = fieldAttrs.get('label');
  const usableLabel = typeof label === 'string' ? Boolean(label.trim()) : label && typeof label === 'object' && !/^(?:undefined|null|false|true|["']{2})$/.test(label.expr);
  const parameter = callback.parameters[0]?.name;
  if (!bindings.has(tagName(field)) || !usableLabel || !parameter || !ts.isIdentifier(parameter)) return {labelled: false};
  const control = parameter.text;
  const attributes = opening.attributes.properties;
  const index = attributes.findIndex(prop => ts.isJsxSpreadAttribute(prop) && ts.isIdentifier(prop.expression) && prop.expression.text === control);
  const explicitId = attrs(opening).map.get('id');
  const derivedId = typeof explicitId === 'object' && explicitId.expr === `${control}.id`;
  if (index < 0 && !derivedId) return {labelled: false};
  // An explicit derived ID also proves the label when descriptions are composed.
  const lastForward = index < 0 ? attributes.findIndex(prop => ts.isJsxAttribute(prop) && prop.name.getText() === 'id') : index;
  if (attributes.slice(lastForward + 1).some(ts.isJsxSpreadAttribute)) return {labelled: false};
  const fieldId = fieldAttrs.get('id');
  for (const prop of attributes) {
    if (!ts.isJsxAttribute(prop)) continue;
    const key = prop.name.getText();
    if (key !== 'id') continue;
    const value = attrs({attributes: {properties: [prop]}}).map.get(key);
    const sameControl = typeof value === 'object' && value.expr === `${control}.${key === 'id' ? 'id' : 'describedBy'}`;
    const sameField = key === 'id' && fieldId !== undefined && JSON.stringify(value) === JSON.stringify(fieldId);
    if (!sameControl && !sameField) return {labelled: false};
  }
  return {labelled: true};
}

function lineOf(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

export function scanFile(path) {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(root, path);
  const findings = [];
  const ids = new Map();
  const htmlFor = new Set();
  const labelled = [];
  const fieldBindings = canonicalFields(source, path);

  function visit(node, insideLabel) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const name = tagName(opening);
      const {map, spread} = attrs(opening);
      const line = lineOf(source, opening);
      const named = map.has('aria-label') || map.has('aria-labelledby') || map.has('title');
      const id = map.get('id');
      if (typeof id === 'string') ids.set(id, [...(ids.get(id) || []), line]);
      const forValue = map.get('htmlFor');
      if (forValue !== undefined) htmlFor.add(typeof forValue === 'string' ? forValue : forValue.expr);

      if (name === 'button' && !spread && !named) {
        const children = ts.isJsxElement(node) ? node.children : [];
        if (!children.some(hasText)) findings.push({rule: 'icon-button', file: rel, line});
      }
      const fieldContext = renderFieldContext(opening, fieldBindings);
      if ((name === 'input' || name === 'select' || name === 'textarea' || FIELD_PRIMITIVES.has(name) || BASE_FIELD_PRIMITIVES.has(name)) && !(spread && !fieldContext)) {
        const type = map.get('type');
        const hidden = type === 'hidden' || type === 'submit' || type === 'button' || map.get('hidden') === true || map.get('aria-hidden') === 'true';
        const ownLabel = FIELD_PRIMITIVES.has(name) && (map.has('label') || map.has('legend')) && !map.has('bare');
        if (!hidden && !ownLabel && !insideLabel && !fieldContext?.labelled && !map.has('aria-label') && !map.has('aria-labelledby')) {
          // Primitiva que reenvía `id` desde sus props: la etiqueta la pone el
          // consumidor, y esos usos se verifican como FIELD_PRIMITIVES.
          if (!(typeof id === 'object' && id.expr === 'id' && forwardsIdProp(opening))) {
            labelled.push({line, id: id === undefined ? undefined : typeof id === 'string' ? id : id.expr});
          }
        }
      }
      if (name === 'img' && !spread && !map.has('alt')) findings.push({rule: 'img-alt', file: rel, line});
      if ((name === 'div' || name === 'span' || name === 'li') && map.has('onClick') && !spread) {
        if (!map.has('role') || !map.has('onKeyDown')) {
          // Fondos de modal (cierran con Escape en el document) son la excepción conocida.
          const cls = String(map.get('className') ?? '');
          if (!/backdrop|overlay|scrim/i.test(cls)) findings.push({rule: 'click-sin-teclado', file: rel, line});
        }
      }
      const role = map.get('role');
      if ((role === 'dialog' || role === 'alertdialog' || name === 'dialog') && !spread) {
        if (!map.has('aria-labelledby') && !map.has('aria-label')) findings.push({rule: 'dialog-nombre', file: rel, line});
      }
      const nextInside = insideLabel || name === 'label';
      if (ts.isJsxElement(node)) {
        visit(node.openingElement.attributes, nextInside);
        for (const child of node.children) visit(child, nextInside);
        return;
      }
      ts.forEachChild(node, (child) => visit(child, nextInside));
      return;
    }
    ts.forEachChild(node, (child) => visit(child, insideLabel));
  }
  visit(source, false);

  for (const input of labelled) {
    if (input.id !== undefined && htmlFor.has(input.id)) continue;
    findings.push({rule: 'input-label', file: rel, line: input.line});
  }
  for (const [id, lines] of ids) {
    if (lines.length > 1) findings.push({rule: 'id-duplicado', file: rel, line: lines[1], detail: id});
  }
  return findings;
}

export function scanApp() {
  return walk(appDir).flatMap(scanFile);
}

const allowed = (finding) => ALLOWLIST.has(`${finding.rule} ${finding.file}`) || ALLOWLIST.has(`${finding.rule} ${finding.file}#${finding.detail}`);

if (process.argv.includes('--report')) {
  for (const finding of scanApp()) {
    console.log(`${finding.rule}\t${finding.file}:${finding.line}${finding.detail ? `\t${finding.detail}` : ''}${allowed(finding) ? '\t(allowlist)' : ''}`);
  }
} else {
  test('JSX de app/ cumple las reglas estáticas de accesibilidad', () => {
    const offending = scanApp().filter((finding) => !allowed(finding));
    assert.deepEqual(
      offending.map((finding) => `${finding.rule} ${finding.file}:${finding.line}${finding.detail ? ` (${finding.detail})` : ''}`),
      [],
      'Corregí el componente (aria-label/title, label htmlFor, alt, role+onKeyDown, aria-labelledby) o justificá la excepción en ALLOWLIST.',
    );
  });

  test('Field local connects its labelled render-prop control without name-based spread exemptions', () => {
    const tmp = join(root, 'tests', '.a11y-field-probe.tsx');
    const scan = sample => {writeFileSync(tmp, sample);return scanFile(tmp).filter(finding => finding.rule === 'input-label');};
    try {
      for (const module of ['../app/ui', '../app/ui/index', '../app/ui/field', '@/app/ui']) {
        assert.deepEqual(scan(`import {Field as Labelled} from '${module}';<Labelled label="Email">{control=><EmailField {...control}/>}</Labelled>`), []);
      }
      assert.deepEqual(scan(`import {Field} from '../app/ui';<Field id="email" label="Email" help="Help">{p=><EmailField {...p} id={p.id} describedBy={p.describedBy}/>}</Field>`), []);
      assert.deepEqual(scan(`import {Field} from '../app/ui';<Field id="email" label="Email">{p=><EmailField {...p} id="email"/>}</Field>`), []);
      assert.deepEqual(scan(`import {Field} from '../app/ui/field';<Field label="Lookup">{control=><InputBase id={control.id} describedBy={[control.describedBy,extra].filter(Boolean).join(' ')}/>}</Field>`), []);
      const invalid = [
        `<FakeField label="Email">{control=><EmailField {...control}/>}</FakeField>`,
        `<FakeField label="Email">{props=><EmailField {...props}/>}</FakeField>`,
        `const Field=()=>null;<Field label="Email">{control=><EmailField {...control}/>}</Field>`,
        `import {Field} from '../app/random';<Field label="Email">{control=><EmailField {...control}/>}</Field>`,
        `import {Other as Field} from '../app/ui';<Field label="Email">{control=><EmailField {...control}/>}</Field>`,
        `import {Field} from '../app/ui';<Field>{props=><EmailField {...props}/>}</Field>`,
        `import {Field} from '../app/ui';<Field label="">{control=><EmailField {...control}/>}</Field>`,
        `import {Field} from '../app/ui';<Field label="Email">{control=><EmailField {...unrelated}/>}</Field>`,
        `import {Field} from '../app/ui';<Field label="Email">{control=><EmailField {...control} id="mismatch"/>}</Field>`,
        `import {Field} from '../app/ui';<Field label="Email">{control=><EmailField {...control} {...other}/>}</Field>`,
        `import {Field} from '../app/ui';<Field label="Email"><input/></Field>`,
        `<input/>`,
        `<InputBase label="This base does not render labels"/>`,
        `<NumericControl/>`,
        `<DateInput/>`,
      ];
      for (const sample of invalid) assert.equal(scan(sample).length, 1, sample);
    } finally {rmSync(tmp, {force: true});}
  });

  test('el escáner detecta violaciones conocidas', () => {
    const tmp = join(root, 'tests', '.a11y-static-probe.tsx');
    const sample = `export function X(){return <div>
      <button onClick={f}><Trash2 size={14}/></button>
      <button aria-label="Borrar" title="Borrar"><Trash2/></button>
      <button>Guardar</button>
      <input value={v}/>
      <label htmlFor="a">A</label><input id="a"/>
      <label>B <input/></label>
      <img src="x"/>
      <div onClick={g}>x</div>
      <div role="dialog">y</div>
      <p id="d"/><p id="d"/>
    </div>}`;
    writeFileSync(tmp, sample);
    try {
      const rules = scanFile(tmp).map((finding) => finding.rule).sort();
      assert.deepEqual(rules, ['click-sin-teclado', 'dialog-nombre', 'icon-button', 'id-duplicado', 'img-alt', 'input-label']);
    } finally {
      rmSync(tmp, {force: true});
    }
  });
}

