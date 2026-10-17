import ts from 'typescript';

/** Query actual local action bindings; never treats an arbitrary JSX alias as Button. */
export function actionElements(source:string){
 const file=ts.createSourceFile('consumer.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const bindings=new Map<string,string>();
 for(const statement of file.statements){
  if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier)||!/(^|\/)ui\/button$/.test(statement.moduleSpecifier.text))continue;
  const imported=statement.importClause?.namedBindings;if(!imported||!ts.isNamedImports(imported))continue;
  for(const item of imported.elements){const kind=(item.propertyName||item.name).text;if(['Button','IconButton'].includes(kind))bindings.set(item.name.text,kind);}
 }
 const actions:{kind:string;node:ts.JsxOpeningElement|ts.JsxSelfClosingElement;attribute:(name:string)=>string|true|undefined;children:string;attributeOwner:()=>string|undefined;guardedBy:(condition:string)=>boolean}[]=[];
 function walk(node:ts.Node){
  if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&bindings.has(node.tagName.getText(file))){
   const element=ts.isJsxOpeningElement(node)?node.parent:node;
   actions.push({kind:bindings.get(node.tagName.getText(file))!,node,
    attribute(name){const property=node.attributes.properties.find(property=>ts.isJsxAttribute(property)&&property.name.getText(file)===name) as ts.JsxAttribute|undefined;if(!property)return undefined;if(!property.initializer)return true;if(ts.isStringLiteral(property.initializer))return property.initializer.text;return ts.isJsxExpression(property.initializer)?property.initializer.expression?.getText(file):undefined;},
    children:ts.isJsxElement(element)?element.children.map(child=>child.getText(file)).join('').trim():'',
    attributeOwner(){return ts.isJsxExpression(element.parent)&&ts.isJsxAttribute(element.parent.parent)?element.parent.parent.name.getText(file):undefined;},
    guardedBy(condition){for(let parent:ts.Node|undefined=node.parent;parent;parent=parent.parent){if(ts.isConditionalExpression(parent)&&parent.condition.getText(file)===condition&&node.pos>=parent.whenTrue.pos&&node.end<=parent.whenTrue.end)return true;if(ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.AmpersandAmpersandToken&&parent.left.getText(file)===condition&&node.pos>=parent.right.pos&&node.end<=parent.right.end)return true;}return false;},
   });
  }
  ts.forEachChild(node,walk);
 }
 walk(file);return actions;
}
