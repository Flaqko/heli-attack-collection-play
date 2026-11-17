export function remasterMenuTexture(svg){
 return svg.replace(/(<pattern\b[^>]*id="PatternID_1860_1"[^>]*>)[\s\S]*?(<\/pattern>)/,(_,start,end)=>`${start}<path d="M7 3V7M5 5H9M2-2V2M0 0H4M2 8V12M0 10H4" fill="none" stroke="#000000" stroke-opacity=".21" stroke-width="1"/>${end}`);
}
// Deliberately narrow compiler for the original flat-fill map and locator art.
// Keep unsupported SVGs on their existing decoder rather than approximating them.
export function nativeMenuVector(svg,bounds,{Path=globalThis.Path2D}={}){
 if(!Path||/<(?:image|linearGradient|radialGradient|pattern|mask|filter)\b/.test(svg))return null;
 const groups=[...svg.matchAll(/<g\b[^>]*>/g)];if(groups.length!==1)return null;
 const raw=groups[0][0].match(/transform="matrix\(([^)]+)\)"/)?.[1],matrix=raw?.split(/[,\s]+/).filter(Boolean).map(Number);
 if(matrix?.length!==6||matrix.some(n=>!Number.isFinite(n)))return null;matrix[4]+=bounds[0];matrix[5]+=bounds[1];
 const paths=[];for(const [tag]of svg.matchAll(/<path\b[^>]*>/g)){
  const attr=name=>tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1],d=attr('d'),fill=attr('fill'),opacity=Number(attr('fill-opacity')??1);
  if(!d||!/^#[\da-f]{6}$/i.test(fill||'')||attr('transform')||(attr('stroke')&&attr('stroke')!=='none')||!Number.isFinite(opacity)||opacity<0||opacity>1)return null;
  paths.push({path:new Path(d),matrix:[...matrix],fill,opacity,rule:attr('fill-rule')||'nonzero'});
 }
 return paths.length?paths:null;
}
