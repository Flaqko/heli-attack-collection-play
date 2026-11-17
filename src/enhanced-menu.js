// Adapt the combined original menu glyph sheet without changing source assets.
export function menuWithoutHighscores(svg){
 return svg.replace(/<path\b[^>]*\/>/g,path=>{
  const position=/translate\(([^ ]+) ([^)]+)\)/.exec(path);if(!position)return path;
  const y=Number(position[2]);if(y===63)return '';
  return y>63?path.replace(position[0],`translate(${position[1]} ${y-36})`):path;
 });
}
export function enableSmoothMenuText(data){
 data.smoothSmallText=true;
 // The Zone X dossier warning was exported as glyph outlines, not a text field.
 const warning=data.symbols[2067];
 data.symbols[2067]={
  kind:'text',bounds:warning.bounds,text:warning.label,
  fontFamily:'FlashArial',size:12,color:'#ffffff',align:2,
 };
}
