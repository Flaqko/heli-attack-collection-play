import {snapshotArtwork} from './artwork-bitmap.js';
import{createTileDetailMask}from'./tile-detail.js';
export const loadArtworkImage=path=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Tile artwork atlas could not load.'));image.src=path;});
export const createArtworkCanvas=(width,height)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):Object.assign(document.createElement('canvas'),{width,height});
// Arbitrary source tile combinations must meet in their original edge colors.
// Preserve the gutter/border, then ease into the sharper interior over 3.5px.
export async function loadTileArt(images,{manifest,loadImage:decode=loadArtworkImage,createCanvas:canvas=createArtworkCanvas,flag='remasteredTile'}={}){
 const atlases=await Promise.all(manifest.atlases.map(a=>decode(a.path)));
 await Promise.all(atlases.map(atlas=>atlas.decode?.()));
 manifest.atlases.forEach((a,i)=>{if(atlases[i].naturalWidth!==a.width||atlases[i].naturalHeight!==a.height)throw Error('Tile artwork atlas dimensions do not match registration.');});
 const prepared=new Map(),mask=createTileDetailMask(canvas);
 const protectedMask=canvas(136,136);
 const maskContext=protectedMask.getContext('2d',{willReadFrequently:true});
 maskContext.imageSmoothingEnabled=false;
 let sliceStart=performance.now();
 for(const group of manifest.groups){
  const preservedColors=new Set((group.preserveColors||[]).map(([r,g,b])=>(r<<16)|(g<<8)|b));
  const width=group.columns*128,height=group.rows*128,connected=canvas(width+8,height+8),ctx=connected.getContext('2d'),[x,y,w,h]=group.target;
  ctx.drawImage(atlases[group.batch],...group.source,(x+1)*4,(y+1)*4,w*4,h*4);
  // Extend boundary samples into the original overlap gutter. Internal gutters
  // sample the same connected painting rather than separately scaled tiles.
  ctx.drawImage(connected,4,4,1,height,0,4,4,height);ctx.drawImage(connected,width+3,4,1,height,width+4,4,4,height);
  ctx.drawImage(connected,0,4,width+8,1,0,0,width+8,4);ctx.drawImage(connected,0,height+3,width+8,1,0,height+4,width+8,4);
  for(let n=0;n<group.ids.length;n++){
   const id=group.ids[n];if(!id||prepared.has(id))continue;
   const original=images.get(id);if(!original)throw Error('Original tile silhouette is missing: '+id);
   const detail=canvas(136,136),dc=detail.getContext('2d');dc.drawImage(connected,n%group.columns*128,Math.floor(n/group.columns)*128,136,136,0,0,136,136);dc.globalCompositeOperation='destination-in';dc.drawImage(mask,0,0);
   const tile=canvas(136,136),tc=tile.getContext('2d');tc.imageSmoothingEnabled=false;tc.drawImage(original,0,0,136,136);
   // Registered material tones stay continuous across arbitrary tile joins;
   // new paint refines the remaining illustrated features instead.
   if(preservedColors.size){
    maskContext.globalCompositeOperation='copy';
    maskContext.drawImage(original,0,0,136,136);
    const pixels=maskContext.getImageData(0,0,136,136);
    for(let i=0;i<pixels.data.length;i+=4){
     const protectedColor=preservedColors.has((pixels.data[i]<<16)|(pixels.data[i+1]<<8)|pixels.data[i+2]);
     pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
     pixels.data[i+3]=protectedColor?0:255;
    }
    maskContext.putImageData(pixels,0,0);
    dc.drawImage(protectedMask,0,0);
   }
   // Source-atop keeps the original alpha even for holes, ropes and slopes;
   // transparent gaps in optional art retain the original painted surface.
   tc.globalCompositeOperation='source-atop';tc.drawImage(detail,0,0);tc.globalCompositeOperation='source-over';
   prepared.set(id,snapshotArtwork(tile,{bitmapTile:true,sharpVector:true,[flag]:true}));
   // Let the browser paint between batches of terrain being prepared during play.
   if(typeof requestAnimationFrame==='function' && performance.now()-sliceStart>=4){
    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
    sliceStart=performance.now();
   }
  }
 }
 for(const[id,image]of prepared)images.set(id,image);
 return prepared.size;
}
