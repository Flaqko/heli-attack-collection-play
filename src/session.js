import {toggleFields,mergeSettings} from './options.js';
import {gameplaySoundNames} from './audio.js';
const controls=['leftKey','rightKey','upKey','downKey','timeKey','specialKey','switchKey','switchDownKey','grenadeKey','pauseKey'];
const pendingStarts=new WeakMap();
export function startSession(options){const game=options.game;if(pendingStarts.has(game))return pendingStarts.get(game);const operation=performStart(options).finally(()=>pendingStarts.delete(game));pendingStarts.set(game,operation);return operation;}
async function performStart({game,audio,running,saved,mappings={},ready,level=1}){
 await Promise.all([audio.unlock(),ready]);
 if(running&&game.paused){game.paused=false;game.keys.clear();await audio.pause(false);return 'resume';}
 const preferences={...saved,...mappings},cues=gameplaySoundNames(audio.sounds||{},game.root.levels?.[level]?.bgm,preferences);
 await audio.prepare?.(cues);
 audio.stop();const initial=saved||game.root.newPlayer?.('Player',2);game.start(initial?mergeSettings(initial,mappings):initial,{level});
 for(const key of controls)if(Number.isInteger(mappings[key]))game.root.stats[key]=mappings[key];
 for(const key of toggleFields)if(typeof mappings[key]==='boolean')game.root.stats[key]=mappings[key];
 game.root.menuToggle?.();game.root.setKeys();return 'start';
}
