// Preserve source gutter colors, easing into sharper detail over 3.5 logical px.
export function tileDetailWeight(x,y,size=136){const distance=Math.min(x,y,size-1-x,size-1-y),t=Math.max(0,Math.min(1,(distance-4)/14));return t*t*(3-2*t);}
export function createTileDetailMask(canvas){const mask=canvas(136,136),ctx=mask.getContext('2d'),pixels=ctx.createImageData(136,136);for(let y=0;y<136;y++)for(let x=0;x<136;x++){const i=(y*136+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;pixels.data[i+3]=Math.round(tileDetailWeight(x,y)*255);}ctx.putImageData(pixels,0,0);return mask;}
