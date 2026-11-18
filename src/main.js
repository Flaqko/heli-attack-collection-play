import {menuHighlightShapeIds} from './menu-highlight.js';
import {createCollectionMenu} from './collection-menu.js';
import {returnToCollection} from './collection-navigation.js';
import {collectionPreferences} from './collection-preferences.js';
import {mountFpsCounter} from './fps-counter.js';
import {remasteredMenuVectors} from './menu-vectors.js';
import {remasterMenuTexture,nativeMenuVector} from './menu-art.js';
import {loadMenuPortrait} from './menu-portrait.js';
import {WIDE_WIDTH} from './viewport.js';
import {displayCanvasSize} from './render-resolution.js';
import {createMotionInterpolation,simulationStep} from './motion-interpolation.js';
import {loadPlayerArt} from './player-art.js';
import {prepareParachuteArt} from './parachute-art.js';
import {prepareTutorialMarkerArt} from './tutorial-marker-art.js';
import {prepareTrainingTargetArt} from './training-target-art.js';
import {prepareTrainingFlagArt} from './training-flag-art.js';
import {loadWeaponArt} from './weapon-art.js';
import {prepareProjectileArt} from './projectile-art.js';
import {loadHudArt} from './hud-art.js';
import {loadEnemyArt} from './enemy-art.js';
import {loadZoneEnemyArt} from './zone-enemy-art.js';
import {prepareHelicopterRotors,enableHeavyHelicopterRotors} from './helicopter-rotors.js';
import {loadSnowArt} from './snow-art.js';
import {prepareAmbientArt} from './ambient-art.js';
import {loadJungleArt} from './jungle-art.js';
import {loadCanyonArt} from './canyon-art.js';
import {loadTrainingArt} from './training-art.js';
import {loadSnowTerrainArt} from './snow-terrain-art.js';
import {enableSmoothMenuText,menuWithoutHighscores} from './enhanced-menu.js';
import {createLevelArtworkLoader,artworkBiome,createArtworkStatus} from './level-artwork.js';
import {bindFullscreen} from './fullscreen.js';
import {LAST_PLAYABLE_LEVEL} from './campaign.js';
import {selectedLevel,mountLevelSelect} from './level-select.js';
import {loadVectorPack} from './vector-pack.js';
import {menuShapeIds,gameplayShapeIds,loadShapes,decodeVector} from './startup.js';
import {bindCombatPointer} from './pointer.js';
import {bindControllerCursor,createController} from './controller.js?v=initial-selection-1';
import {createPauseMenu} from './pause.js';
import {mountPlayerPage} from './players.js';
import {resultText,textRegion} from './menu-content.js';
import {mountOriginalOptions,settingFields,mergeSettings} from './options.js';
import {loadMaskGeometry} from './rendering.js';import {createMenus} from './menus.js?v=initial-selection-1';
import {createGame} from './game.js';import {readSave,writeSave,visitProfiles} from './save.js';import {GameAudio} from './audio.js';
import {startSession} from './session.js';
const $=s=>document.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d'),panel=$('#panel'),start=$('#start'),status=$('#status');
performance.mark('ha3:startup');
const [data,audioMetadata,vectors]=await Promise.all([fetch('data/symbols.json').then(r=>r.json()),fetch('src/audio-metadata.json').then(r=>r.json()),loadVectorPack('data/menu-vectors.json.gz')]);const images=new Map();const audio=new GameAudio(data.sounds,{sourceMetadata:audioMetadata.sounds});let running=false,last=0,accumulator=0,saved=readSave(localStorage);
const soundPreference=collectionPreferences().sound;
const inCollection=window.frameElement?.hasAttribute('data-collection-player');
const collectionIntroAudio=inCollection?window.parent.getCollectionIntroAudioContext?.(document):null;
if(collectionIntroAudio&&soundPreference.get()){
 audio.context=collectionIntroAudio;
 audio.prepare(['sIntro','sMenuLoop']).catch(error=>console.warn('Title audio could not be prepared.',error));
}
enableSmoothMenuText(data);
let resultCopy='',chosenLevel=selectedLevel(saved.stats);
const artworkStatus=createArtworkStatus(()=>chosenLevel,(text,error)=>{status.className=error?'error':'';status.textContent=text;});
const game=createGame(data,{viewportWidth:WIDE_WIDTH,sb:audio.sb,mb:audio.mb,sbt:audio.sbt,onResult:(result,stats,details)=>{
 running=false;game.keys.clear();game.root.mouseD=0;panel.hidden=true;resultCopy=resultText(result,stats,details);
 try{writeSave(localStorage,stats);saved=readSave(localStorage);mapping={...saved.stats};chosenLevel=selectedLevel(saved.stats);status.textContent=result==='nextLevel'?(stats.level<=LAST_PLAYABLE_LEVEL?'Progress saved. Continue to '+game.root.levels[stats.level].name+'.':'Progress saved. '+game.root.levels[LAST_PLAYABLE_LEVEL].name+' complete; later zones are not yet in this build.'):'Progress saved. Return to level selection to retry.';}catch(e){status.textContent=e.message;}
 audio.sb.stopAllSounds();audio.mb.start('sLevelSelectLoop',5,100);menus.show(result);
}});
// Prepare only the shapes that the intro needs before its first frame.
bindFullscreen({document,element:$('main'),button:$('#fullscreen'),focusTarget:canvas,onChange:()=>{game.keys.clear();game.root.mouseD=0;game.root.pendingShot=false;},onError:message=>{status.textContent=message;}});
const menuIds=menuShapeIds(data);
Object.assign(vectors,remasteredMenuVectors);vectors['assets/shapes/1860.svg']=remasterMenuTexture(vectors['assets/shapes/1860.svg']);
vectors['assets/text/1910.svg']=menuWithoutHighscores(vectors['assets/text/1910.svg']);
const maskOptions=v=>({fetch:async path=>({ok:Object.hasOwn(v,path),text:async()=>v[path]})});
const introIds=menuShapeIds(data,['menuintro']);
await Promise.all([loadShapes(data,images,vectors,introIds,{rasterize:true}),loadMaskGeometry(data,images,{...maskOptions(vectors),ids:introIds})]);
const afterStartupPaint=new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
let menusReady=false,menuCheats;
const menuText={};
const menuArtworkReady=afterStartupPaint.then(async()=>{
 const remainingMenuIds=new Set([...menuIds].filter(id=>!introIds.has(id)));
 const [text,cheats]=await Promise.all([
  fetch('data/menu-text.json').then(r=>r.json()),
  fetch('data/cheats.json').then(r=>r.json()),
  loadShapes(data,images,vectors,remainingMenuIds),
  Promise.all(menuHighlightShapeIds.map(async id=>{
   const svg=vectors[data.symbols[id].path].replace(/fill-opacity="[^"]*"/g,'fill-opacity="1"');
   return [id,await decodeVector(svg,{rasterize:true})];
  })).then(entries=>{images.menuHighlights=new Map(entries);}),
  loadMaskGeometry(data,images,{...maskOptions(vectors),ids:remainingMenuIds}),
 ]);
 Object.assign(menuText,text);menuCheats=cheats;
 await loadMenuPortrait(data,images).catch(error=>console.warn('Menu portrait artwork unavailable.',error));
 for(const id of [2063,2064]){const nativePaths=nativeMenuVector(vectors[`assets/shapes/${id}.svg`],data.symbols[id].bounds);if(nativePaths)images.set(id,{nativePaths});}
 menusReady=true;
 start.disabled=false;
 performance.mark('ha3:menus-ready');performance.measure('ha3:startup-to-menus','ha3:startup','ha3:menus-ready');
});
menuArtworkReady.catch(error=>window.reportLoadError(error.message));
let levelReady=false,remasterWarning='',animatedRotors=false;
const gameplayVectors=afterStartupPaint.then(()=>{
 performance.mark('ha3:gameplay-loading');
 return loadVectorPack('data/gameplay-vectors.json.gz');
});
// Download early. Prepare level artwork while the collection loader is visible or when a standalone player opens Level Select.
let requestGameplayArtwork;
const gameplayRequested=new Promise(resolve=>{requestGameplayArtwork=resolve;});
const artworkReady=Promise.all([gameplayVectors,gameplayRequested]).then(async([remaining])=>{
 performance.mark('ha3:gameplay-preparing');
 const ids=new Set([...gameplayShapeIds(data)].filter(id=>!menuIds.has(id)));
 await Promise.all([loadShapes(data,images,remaining,ids,{rasterize:true}),loadMaskGeometry(data,images,{...maskOptions(remaining),ids})]);
 try{
  prepareTutorialMarkerArt(data,images);
  prepareTrainingTargetArt(data,images);
  prepareTrainingFlagArt(data,images);
 }catch(error){
  remasterWarning='Training artwork could not be fully remastered.';
  console.warn(remasterWarning,error);
 }
 try{
  prepareParachuteArt(data,images);
 }catch(error){
  const warning='Parachute artwork unavailable; using original artwork.';
  remasterWarning+=(remasterWarning?' ':'')+warning;
  console.warn(warning,error);
 }
 try{
  prepareHelicopterRotors(data,images);
  animatedRotors=true;
 }catch(error){
  const warning='Rotor artwork unavailable; using original blades.';
  remasterWarning+=(remasterWarning?' ':'')+warning;
  console.warn(warning,error);
 }
 try {
  prepareProjectileArt(data,images);
 } catch (error) {
  const warning='Projectile artwork unavailable; using original artwork.';
  remasterWarning+=(remasterWarning?' ':'')+warning;
  console.warn(warning,error);
 }
 performance.mark('ha3:player-remaster-start');await loadPlayerArt(data,images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Player remaster unavailable; using original artwork.';console.warn(remasterWarning,error);});performance.mark('ha3:player-remaster-ready');performance.measure('ha3:player-remaster','ha3:player-remaster-start','ha3:player-remaster-ready');
 performance.mark('ha3:weapon-remaster-start');await loadWeaponArt(data,images,{baseSources:remaining}).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Weapon remaster unavailable; using original artwork.';console.warn(remasterWarning,error);});performance.mark('ha3:weapon-remaster-ready');performance.measure('ha3:weapon-remaster','ha3:weapon-remaster-start','ha3:weapon-remaster-ready');
 performance.mark('ha3:hud-remaster-start');await loadHudArt(data,images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'HUD remaster unavailable; using original artwork.';console.warn(remasterWarning,error);});performance.mark('ha3:hud-remaster-ready');performance.measure('ha3:hud-remaster','ha3:hud-remaster-start','ha3:hud-remaster-ready');
 performance.mark('ha3:enemy-remaster-start');await loadEnemyArt(data,images,{baseSources:remaining}).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Enemy remaster unavailable; using original artwork.';console.warn(remasterWarning,error);});performance.mark('ha3:enemy-remaster-ready');performance.measure('ha3:enemy-remaster','ha3:enemy-remaster-start','ha3:enemy-remaster-ready');
 levelReady=true;performance.mark('ha3:artwork-ready');performance.measure('ha3:startup-to-artwork','ha3:startup','ha3:artwork-ready');
 status.textContent=remasterWarning||(saved.error?'Existing save could not be read; it will be preserved.':saved.stats?.level>=2?'Campaign progress saved':'Original controls and artwork · native HTML5 development build');
});
artworkReady.catch(error=>{status.className='error';status.textContent=`Level artwork could not load: ${error.message}. Refresh to retry.`;});
async function remasterZoneEnemies(vectors,ids,zone){const prefix='ha3:'+zone+'-enemies';performance.mark(prefix+'-start');await loadZoneEnemyArt(data,images,{ids,baseSources:vectors,animatedRotors}).then(()=>{if(animatedRotors&&images.get(1106)?.remasteredEnemy)enableHeavyHelicopterRotors(data);}).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+zone+' enemy remaster unavailable; using original artwork.';console.warn(remasterWarning,error);});performance.mark(prefix+'-ready');performance.measure(prefix,prefix+'-start',prefix+'-ready');}
let jungleReady=false,canyonReady=false,trainingReady=false,snowReady=false;
function prepareAmbient(kind){
 try{prepareAmbientArt(data,images,kind);}
 catch(error){
  const warning='Ambient artwork unavailable; using original sprites.';
  remasterWarning+=(remasterWarning?' ':'')+warning;
  console.warn(warning,error);
 }
}
const loadLevelArtwork=createLevelArtworkLoader(artworkReady,async()=>{
 artworkStatus(5,'Preparing original jungle artwork…');const vectors=await loadVectorPack('data/jungle-vectors.json.gz');
 const ids=new Set([...gameplayShapeIds(data,5)].filter(id=>!menuIds.has(id)));
 await Promise.all([loadShapes(data,images,vectors,ids,{rasterize:true}),loadMaskGeometry(data,images,{...maskOptions(vectors),ids})]);
 await remasterZoneEnemies(vectors,ids,'jungle');
 prepareAmbient('jungle');
 performance.mark('ha3:jungle-scenery-start');await loadJungleArt(images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Jungle remaster unavailable; using original scenery.';console.warn(remasterWarning,error);});performance.mark('ha3:jungle-scenery-ready');performance.measure('ha3:jungle-scenery','ha3:jungle-scenery-start','ha3:jungle-scenery-ready');
 jungleReady=true;performance.mark('ha3:jungle-ready');performance.measure('ha3:startup-to-jungle','ha3:startup','ha3:jungle-ready');
},async()=>{
 artworkStatus(9,'Preparing original canyon artwork…');const vectors=await loadVectorPack('data/canyon-vectors.json.gz');
 const ids=new Set([...gameplayShapeIds(data,9)].filter(id=>!menuIds.has(id)));
 await Promise.all([loadShapes(data,images,vectors,ids,{rasterize:true}),loadMaskGeometry(data,images,{...maskOptions(vectors),ids})]);
 await remasterZoneEnemies(vectors,ids,'canyon');
 performance.mark('ha3:canyon-scenery-start');await loadCanyonArt(images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Canyon remaster unavailable; using original scenery.';console.warn(remasterWarning,error);});performance.mark('ha3:canyon-scenery-ready');performance.measure('ha3:canyon-scenery','ha3:canyon-scenery-start','ha3:canyon-scenery-ready');
 canyonReady=true;performance.mark('ha3:canyon-ready');performance.measure('ha3:startup-to-canyon','ha3:startup','ha3:canyon-ready');
},async()=>{
 artworkStatus(0,'Preparing original Zone 4 artwork…');const vectors=await loadVectorPack('data/training-vectors.json.gz');
 const ids=new Set([...gameplayShapeIds(data,13)].filter(id=>!menuIds.has(id)));
 await Promise.all([loadShapes(data,images,vectors,ids,{rasterize:true}),loadMaskGeometry(data,images,{...maskOptions(vectors),ids})]);
 await remasterZoneEnemies(vectors,ids,'training');
 performance.mark('ha3:training-scenery-start');await loadTrainingArt(images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Laboratory remaster unavailable; using original scenery.';console.warn(remasterWarning,error);});performance.mark('ha3:training-scenery-ready');performance.measure('ha3:training-scenery','ha3:training-scenery-start','ha3:training-scenery-ready');
 trainingReady=true;performance.mark('ha3:training-ready');performance.measure('ha3:startup-to-training','ha3:startup','ha3:training-ready');
},async()=>{
 prepareAmbient('snow');
 performance.mark('ha3:snow-remaster-start');await loadSnowArt(images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Snow remaster unavailable; using original scenery.';console.warn(remasterWarning,error);});performance.mark('ha3:snow-remaster-ready');performance.measure('ha3:snow-remaster','ha3:snow-remaster-start','ha3:snow-remaster-ready');
 performance.mark('ha3:snow-terrain-start');await loadSnowTerrainArt(images).catch(error=>{remasterWarning+=(remasterWarning?' ':'')+'Snow terrain remaster unavailable; using original terrain.';console.warn(remasterWarning,error);});performance.mark('ha3:snow-terrain-ready');performance.measure('ha3:snow-terrain','ha3:snow-terrain-start','ha3:snow-terrain-ready');
 snowReady=true;
});
function readyForLevel(level){
 requestGameplayArtwork();
 return loadLevelArtwork(level);
}
function warmLevelArtwork(level){artworkStatus(level,`Preparing ${artworkBiome(level)} scenery...`);readyForLevel(level).then(()=>artworkStatus(level,remasterWarning||`Enhanced ${artworkBiome(level)} scenery ready.`)).catch(error=>artworkStatus(level,`Level artwork could not load: ${error.message}. Refresh to retry.`,true));}
if(inCollection){
 // Hold the intro timeline and its cue until the initial zone and menus can render.
 await Promise.all([menuArtworkReady,readyForLevel(chosenLevel)]);
}
let mapping={...game.root.newPlayer('Player',2),...(saved.stats||{})};game.root.stats=mapping;game.root.menuToggle();
function saveSettings(stats){for(const key of settingFields)mapping[key]=stats[key];try{const next=mergeSettings(saved.stats||mapping,mapping);writeSave(localStorage,next);saved=readSave(localStorage);status.textContent='Settings saved.';}catch(e){status.textContent=e.message;}}
const menus=createMenus({data,viewportWidth:WIDE_WIDTH,text:menuText,stage:$('#stage'),audio,onStart:()=>start.click(),onReturn:returnToCollection,onLevelSelect:(menu,layer)=>{warmLevelArtwork(chosenLevel);return mountLevelSelect(menu,layer,{levels:game.root.levels,stats:mapping,level:chosenLevel,onSelect:level=>{chosenLevel=level;menus.show('levelselect');}});},onOptions:(menu,layer)=>{game.root.stats=mapping;return mountOriginalOptions({root:game.root,menu,layer,onChange:saveSettings});},playerName:()=>mapping.name||'Player',onPage:(menu,layer,page,show)=>{if(page==='nextLevel'||page==='gameOver'){textRegion(menu,layer,page==='nextLevel'?menu.leveld:menu.scored,resultCopy,page==='nextLevel'?'Level complete':'Game over');for(const c of menu.children.values())if(c.id===2074||c.id===2076)c._visible=false;return;}mountPlayerPage({menu,layer,page,show,cheats:menuCheats,root:game.root,storage:localStorage,onSelected:stats=>{saved=readSave(localStorage);chosenLevel=selectedLevel(saved.stats);mapping=stats?{...stats}:game.root.newPlayer('Player',2);game.root.stats=mapping;game.root.menuToggle();audio.unlock().then(()=>audio.mb.start('sMenuLoop',5,100));},onError:message=>status.textContent=message});}});panel.hidden=true;menus.playIntro(()=>{try{const roster=visitProfiles(localStorage);if(roster.error)return 'menu';saved=readSave(localStorage);mapping={...game.root.newPlayer('Player',2),...(saved.stats||{})};game.root.stats=mapping;game.root.menuToggle();return roster.players.length>1?'select':roster.players.length?'menu':'new';}catch(e){status.textContent=e.message;return saved.stats?'menu':'new';}},()=>menusReady);
const labels={leftKey:'Move left',rightKey:'Move right',upKey:'Jump',downKey:'Crouch',timeKey:'TimeDistort',specialKey:'Modify',switchKey:'Next weapon',switchDownKey:'Previous weapon',grenadeKey:'Grenade switch',pauseKey:'Pause'};
const pauseMenu=createPauseMenu({game,stage:$('#stage'),onSettings:saveSettings,onResume:()=>{last=performance.now();accumulator=0;canvas.focus();}});
start.onclick=async()=>{if(running&&game.paused){pause(false);return;}menus.setBusy(true);try{if(!levelReady||((chosenLevel===0||chosenLevel>=13)?!trainingReady:chosenLevel>=9?!canyonReady:chosenLevel>=5?!jungleReady:!snowReady))status.textContent='Preparing the remaining original level artwork…';performance.mark('ha3:level-start-request');await startSession({game,audio,running,saved:saved.stats,mappings:mapping,ready:readyForLevel(chosenLevel),level:chosenLevel});performance.mark('ha3:level-start-ready');performance.measure('ha3:level-start','ha3:level-start-request','ha3:level-start-ready');menus.hide();panel.hidden=true;running=true;last=performance.now();accumulator=0;canvas.focus();}finally{menus.setBusy(false);}};
function pause(value){if(!running)return;pauseMenu.set(value);panel.hidden=true;}
$('#pause').onclick=()=>pause(!game.paused);
const soundButton=$('#sound');
function showSoundSetting(enabled){
 soundButton.textContent=enabled?'Sound on':'Sound off';
 soundButton.setAttribute('aria-pressed',String(enabled));
}
audio.enabled=soundPreference.get();
showSoundSetting(audio.enabled);
soundPreference.subscribe(async enabled=>{
 showSoundSetting(enabled);
 try{
  await audio.setEnabled(enabled);
  if(audio.enabled&&menus.visible)await menus.activateAudio();
 }catch(error){status.textContent=error.message;}
});
if(audio.enabled&&collectionIntroAudio)menus.activateAudio().catch(error=>status.textContent=error.message);
soundButton.onclick=()=>soundPreference.set(!soundPreference.get());
window.addEventListener('keydown',e=>{if(menus.captureKey(e.keyCode)){e.preventDefault();return;}if(pauseMenu.captureKey(e.keyCode)){e.preventDefault();return;}if(!running)return;if(e.keyCode===game.root.stats.pauseKey){e.preventDefault();if(!e.repeat)pause(!game.paused);return;}if(game.paused)return;if(Object.values(labels).length&&Object.keys(labels).some(k=>game.root.stats[k]===e.keyCode)){e.preventDefault();game.keys.add(e.keyCode);}});
window.addEventListener('keyup',e=>game.keys.delete(e.keyCode));window.addEventListener('blur',()=>pause(true));document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
const keyboardGuide=$('#input-guide').innerHTML;
const quickMenu=createCollectionMenu($('main'),{onExit:returnToCollection});
const cursor=bindControllerCursor(canvas);
const controller=createController({
 game,
 getGamepads:()=>{
  try{return navigator.getGamepads?.();}catch{return [];}
 },
 getLayer:()=>quickMenu.open?quickMenu.element:menus.visible?menus.layer:game.paused?pauseMenu.layer:null,
 isPlaying:()=>running&&!game.paused,
 onMenuPress:()=>{if(quickMenu.open||menus.visible)quickMenu.toggle();},
 onPause:()=>pause(!game.paused),
 waitForConfirmRelease: window.frameElement?.dataset.controllerLaunch === 'true',
 onControllerInput: cursor.hide,
 onGameplayInput:()=>canvas.classList.add('controller-aim'),
 onConnection:connected=>{
  if(connected)$('#input-guide').textContent='Xbox · Left stick move · Right stick aim · RT fire · A jump · Menu pause';
  else{
   cursor.show();
   $('#input-guide').innerHTML=keyboardGuide;
  }
 },
});
window.addEventListener('blur',controller.clear);
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.clear();});
bindCombatPointer(canvas,window,{game,isRunning:()=>running,onAim:()=>{
 controller.releaseAim();
 canvas.classList.remove('controller-aim');
},onMenuGesture:()=>{if(!menus.visible)return false;menus.activateAudio().catch(e=>status.textContent=e.message);return true;}});
let shownWidth;
const motion=createMotionInterpolation();
const updateFps=mountFpsCounter($('#stage'));
function frame(now){
 updateFps(now);
 requestAnimationFrame(frame);
 const dt=Math.max(0,Math.min(100,now-last));
 last=now;
 audio.tick(dt);
 menus.tick(dt);
 if(!document.hidden)controller.poll(now);
 if(running&&!game.paused){
  accumulator+=dt;
  try{
   while(accumulator>=simulationStep&&running){
    motion.capture(game.root);
    game.tick();
    accumulator-=simulationStep;
   }
   motion.setFraction(accumulator/simulationStep);
  }catch(e){
   running=false;
   status.className='error';
   status.textContent=`Runtime error: ${e.message}`;
   console.error(e);
  }
 }else motion.reset();
 const viewWidth=game.root.spw;if(shownWidth!==viewWidth){shownWidth=viewWidth;$('#stage').style.setProperty('--view-width',viewWidth);$('#stage').style.setProperty('--view-aspect',`${viewWidth}/320`);$('main').classList.add('widescreen');}
 const bounds=canvas.getBoundingClientRect();
 const size=displayCanvasSize(bounds.width,bounds.height,devicePixelRatio);
 if(canvas.width!==size.width||canvas.height!==size.height){
  canvas.width=size.width;
  canvas.height=size.height;
 }
 ctx.setTransform(canvas.width/viewWidth,0,0,canvas.height/320,0,0);
 ctx.fillStyle='#111922';
 ctx.fillRect(0,0,viewWidth,320);
 if(menus.visible)menus.render(ctx,images);
 else {game.root.world?.render(ctx,images,undefined,motion);pauseMenu.render(ctx,images);}
}
requestAnimationFrame(now=>{
 last=now;
 frame(now);
 performance.mark('ha3:intro-first-frame');
 document.documentElement.dataset.collectionLoad='ready';
});
