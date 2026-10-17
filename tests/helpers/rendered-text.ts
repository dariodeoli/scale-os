import type {ReactTestInstance} from 'react-test-renderer';

/** Visible text of a rendered host subtree, independent of a facade's prop shape. */
export function renderedText(node:ReactTestInstance|string):string{
 return typeof node==='string'?node:node.children.map(renderedText).join('');
}
