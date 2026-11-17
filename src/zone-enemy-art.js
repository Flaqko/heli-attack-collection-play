import{loadRegisteredArt}from'./registered-art.js';
// Restrict each biome to its original reachable enemies and avoid unrelated atlas decoding.
export function selectZoneEnemyArt(manifest,ids,images){const wanted=new Set(ids),sprites=manifest.sprites.filter(s=>wanted.has(s.id)&&!images.get(s.id)?.remasteredEnemy),batches=[...new Set(sprites.map(s=>s.batch))];return{...manifest,atlases:batches.map(i=>manifest.atlases[i]),sprites:sprites.map(s=>({...s,batch:batches.indexOf(s.batch)}))};}
export async function loadZoneEnemyArt(data,images,{ids=[],manifest,animatedRotors=false,fetch:fetcher=globalThis.fetch,...options}={}){
 const wanted=new Set(ids);if(!wanted.size)return 0;
 if(!manifest){const response=await fetcher('assets/enhanced/zone-enemy-art.json');if(!response.ok)throw Error('Zone enemy manifest could not load.');manifest=await response.json();}
 const selected=selectZoneEnemyArt(manifest,wanted,images);if(!selected.sprites.length)return 0;
 if(animatedRotors)for(const sprite of selected.sprites)if(sprite.id===1106)delete sprite.preserve;
 return loadRegisteredArt(data,images,{kind:'enemy',...options,manifest:selected});
}
