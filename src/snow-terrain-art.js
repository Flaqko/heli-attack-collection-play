import{loadTileArt}from'./tile-art.js';
export{tileDetailWeight as terrainDetailWeight}from'./tile-detail.js';
export async function loadSnowTerrainArt(images,{manifest,...options}={}){
 if(!manifest){const response=await fetch('assets/enhanced/snow-terrain-art.json');if(!response.ok)throw Error('Snow terrain registration could not load.');manifest=await response.json();}
 return loadTileArt(images,{...options,manifest,flag:'remasteredSnowTerrain'});
}
