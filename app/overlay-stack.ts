export function createLayerStack(){
 const layers:symbol[]=[];
 return {add(id:symbol){layers.push(id);},remove(id:symbol){const i=layers.indexOf(id);if(i>=0)layers.splice(i,1);},isTop(id:symbol){return layers.at(-1)===id;},get size(){return layers.length;}};
}
