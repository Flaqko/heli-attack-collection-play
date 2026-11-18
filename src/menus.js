import {bindMenuHighlight,clearMenuHighlight,renderMenuHighlight} from './menu-highlight.js';
import {layoutMenu} from './menu-layout.js';
import {buttonBounds} from './button-hit.js';
import {textFont} from './text-layout.js';
import {Clip} from './scene.js';
// Navigation uses the original button IDs; artwork stays on its authored timeline.
export const menuActions={1914:'levelselect',1912:'highscores',1913:'options',1917:'players',1918:'credits',1919:'instructions',1934:'menu',2053:'play',2060:'menu',2036:'new',2037:'stats',2038:'change',2039:'del',2040:'cheats',2041:'weapons',2070:'levelselect'};
export function createMenus({data,stage,audio,onStart,onReturn,onControls,onOptions,onPage,onLevelSelect,playerName,text={},viewportWidth=448}){
 const root=new Clip(data,-1),layer=document.createElement('div');layer.style.cssText='position:absolute;inset:0;pointer-events:none';stage.append(layer);let elapsed=0,options=null,currentPage='menu',revision=0,audioReady=false,music=null,introTarget=null;
 function updateMusic(){if(!audioReady||!api.visible||currentPage==='menuintro')return;const track=['levelselect','nextLevel','gameOver'].includes(currentPage)?'sLevelSelectLoop':'sMenuLoop';if(track!==music){audio.mb.start(track,5,100);music=track;}}
 async function activateAudio(){const request=revision;await audio.unlock();if(request!==revision||!api.visible)return false;audioReady=true;updateMusic();return true;}
 const api={layer,visible:true,setBusy(value){api.busy=layer.inert=Boolean(value);},activateAudio,playIntro(destination='menu',canFinish=()=>true){show('menuintro');const intro=[...root.children.values()].find(c=>c.id===1908);intro?.gotoAndPlay(105);for(const c of intro?.children.values()||[])if(c.id===9||c.id===1885)c._visible=false;introTarget={destination,canFinish};elapsed=0;},captureKey:code=>options?.captureKey(code)||false,hide(){revision++;music=null;options?.dispose();options=null;api.visible=false;layer.hidden=true;},tick(dt){if(!api.visible)return;elapsed+=dt;while(elapsed>=1000/35){for(const c of root.children.values())c.advance();elapsed-=1000/35;if(introTarget){const intro=[...root.children.values()].find(c=>c.id===1908);for(const c of intro?.children.values()||[])if(c.id===1887)c._visible=false;if(intro?._currentframe===106&&audioReady){audio.mb.instantIntroStart('sIntro','sMenuLoop',100);music='sMenuLoop';}if(intro?._currentframe>=213){intro.stop();if(!introTarget.canFinish())continue;const {destination}=introTarget;show(typeof destination==='function'?destination():destination);}}}},render(ctx,images){root.render(ctx,images);renderMenuHighlight(ctx,images,layer,root);},show};
 root.layoutViewport=page=>layoutMenu(root,page,viewportWidth);
 function show(page){revision++;introTarget=null;currentPage=page;clearMenuHighlight(layer);options?.dispose();options=null;api.visible=true;layer.hidden=false;layer.replaceChildren();root.gotoAndStop(data.rootLabels[page]||25);for(const c of root.children.values()){if(c.id===67)c._visible=false;if(c.id===1909)c._visible=page!=='menu';if([1920,1924,2047].includes(c.id))c._visible=page==='credits';}
  if(page==='menu')for(const c of root.children.values()){if(c.id===1912)c._visible=false;if([1919,1913,1917,1918].includes(c.id))c._y-=36;}
  const palette={highscores:3,instructions:5,options:4,stats:6,players:7,credits:32,del:2,gameOver:2,weapons:6,cheats:3};root.bgcolor?.gotoAndStop(palette[page]||1);root.logo?.gotoAndStop(palette[page]||1);if(root.playerD)root.playerD.name='Current Player: '+(typeof playerName==='function'?playerName():playerName);
  root.layoutViewport(page);
  if(text[page]&&root[page]){const field=root[page],b=field.getBounds(root),content=document.createElement('div');content.textContent=text[page]+(page==='credits'?'\n\nOriginal branding:\n\tMiniclip.com\n\tsquarecircleco.':'');content.setAttribute('role','region');content.setAttribute('aria-label',page);content.setAttribute('tabindex','0');content.style.cssText=`position:absolute;pointer-events:auto;overflow:auto;white-space:pre-wrap;color:white;font:${12/(root.viewportWidth||448)*100}cqw ${textFont(field)};line-height:1.25;left:${b.xMin/(root.viewportWidth||448)*100}%;top:${b.yMin/320*100}%;width:${(b.xMax-b.xMin)/(root.viewportWidth||448)*100}%;height:${(b.yMax-b.yMin)/320*100}%`;layer.append(content);field._visible=false;}
  onPage?.(root,layer,page,show);
  if(page==='options'&&onOptions)options=onOptions(root,layer);
  if(root.prevc)root.prevc._visible=false;if(root.nextc)root.nextc._visible=false;if(root.savec)root.savec._visible=false;if(root.newc)root.newc._visible=false;
  root.currentLevel='Zone 1-1';
  if(page==='levelselect'&&root.mapd){root.mapd.gotoAndStop(2);const {small,large}=root.mapd;for(const map of [small,large])if(map?.circle){map.circle._x=85;map.circle._y=8;}if(large){large._x=-85*9.5+250;large._y=-8*9.5+50;large._xscale=large._yscale=950;if(large.circle)large.circle._xscale=large.circle._yscale=50;}}
  if(page==='levelselect')onLevelSelect?.(root,layer);
  if(page==='highscores'){const note=document.createElement('p');note.textContent='Legacy online scores are unavailable.';note.style.cssText='position:absolute;left:8%;top:40%;width:84%;text-align:center;background:#111e;color:white;padding:12px';layer.append(note);}
  const controls=[...root.children.values()].filter(c=>menuActions[c.id]&&c._visible).sort((a,b)=>buttonBounds(a,root).yMin-buttonBounds(b,root).yMin);
  for(const c of controls){
   const action=menuActions[c.id],b=buttonBounds(c,root),width=root.viewportWidth||448;
   const button=document.createElement('button');
   button.setAttribute('data-menu-action',action);
   button.setAttribute('aria-label',page==='menu'?({levelselect:'Start',highscores:'Highscores',instructions:'Help',options:'Options',players:'Players',credits:'Credits'}[action]||action):action==='play'?"Start "+root.currentLevel:action);
   button.style.cssText=`position:absolute;pointer-events:auto;opacity:0;margin:0;padding:0;left:${b.xMin/width*100}%;top:${b.yMin/320*100}%;width:${(b.xMax-b.xMin)/width*100}%;height:${(b.yMax-b.yMin)/320*100}%`;
   bindMenuHighlight(layer,button,b,c);
   button.onclick=async()=>{
    if(api.busy||!await activateAudio()||api.busy)return;
    if(action==='play')onStart();
    else if(action==='options'&&!onOptions){layer.hidden=true;onControls();}
    else show(action);
   };
   layer.append(button);
  }
  if(page==='menu'&&onReturn){
   const credits=controls.find(clip=>clip.id===1918);
   const b=buttonBounds(credits,root),width=root.viewportWidth||448;
   const button=document.createElement('button');
   button.type='button';
   button.className='title-return';
   bindMenuHighlight(layer,button);
   button.setAttribute('data-menu-action','return');
   button.setAttribute('aria-label','Return to Heli Attack Collection');
   button.textContent='Return';
   button.style.cssText=`left:${b.xMin/width*100}%;top:${(b.yMin+36)/320*100}%;width:${(b.xMax-b.xMin)/width*100}%;height:${(b.yMax-b.yMin)/320*100}%;font-size:${26/width*100}cqw`;
   button.onclick=()=>{if(!api.busy)onReturn();};
   layer.append(button);
  }
  // Navigation remains available on pages whose scripted widgets are still being ported.
  if(page!=='select'&&page!=='menuintro'&&page!=='menu'&&page!=='new'&&![...root.children.values()].some(c=>c._visible&&menuActions[c.id]==='menu')){const back=document.createElement('button');back.textContent='Main menu';back.className='menu-back';bindMenuHighlight(layer,back);back.style.cssText='position:absolute;pointer-events:auto;left:25%;top:3%;font-size:12px;padding:4px';back.onclick=()=>show('menu');layer.append(back);}
  if(page==='menu')layer.querySelector?.('[data-menu-action="levelselect"]')?.focus({preventScroll:true});
  if(page==='levelselect')layer.querySelector?.('[data-menu-action="play"]')?.focus({preventScroll:true});
  updateMusic();
 }
 show('menu');return api;
}
