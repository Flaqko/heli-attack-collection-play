// Original 34px bitmap tiles already include their authored overlap gutter.
// Decode the exact bitmap rather than rasterizing another repeating SVG pattern.
export function bitmapTileSource(svg){
 if(/\b(?:opacity|filter|clip-path|mask)\s*[:=]/.test(svg)||[...svg.matchAll(/\b(?:patternTransform|transform)="[^"]+"/g)].length!==2)return null;
 if(!/width="34\.0px"/.test(svg)||!/height="34\.0px"/.test(svg))return null;
 const paths=[...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)];
 if(paths.length!==1||paths[0][1]!=='M0.0 0.0 L34.0 0.0 34.0 34.0 0.0 34.0 0.0 0.0')return null;
 const matrices=[...svg.matchAll(/(?:patternTransform|transform)="matrix\(([^)]+)\)"/g)];
 if(matrices.length!==2||matrices.some(m=>{const values=m[1].split(/[,\s]+/).filter(Boolean).map(Number);return values.length!==6||values.some((v,i)=>v!==[1,0,0,1,0,0][i]);}))return null;
 const tags=[...svg.matchAll(/<image\b[^>]*>/g)];if(tags.length!==1||!(/\bwidth="34"/.test(tags[0][0])&&/\bheight="34"/.test(tags[0][0])))return null;
 const images=[...svg.matchAll(/<image\b[^>]*xlink:href="(data:image\/PNG;base64,[^"]+)"/g)];
 return images.length===1?images[0][1]:null;
}
