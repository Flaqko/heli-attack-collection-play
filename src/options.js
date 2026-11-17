import {bindMenuHighlight} from './menu-highlight.js';
export const toggleFields=['drawbg','drawparticles','drawenvironment','drawbrass','drawcoronas','drawhealthbar','drawpoints','drawweaponnames','drawmusic','drawsound','weaponswitch'];
export const controlFields=['leftKey','rightKey','upKey','downKey','timeKey','switchKey','switchDownKey','specialKey','grenadeKey','pauseKey'];
export const enhancedToggleFields=['screenTints'];
export const settingFields=[...toggleFields,...enhancedToggleFields,...controlFields];
export function mergeSettings(progress,settings){const next={...progress};for(const key of [...toggleFields,...enhancedToggleFields])if(typeof settings[key]==='boolean')next[key]=settings[key];for(const key of controlFields)if(Number.isInteger(settings[key])&&settings[key]>=0&&settings[key]<=255)next[key]=settings[key];return next;}
// The recovered functions own layout, labels, state and toggle semantics.
// DOM controls only bridge browser input/accessibility to those original clips.
export function mountOriginalOptions({root,menu,layer,onChange=()=>{}}){
 root.drawOptions(menu.opt,true);root.drawControls(menu.cont,true);
 let capture=null,disposed=false;const buttons=new Map();
 const label=clip=>`${clip.name} ${clip.status}`;
 function refresh(){for(const [clip,button]of buttons)button.setAttribute('aria-label',label(clip));}
 function cancel(){capture?.reset?.();capture=null;root.controlChanger=null;refresh();}
 for(const panel of [menu.opt,menu.cont])for(const clip of panel.children.values()){
  if(!clip.onRelease&&!clip.onPress)continue;
  const b=clip.getBounds(menu),button=document.createElement('button');buttons.set(clip,button);button.setAttribute('aria-label',label(clip));
  button.style.cssText=`position:absolute;pointer-events:auto;opacity:0;margin:0;padding:0;left:${b.xMin/(menu.viewportWidth||448)*100}%;top:${b.yMin/320*100}%;width:${(b.xMax-b.xMin)/(menu.viewportWidth||448)*100}%;height:${(b.yMax-b.yMin)/320*100}%`;
  bindMenuHighlight(layer,button,b,clip);
  button.onclick=()=>{if(disposed)return;cancel();if(clip.onPress){clip.onPress();capture=clip;}else{clip.onRelease();onChange(root.stats);}refresh();};layer.append(button);
 }
 return {captureKey(code){if(disposed||!capture)return false;const previous=root.Key.getCode;try{root.Key.getCode=()=>code;capture.onKeyDown?.();}finally{root.Key.getCode=previous;}capture=null;root.controlChanger=null;refresh();onChange(root.stats);return true;},dispose(){cancel();disposed=true;}};
}
