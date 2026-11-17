import {loadRegisteredArt} from './registered-art.js';
export function loadPlayerArt(data,images,options={}){return loadRegisteredArt(data,images,{manifestURL:'assets/enhanced/player-art.json',kind:'player',...options});}
