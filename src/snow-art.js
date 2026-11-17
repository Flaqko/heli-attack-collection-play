import{createTileDetailMask}from'./tile-detail.js';
import{resolveSnowTreeImage}from'./snow-tree-context.js';
const loadImage=path=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Snow artwork could not load.'));image.src=path;});
const createCanvas=(width,height)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):Object.assign(document.createElement('canvas'),{width,height});
// Slice complete crowns rather than independently drawing adjacent tiles. Each
// 32px interior retains the original one-pixel gutter on every side at 4x.
export async function loadSnowArt(images,{manifest,loadImage:decode=loadImage,createCanvas:canvas=createCanvas}={}){
 if(!manifest){const response=await fetch('assets/enhanced/snow-art.json');if(!response.ok)throw Error('Snow registration could not load.');manifest=await response.json();}
 const entries=[manifest.background,manifest.trees],atlases=await Promise.all(entries.map(a=>decode(a.path)));
 entries.forEach((a,i)=>{if(atlases[i].naturalWidth!==a.width||atlases[i].naturalHeight!==a.height)throw Error('Snow artwork dimensions do not match registration.');});
 const prepared=[],mask=createTileDetailMask(canvas),background=canvas(1792,1280);background.getContext('2d').drawImage(atlases[0],0,0,1792,1280);background.sharpVector=true;background.remasteredSnow=true;prepared.push([manifest.background.id,background]);
 for(const group of manifest.groups){
  const connected=canvas((group.columns*32+2)*4,(group.rows*32+2)*4),ctx=connected.getContext('2d'),[x,y,w,h]=group.target;
  ctx.drawImage(atlases[1],...group.source,(x+1)*4,(y+1)*4,w*4,h*4);
  for(let n=0;n<group.ids.length;n++){
   const id=group.ids[n];if(!id)continue;
   const original=images.get(id);if(!original)throw Error('Original tree silhouette is missing: '+id);
   const detail=canvas(136,136),dc=detail.getContext('2d');dc.drawImage(connected,n%group.columns*128,Math.floor(n/group.columns)*128,136,136,0,0,136,136);dc.globalCompositeOperation='destination-in';dc.drawImage(mask,0,0);
   const tile=canvas(136,136),tc=tile.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(original,0,0,136,136);tc.globalCompositeOperation='source-atop';tc.drawImage(detail,0,0);tc.globalCompositeOperation='source-over';
   tile.bitmapTile=true;tile.sharpVector=true;tile.remasteredSnow=true;prepared.push([id,tile]);
  }
 }
 const tiles=new Map(prepared),bottom=tiles.get(1581),middle=tiles.get(1553);if(bottom&&middle)bottom.resolveForClip=clip=>resolveSnowTreeImage(clip,bottom,middle);
 // Optional art cannot leave a partially replaced scene after an error.
 for(const[id,image]of prepared)images.set(id,image);
 return prepared.length;
}
