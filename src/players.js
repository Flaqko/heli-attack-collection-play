import {readProfiles,writeProfiles} from './save.js';
import {hotspot,textRegion,textInput,inputValue,statisticsText,weaponText} from './menu-content.js';
import {mountCheatPicker} from './cheat-picker.js';
export function mountPlayerPage({menu,layer,page,show,root,storage,onSelected,onError,cheats=[]}){
 const roster=readProfiles(storage);if(roster.error){onError('Existing save could not be read; it is preserved.');return;}
 const stats=roster.players[roster.active]||root.stats,find=id=>[...menu.children.values()].find(c=>c.id===id);
 const persist=(next,destination)=>{try{writeProfiles(storage,next);onSelected(next.players[next.active]||null);show(destination);}catch(e){onError(e.message);}};
 if(page==='stats')textRegion(menu,layer,menu.statsd,statisticsText(stats,root.guns),'Player statistics');
 if(page==='weapons')textRegion(menu,layer,menu.weaponsd,weaponText(root.guns,stats),'Weapon data');
 if(page==='new'){
  if(roster.players.length>=3){menu.gotoAndStop(menu.data.rootLabels.error);menu.layoutViewport?.('error');menu.bgcolor?.gotoAndStop(2);menu.logo?.gotoAndStop(2);menu.errormessage='Too Many Players!';hotspot(menu,layer,find(2044),'Back to players',()=>show('players'));onError('Too Many Players!');return;}
  find(2022)._visible=false; // Authored "game quality" label.
  menu.quals._visible=false;
  menu.newname='';
  const input=textInput(menu,layer,find(2019),'Player name','Player');
  const create=()=>{const p=root.newPlayer(inputValue(input)||'Player',2);persist({players:[...roster.players,p],active:roster.players.length},roster.players.length?'players':'menu');};hotspot(menu,layer,find(2017),'Create player',create);input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();create();}};
  if(roster.players.length)hotspot(menu,layer,menu.canc,'Cancel new player',()=>show('players'));else if(menu.canc)menu.canc._visible=false;
 }
 if(page==='change'||page==='select')for(let i=0;i<roster.players.length;i++){const clip=menu.playersDisplay.attachMovie('playerDisplay','d_'+i,i);clip._x=-clip._width*(roster.players.length-1)/2+i*clip._width;clip.name=roster.players[i].name;hotspot(menu,layer,clip,'Select '+clip.name,()=>persist({...roster,active:i},page==='select'?'menu':'players'));}
 if(page==='del'){menu.delname=stats.name+'?';hotspot(menu,layer,find(2033),'Delete '+stats.name,()=>{const players=roster.players.filter((_,i)=>i!==roster.active);persist({players,active:players.length?Math.min(roster.active,players.length-1):-1},players.length?'change':'new');});}
 if(page==='cheats')mountCheatPicker({menu,layer,root,stats,roster,storage,cheats,onSelected,onError});
}
