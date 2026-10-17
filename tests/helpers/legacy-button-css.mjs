import postcss from 'postcss';
/** Native controls still use these legacy rules. Existing native-contract tests
 * inspect their declarations independently of the canonical-button exclusion.
 * Canonical ownership is covered separately by the Button tests/browser matrix.
 * Only remove the zero-specificity guard, then reunite adjacent layout/visual
 * rule halves; do not change declarations, values, media conditions, or order. */
export function legacyButtonCss(source){
 const root=postcss.parse(source.replaceAll(':not(:where([data-ui-button]))',''));
 root.walkRules(rule=>{
  let next=rule.next();while(next?.type==='rule'&&next.selector===rule.selector){
   rule.append(...next.nodes.map(node=>node.clone()));next.remove();next=rule.next();
  }
 });
 return root.toString();
}
