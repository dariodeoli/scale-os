import assert from 'node:assert/strict';
import {readFileSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
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
  'DateInput', 'TimeInput', 'DateTimeInput',
]);

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

function forwardsIdProp(node, expression = 'id') {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionLike(current) && current.parameters?.length) {
      const first = current.parameters[0].name;
      const receivesId = ts.isObjectBindingPattern(first) && first.elements.some((element) => element.name.getText() === 'id' && !element.propertyName);
      if (!receivesId) return false;
      if (expression === 'id') return true;
      // #241: un alias `inputId = id || generatedId` conserva el id que envía
      // el consumidor; generar uno ignorando `id` no demuestra asociación.
      return current.body && ts.isBlock(current.body) && current.body.statements.some((statement) =>
        ts.isVariableStatement(statement) && statement.declarationList.declarations.some((declaration) => {
          const init = declaration.initializer;
          return declaration.name.getText() === expression && init && ts.isBinaryExpression(init)
            && init.operatorToken.kind === ts.SyntaxKind.BarBarToken
            && ts.isIdentifier(init.left) && init.left.text === 'id';
        }));
    }
  }
  return false;
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

      if ((name === 'button' || name === 'Button') && !spread && !named) {
        const children = ts.isJsxElement(node) ? node.children : [];
        if (!children.some(hasText)) findings.push({rule: 'icon-button', file: rel, line});
      }
      if ((name === 'input' || name === 'select' || name === 'textarea' || FIELD_PRIMITIVES.has(name)) && !spread) {
        const type = map.get('type');
        const hidden = type === 'hidden' || type === 'submit' || type === 'button' || map.get('hidden') === true || map.get('aria-hidden') === 'true';
        const ownLabel = FIELD_PRIMITIVES.has(name) && (map.has('label') || map.has('legend')) && !map.has('bare');
        if (!hidden && !ownLabel && !insideLabel && !map.has('aria-label') && !map.has('aria-labelledby')) {
          // Primitiva que reenvía `id` desde sus props: la etiqueta la pone el
          // consumidor, y esos usos se verifican como FIELD_PRIMITIVES.
          if (!(typeof id === 'object' && forwardsIdProp(opening, id.expr))) {
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

  test('alias de id sólo se acepta cuando conserva el id externo; campos sin etiqueta siguen fallando', () => {
    const tmp = join(root, 'tests', '.a11y-static-alias-probe.tsx');
    writeFileSync(tmp, `
      export function Good({id}) { const inputId = id || generatedId; return <Input id={inputId}/>; }
      export function Bad({id}) { const inputId = generatedId; return <Input id={inputId}/>; }
      export function Caller() { return <EmailField value="sin etiqueta"/>; }
    `);
    try {
      const findings = scanFile(tmp);
      assert.equal(findings.length, 2);
      assert.deepEqual(findings.map(item => item.rule), ['input-label', 'input-label']);
      assert.deepEqual(findings.map(item => item.line), [3, 4]);
    } finally { rmSync(tmp, {force: true}); }
  });

  test('primitivas canónicas conservan cobertura de etiqueta y nombre accesible', () => {
    const tmp = join(root, 'tests', '.a11y-static-primitives-probe.tsx');
    writeFileSync(tmp, `export function X(){return <div>
      <DateInput/><TimeInput/><DateTimeInput/>
      <label>Fecha <DateInput/></label><TimeInput aria-label="Hora"/>
      <label htmlFor="at">Instante</label><DateTimeInput id="at"/>
      <Button icon={<Trash/>}/><Button aria-label="Borrar" icon={<Trash/>}/><Button>Guardar</Button>
    </div>}`);
    try {
      assert.deepEqual(scanFile(tmp).map(item => item.rule).sort(), ['icon-button', 'input-label', 'input-label', 'input-label']);
    } finally { rmSync(tmp, {force: true}); }
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

