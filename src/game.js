import {installGameplayPopups} from './gameplay-popups.js';
import {installScreenTints,configureScreenTints} from './screen-tints.js';
import {Clip} from './scene.js';
import {LAST_PLAYABLE_LEVEL} from './campaign.js';
import {recoveredSource} from './recovered.js';
import {layoutGameplay,adaptCamera} from './viewport.js';
import {adaptCheatRewards,installGameplayCheats,recoverCheatFall,restoreCheatAmmo} from './gameplay-cheats.js';
import {installCrateGravity} from './crate-gravity.js';
export function createGame(data,{random=Math.random,onSound=()=>{},sb,mb,sbt,onResult=()=>{},viewportWidth=448}={}){
 if(!Number.isFinite(viewportWidth)||viewportWidth<448||viewportWidth>640)throw new RangeError('Unsupported gameplay viewport width.');
 const root=new Clip(data);const keys=new Set(),controllerKeys=new Set();root.pointer={x:300,y:120};
 const sound={start:(name,...args)=>onSound(name,...args),stop:()=>{},instantStart:()=>{},setActive:()=>{}};
 Object.assign(root,{Math:Object.assign(Object.create(Math),{random}),Object,Array,Number,String,Boolean,MovieClip:Clip,Infinity,undefined,NaN,isNaN,parseInt,parseFloat,
  safe:x=>x??{},callMethod:(object,key,args)=>{const fn=object?.[key];return typeof fn==='function'?Reflect.apply(fn,object,args):undefined;},int:x=>Math.trunc(Number(x))||0,random:n=>Math.floor(random()*n),Key:{isDown:n=>keys.has(n)||controllerKeys.has(n),addListener:()=>{}},
  TextFormat:class{},Color:class{constructor(clip){this.clip=clip;}setTransform(v){this.clip.colorTransform=v;}setRGB(v){this.clip.tint=v;}},
  SharedObject:{getLocal:()=>({data:{players:[],player:0},flush(){},clear(){}})},
  sb:sb||sound,mb:mb||sound,sbt:sbt||{},spw:viewportWidth,sph:320,safescore:0,score:0,gameValid:true,localGame:true,
 });
 const scope=new Proxy(root,{has:(_,key)=>key!=='scope',get:(target,key)=>{
  if(key===Symbol.unscopables)return undefined;
  const value=target[key];return typeof value==='function'&&key in Clip.prototype?value.bind(target):value;
 }});
 root._root=scope;
 new Function('scope',`with(scope){${recoveredSource}}`)(scope);
 const crates=installCrateGravity(root);
 installGameplayPopups(root);
 installScreenTints(root);
 adaptCamera(root);
 adaptCheatRewards(root);
 root.inGameMenu=()=>{};root.envFrame=()=>{};
 root.setScore=value=>{root.safescore=value;};
 root.togglePause=()=>{api.paused=!api.paused;};
 root.gotoAndStop=label=>{if((label==='nextLevel'||label==='gameOver')&&!api.result){restoreCheatAmmo(root);const completedLevel=label==='nextLevel'?root.stats.level-1:root.stats.level,level=root.levels[completedLevel],gunUnlock=level?.gunUnlock,details={completedLevel,levelName:level?.name,gunUnlock,newUnlock:label==='nextLevel'&&gunUnlock>=0&&!root.stats.guns[gunUnlock].unlocked,healthbonus:root.healthbonus||0,guns:root.guns};if(label==='nextLevel'&&gunUnlock>=0){root.stats.guns[gunUnlock].unlocked=true;if(gunUnlock===1)root.stats.guns[gunUnlock].ammo=Infinity;}api.result=label;onResult(label,root.stats,details);}};
 root.endGame=()=>{};
 const api={root,keys,controllerKeys,controllerFire:false,controllerShot:false,paused:false,result:null,
  start(saved,{level=1}={}){
   if(!Number.isInteger(level)||level<0||level>LAST_PLAYABLE_LEVEL)throw Error('Level is outside the supported build.');
   if(level>1&&!saved?.levels?.[level])throw Error('This level is locked.');
   const continuing=Boolean(saved?.currentGame&&saved.level===level);
   root.world?.removeMovieClip();root._x=0;root._y=0;api.result=null;api.paused=false;root.pendingShot=false;root.mouseD=0;keys.clear();
   controllerKeys.clear();api.controllerFire=api.controllerShot=false;
   root.stats=saved?structuredClone(saved):root.newPlayer('Player',2);
   // Training completion unlocks the bow with infinite ammo (frame 95).
   root.stats.level=level;if(level>0){root.stats.levels[1]=true;root.stats.guns[1].unlocked=true;root.stats.guns[1].ammo=Infinity;}
   if(continuing)root.resumeSurvival();else root.resetSurvival();
   root.stats.level=level;root.stats.guns[0].ammo=Infinity;
   root.so.data.players=[root.stats];root.so.data.player=0;
   root.safescore=root.stats.score*100;root.score=root.stats.score||0;root.gametime=root.stats.gametime||0;
   root.menuToggle();root.startGame(level);crates.reset();configureScreenTints(root);layoutGameplay(root);installGameplayCheats(root);root.envFrame??=()=>{};
  },
  tick(){
   if(api.paused||api.result)return;
   const temporaryFire=!root.mouseD&&(root.pendingShot||api.controllerShot||api.controllerFire);
   if(temporaryFire)root.mouseD=1;
   root.pendingShot=false;api.controllerShot=false;
   try{recoverCheatFall(root);root.onEnterFrame?.();root.world?.advance();if(!api.result)crates.tick();recoverCheatFall(root);}
   finally{if(temporaryFire)root.mouseD=0;}
  },
 };
 return api;
}
