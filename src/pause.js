import {clearMenuHighlight,renderMenuHighlight} from './menu-highlight.js';
import {hotspot} from './menu-content.js';
export function createPauseMenu({game,stage,onSettings=()=>{},onResume=()=>{}}){
 const root=game.root,layer=document.createElement('div');layer.style.cssText='position:absolute;inset:0;pointer-events:none';layer.hidden=true;stage.append(layer);let capture=null;
 function cancelCapture(){capture?.reset?.();capture=null;root.controlChanger=null;}
 function rebuild(){clearMenuHighlight(layer);layer.replaceChildren();if(!game.paused)return;const panel=root.pauseMenu;panel.onEnterFrame?.();panel._visible=false;
  for(const clip of panel.children.values())if(clip.onRelease||clip.onPress){const label=clip.name+(clip.status!==undefined?' '+clip.status:'');hotspot(root.world,layer,clip,label,()=>{cancelCapture();if(clip.onPress){clip.onPress();capture=clip;}else{clip.onRelease();if(clip.variable)onSettings(root.stats);}if(game.paused)rebuild();});}
 }
 function set(value){if(value===game.paused)return;cancelCapture();game.keys.clear();root.mouseD=0;root.pendingShot=false;root.mouseW=0;if(value){root.doPause();game.paused=true;layer.hidden=false;rebuild();}else{root.undoPause();game.paused=false;layer.hidden=true;clearMenuHighlight(layer);layer.replaceChildren();onResume();}}
 root.togglePause=()=>set(!game.paused);
 return {layer,set,captureKey(code){if(!capture)return false;const previous=root.Key.getCode;try{root.Key.getCode=()=>code;capture.onKeyDown?.();}finally{root.Key.getCode=previous;}capture=null;root.controlChanger=null;onSettings(root.stats);rebuild();return true;},render(ctx,images){if(!game.paused||!root.pauseMenu)return;const panel=root.pauseMenu;ctx.save();panel._visible=true;panel.render(ctx,images);renderMenuHighlight(ctx,images,layer,panel);panel._visible=false;ctx.restore();}};
}
