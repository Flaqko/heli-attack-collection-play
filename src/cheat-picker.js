import {bindMenuHighlight} from './menu-highlight.js';
import {cheatChoices,applyCheatChoice} from './cheats.js';
import {writeProfiles} from './save.js';
import {resolveTextFamily} from './text-layout.js';
export function mountCheatPicker({menu,layer,root,stats,roster,storage,cheats,onSelected,onError}){
 // Replace the old code-entry art; retain the original background/title/back.
 for(const c of menu.children.values())if([2077,2079,2016,2080,2081,2082,1932].includes(c.id))c._visible=false;
 const width=menu.viewportWidth||448,list=document.createElement('div'),status=document.createElement('div');
 const family=resolveTextFamily('FlashArial',menu.data);
 list.className='cheat-list';list.setAttribute('role','region');list.setAttribute('aria-label','Cheats');
 list.style.cssText=`position:absolute;pointer-events:auto;left:${20/width*100}%;top:25%;width:${(width-40)/width*100}%;height:51%;font:${12/width*100}cqw ${family}`;
 status.className='cheat-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.cssText=`position:absolute;left:${20/width*100}%;top:77%;width:${(width-40)/width*100}%;height:11%;font:${10/width*100}cqw ${family};line-height:1.1;white-space:pre-wrap;overflow:auto;pointer-events:auto`;
 status.textContent=roster.active<0?'Create a player to use cheats.':'Select a cheat. Changes are saved for '+stats.name+'.';
 const buttons=new Map(),choices=cheatChoices(root,cheats);
 function refresh(){for(const [choice,button]of buttons){const unlocked=Boolean(choice.unlocked?.(stats));const enabled=choice.toggle&&stats[choice.toggle]===true;button.disabled=roster.active<0||unlocked;if(choice.toggle)button.setAttribute('aria-pressed',String(Boolean(enabled)));button.textContent=choice.label+(choice.toggle?(enabled?' — On':' — Off'):(unlocked?' — Unlocked':''))+'\n'+choice.detail;}}
 for(const choice of choices){const button=document.createElement('button');button.className='cheat-choice';bindMenuHighlight(layer,button);button.setAttribute('aria-label',choice.label);button.onclick=()=>{
   if(button.disabled)return;
   const next=structuredClone(stats),message=applyCheatChoice(root,next,choice.id,cheats);if(!message)return;
   if(!choice.unlocked&&!choice.toggle){status.textContent=message;return;}
   try{const players=[...roster.players];players[roster.active]=next;writeProfiles(storage,{...roster,players});roster.players=players;Object.assign(stats,next);onSelected(next);refresh();status.textContent=message+'\nSaved for '+stats.name+'.';}catch(e){status.textContent='Could not save this cheat.';onError(e.message);}
  };buttons.set(choice,button);list.append(button);}
 refresh();layer.append(list);layer.append(status);
}
