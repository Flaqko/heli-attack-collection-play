import{loadRegisteredArt}from'./registered-art.js';
export function loadEnemyArt(data,images,options={}){return loadRegisteredArt(data,images,{manifestURL:'assets/enhanced/enemy-art.json',kind:'enemy',...options});}
