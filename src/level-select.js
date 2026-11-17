import {hotspot} from './menu-content.js';
import {LAST_PLAYABLE_LEVEL} from './campaign.js';
export function selectedLevel(stats,requested=stats?.level){let level=Math.min(LAST_PLAYABLE_LEVEL,Math.max(0,Number.isInteger(requested)?requested:0));while(level>1&&!stats?.levels?.[level])level--;return level;}
export function mountLevelSelect(menu,layer,{levels,stats,level,onSelect}){
 level=selectedLevel(stats,level);const source=levels[level];
 menu.currentLevel=source.name;menu.mapd.gotoAndStop(source.mapd+1);
 const {small,large}=menu.mapd;for(const map of [small,large])if(map?.circle){map.circle._x=source.mapdx;map.circle._y=source.mapdy;}
 large._x=-source.mapdx*9.5+250;large._y=-source.mapdy*9.5+50;large._xscale=large._yscale=950;large.circle._xscale=large.circle._yscale=50;
 const previous=level>0?selectedLevel(stats,level-1):null;
 let next=level+1;
 while(next<=LAST_PLAYABLE_LEVEL&&!stats.levels?.[next])next++;
 menu.prevc._visible=previous!==null;
 menu.nextc._visible=next<=LAST_PLAYABLE_LEVEL;
 for(const [clip,label,target,step]of [[menu.prevc,'Previous level',previous,'previous'],[menu.nextc,'Next level',next,'next']]){
  if(!clip._visible)continue;
  const button=hotspot(menu,layer,clip,label,()=>onSelect(target));
  button.setAttribute('data-level-step',step);
 }
}
