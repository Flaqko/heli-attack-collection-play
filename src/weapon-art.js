import {loadRegisteredArt} from './registered-art.js';
export function loadWeaponArt(data,images,options={}){return loadRegisteredArt(data,images,{manifestURL:'assets/enhanced/weapon-art.json',kind:'weapon',...options});}
