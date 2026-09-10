export function selectPosition(rect: {top:number;bottom:number;left:number;width:number}, viewport: {width:number;height:number}, desiredHeight=380): {left:number;width:number;maxHeight:number;top?:number;bottom?:number} {
  const gap=6, edge=12;
  const below=Math.max(0,viewport.height-rect.bottom-gap-edge);
  const above=Math.max(0,rect.top-gap-edge);
  const upward=below<desiredHeight&&above>below;
  const maxHeight=Math.min(desiredHeight,upward?above:below);
  const width=Math.min(rect.width,Math.max(0,viewport.width-edge*2));
  return {left:Math.max(edge,Math.min(rect.left,viewport.width-width-edge)),width,maxHeight,
    ...(upward?{bottom:viewport.height-rect.top+gap}:{top:rect.bottom+gap})};
}
