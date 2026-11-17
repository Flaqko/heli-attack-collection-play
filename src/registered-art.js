import {snapshotArtwork} from './artwork-bitmap.js';
import {decodeVector} from './startup.js';
function loadImage(path){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Remastered artwork atlas could not load.'));image.src=path;});}
const createCanvas=(width,height)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):Object.assign(document.createElement('canvas'),{width,height});
// Composite source shapes keep their sight/arrow paths and original layer order.
export function removeBitmapFill(svg,bitmapId){let removed=0;const result=svg.replace(/<path\b[^>]*\/>/g,tag=>tag.includes(`ffdec:fill-bitmapId="${bitmapId}"`)?(removed++,''):tag);if(removed!==1)throw Error('Original weapon bitmap fill is missing or ambiguous.');return result;}
export async function loadRegisteredArt(data,images,{manifestURL,kind,manifest,loadImage:decode=loadImage,createCanvas:canvas=createCanvas,baseSources={},decodeBase=decodeVector}={}){
 if(!manifest){const response=await fetch(manifestURL);if(!response.ok)throw Error(`Remastered ${kind} manifest could not load.`);manifest=await response.json();}
 const entries=manifest.atlases||[{path:manifest.atlas,width:manifest.width,height:manifest.height}],atlases=await Promise.all(entries.map(a=>decode(a.path)));
 entries.forEach((entry,i)=>{if(atlases[i].naturalWidth!==entry.width||atlases[i].naturalHeight!==entry.height)throw Error(`Remastered ${kind} atlas dimensions do not match registration.`);});
 await Promise.all(atlases.map(atlas=>atlas.decode?.()));
 // Share one raster per atlas while cropping and composing the registered sprites.
 const sources=await Promise.all(atlases.map(async atlas=>{
  if(typeof createImageBitmap!=='function')return atlas;
  try{return await createImageBitmap(atlas);}catch{return atlas;}
 }));
 // Register against exact logical bounds, including the sniper sight's fractional width.
 const prepared=[];
 let sliceStart=performance.now();
 try{
  for(const sprite of manifest.sprites){const [,,width,height]=data.symbols[sprite.id].bounds,image=canvas(Math.ceil(width*4),Math.ceil(height*4)),ctx=image.getContext('2d'),scaleX=image.width/width,scaleY=image.height/height;let base;
   if(sprite.preserve){const source=baseSources[`assets/shapes/${sprite.id}.svg`];if(!source)throw Error('Missing original weapon source for preserved sight.');base=await decodeBase(removeBitmapFill(source,sprite.preserve.bitmapId));}
   if(base&&sprite.preserve.order==='below')ctx.drawImage(base,0,0,image.width,image.height);
   const [x,y,w,h]=sprite.target;ctx.drawImage(sources[sprite.batch||0],...sprite.source,x*scaleX,y*scaleY,w*scaleX,h*scaleY);
   if(base&&sprite.preserve.order==='above')ctx.drawImage(base,0,0,image.width,image.height);
   const flag='remastered'+kind[0].toUpperCase()+kind.slice(1);
   prepared.push([sprite.id,snapshotArtwork(image,{[flag]:true,sharpVector:true})]);
   if(typeof requestAnimationFrame==='function'&&performance.now()-sliceStart>=4){
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    sliceStart=performance.now();
   }
  }
 }finally{
  sources.forEach((source,i)=>{if(source!==atlases[i])source.close();});
 }
 // Publish only after every atlas, source overlay and surface has prepared successfully.
 for(const [id,image]of prepared)images.set(id,image);
 return prepared.length;
}
