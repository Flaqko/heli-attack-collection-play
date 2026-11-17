import {vectorURL} from './vector-pack.js';
import {bitmapTileSource} from './tile-image.js';
import {prepareVector} from './vector-quality.js';
// Zones 1-1 through 1-4 use snow scenery, drones, critters and helicopters (frame-15 level entity/map data).
// Keep every weapon/effect linkage, including cheat-unlocked weapons. Only
// scenery and enemy types confined to deferred zones are excluded from startup.
const deferredLinks=new Set(['canyonBG','jungleBG','trainingBG','canyonTiles','canyonTilesCrumble','jungleTiles','trainingTiles','trainingTilesCrumble','enemyHeli2','enemyHeli3','enemyWalker','enemySniper','leaf']);
export function gameplayShapeIds(data,level=1){
 const shapes=new Set(),visited=new Set();function visit(id){if(visited.has(id))return;visited.add(id);const s=data.symbols[id];if(s?.kind==='shape')shapes.add(Number(id));for(const frame of s?.frames||[])for(const p of frame)visit(p.id);}
 for(const [name,id]of Object.entries(data.names))if(!deferredLinks.has(name)||(level>=5&&level<9&&['jungleBG','jungleTiles','leaf','enemyHeli2'].includes(name))||(level>=9&&level<13&&['canyonBG','canyonTiles','canyonTilesCrumble','enemyWalker','enemyHeli2','enemyHeli3'].includes(name))||((level===0||level>=13)&&['trainingBG','trainingTiles','trainingTilesCrumble','enemySniper','enemyHeli2','enemyHeli3','enemyWalker'].includes(name)))visit(id);
 return shapes;
}
// Follow nested timelines, including animation and rollover frames.
export function menuShapeIds(data,labels=Object.keys(data.rootLabels)){
 const shapes=new Set(),visited=new Set();
 function visit(id){if(visited.has(id))return;visited.add(id);const s=data.symbols[id];if(s?.kind==='shape')shapes.add(Number(id));for(const frame of s?.frames||[])for(const p of frame)visit(p.id);}
 for(const label of labels)if(!['load','version','preload','init','initgame','game'].includes(label))for(const p of data.symbols[-1]?.frames?.[data.rootLabels[label]-1]||[])visit(p.id);
 return shapes;
}
export function decodeVector(svg,{rasterize=false}={}){return new Promise((resolve,reject)=>{
 const image=new Image(),bitmap=bitmapTileSource(svg),prepared=bitmap?{svg,sharpVector:false}:prepareVector(svg),url=bitmap||vectorURL(prepared.svg),release=()=>{if(!bitmap)URL.revokeObjectURL(url);};
 const flags={bitmapTile:Boolean(bitmap),sharpVector:prepared.sharpVector};
 image.onload=async()=>{
  let artwork=image;
  if(rasterize&&typeof createImageBitmap==='function'){
   try{artwork=await createImageBitmap(image);}catch{} // Keep the decoded source if rasterization is unavailable.
  }
  release();resolve(Object.assign(artwork,flags));
 };
 image.onerror=()=>{release();reject(Error('Original artwork could not decode.'));};image.src=url;
});}
export async function loadShapes(data,images,vectors,ids,{concurrency=6,rasterize=false,decode=svg=>decodeVector(svg,{rasterize}),onProgress=()=>{}}={}){
 const pending=[...ids].filter(id=>!images.has(id));let cursor=0,loaded=0;
 await Promise.all(Array.from({length:Math.min(Math.max(1,concurrency),pending.length)},async()=>{
  while(cursor<pending.length){const id=pending[cursor++],path=data.symbols[id]?.path||`assets/shapes/${id}.svg`;if(!Object.hasOwn(vectors,path))throw Error(`Missing original shape ${id}`);const image=await decode(vectors[path]);if(!images.has(id))images.set(id,image);onProgress(++loaded,pending.length);}
 }));
}
