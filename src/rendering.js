import {morphGeometry,traceMorph} from './morph.js';
export const IDENTITY_COLOR=Object.freeze([1,1,1,1,0,0,0,0]);
export function clipColor(clip){
 if((clip._alpha??100)===100&&(clip.suppressColorTransform||(!clip.colorTransform&&clip.tint===undefined)))return IDENTITY_COLOR;
 const t=clip.suppressColorTransform?{}:clip.colorTransform||{},c=['r','g','b','a'].map(k=>Number(t[k+'a']??100)/100);
 c[3]=Number(clip._alpha??100)/100;c.push(...['r','g','b','a'].map(k=>Number(t[k+'b']??0)));
 if(!clip.suppressColorTransform&&clip.tint!==undefined){c[0]=c[1]=c[2]=0;c[4]=(clip.tint>>16)&255;c[5]=(clip.tint>>8)&255;c[6]=clip.tint&255;}
 return c;
}
export function composeColor(parent,child){if(child===IDENTITY_COLOR)return parent;if(parent===IDENTITY_COLOR)return child;return [...child.slice(0,4).map((v,i)=>v*parent[i]),...child.slice(4).map((v,i)=>v*parent[i]+parent[i+4])];}
export function transformPixels(pixels,color){for(let i=0;i<pixels.length;i+=4){if(!pixels[i+3])continue;for(let k=0;k<4;k++)pixels[i+k]=pixels[i+k]*color[k]+color[k+4];}return pixels;}
export function colorCSS(css,color){const hex=css.replace('#','');const n=parseInt(hex.length===3?[...hex].map(c=>c+c).join(''):hex,16);const rgba=transformPixels(new Uint8ClampedArray([n>>16&255,n>>8&255,n&255,255]),color);return `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]/255})`;}
export function drawVectorPaths(ctx,paths,color){for(const part of paths){ctx.save();ctx.transform(...part.matrix);ctx.fillStyle=colorCSS(part.fill,color.map((n,i)=>i===3?n*part.opacity:n));ctx.fill(part.path,part.rule);ctx.restore();}}
const cache=new Map();let cacheBytes=0;const MAX_CACHE_BYTES=32*1024*1024;
export function coloredImage(image,color){
 if(color===IDENTITY_COLOR||color.every((v,i)=>v===IDENTITY_COLOR[i]))return image;
 let variants=cache.get(image);const key=color.join(',');if(variants?.has(key))return variants.get(key);
 const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
 const scale=Math.min(image.sharpVector?1:2,2048/Math.max(iw,ih),Math.sqrt(2e6/(iw*ih)));
 const w=Math.max(1,Math.ceil(iw*scale)),h=Math.max(1,Math.ceil(ih*scale));
 const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(image.bitmapTile)ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,w,h);
 const pixels=ctx.getImageData(0,0,w,h);transformPixels(pixels.data,color);ctx.putImageData(pixels,0,0);
 const bytes=w*h*4;if(cacheBytes+bytes>MAX_CACHE_BYTES){cache.clear();cacheBytes=0;variants=undefined;}
 if(!variants){variants=new Map();cache.set(image,variants);}variants.set(key,canvas);cacheBytes+=bytes;return canvas;
}
export function maskShapeIds(data){
 const ids=new Set(),visited=new Set();function visit(id){if(visited.has(id))return;visited.add(id);const s=data.symbols[id];if(s?.kind==='shape')ids.add(Number(id));for(const f of s?.frames||[])for(const p of f)visit(p.id);}
 for(const s of Object.values(data.symbols))for(const f of s.frames||[])for(const p of f)if(p.clipDepth)visit(p.id);
 return ids;
}
// FFDec SVG paths retain the original shape coordinates; the outer group only
// translates the SVG viewport. Retain nested transforms, undo that viewport shift.
export function svgMaskPaths(svg,bounds){
 const doc=new DOMParser().parseFromString(svg,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid mask SVG');
 const paths=[];function walk(node,matrix){
  const transform=node.getAttribute?.('transform');if(transform)matrix=matrix.multiply(new DOMMatrix(transform));
  if(node.localName==='path'&&node.getAttribute('fill')!=='none')paths.push({path:new Path2D(node.getAttribute('d')),matrix,rule:node.getAttribute('fill-rule')||'nonzero'});
  for(const child of node.children||[])walk(child,matrix);
 }
 walk(doc.documentElement,new DOMMatrix().translate(bounds[0],bounds[1]));return paths;
}
export async function loadMaskGeometry(data,images,{fetch:fetcher=globalThis.fetch,concurrency=6,ids:selection}={}){
 images.maskPaths??=new Map();const ids=[...maskShapeIds(data)].filter(id=>(!selection||selection.has(id))&&!images.maskPaths.has(id));let cursor=0;
 await Promise.all(Array.from({length:Math.min(concurrency,ids.length)},async()=>{while(cursor<ids.length){const id=ids[cursor++];const response=await fetcher(data.symbols[id].path||`assets/shapes/${id}.svg`);if(!response.ok)throw Error(`Missing mask ${id}`);images.maskPaths.set(id,svgMaskPaths(await response.text(),data.symbols[id].bounds));}}));
}
export function maskPath(clip,images){
 const result=new Path2D();function visit(c,m){const next=m.multiply(new DOMMatrix(c.matrix));if(c.symbol?.kind==='morph'){const path=new Path2D();traceMorph(path,morphGeometry(c.symbol,c.ratio));result.addPath(path,next);}for(const part of images.maskPaths?.get(c.id)||[])result.addPath(part.path,next.multiply(part.matrix));for(const child of c.children.values())visit(child,next);}
 visit(clip,new DOMMatrix());return result;
}
