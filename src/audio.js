import {rawMp3Duration,sourceAudioWindow} from './audio-window.js';
// Adapters for the recovered SoundBoard, MusicBoard and SoundBoardTransform.
const protectedSounds=new Set(['sIntro','sMenuLoop','sLevelLoopHardcore','sLevelLoopEvil','sLevelLoopJungle','sLevelSelectLoop','sLevelLoopTraining','sEndLevel']);
export function gameplaySoundNames(sounds,track,{drawsound=true,drawmusic=true}={}){const names=drawsound?Object.keys(sounds).filter(name=>!protectedSounds.has(name)):[];if(drawmusic&&track)names.push(track);return names;}
export class GameAudio {
 constructor(sounds,{makeContext=()=>new AudioContext(),fetchAudio=url=>fetch(url),sampleWindows={},sourceMetadata={}}={}){
  Object.assign(this,{sounds,makeContext,fetchAudio,sampleWindows,sourceMetadata});this.verifiedWindows=new Map();this.buffers=new Map();this.entries=new Map();this.active=new Set();this.enabled=true;this.paused=false;this.transforms=new Map();
  const sb=this.sb={active:true,attachSound:(name,unForce=false)=>this.attach(name,unForce),getSound:name=>this.entries.get(name),start:(...args)=>this.start(...args),stop:name=>this.halt(name),setVolume:(name,v)=>{const e=this.entries.get(name);if(e){e.volume=v;if(e.gain)e.gain.gain.value=v/100;}},getVolume:name=>this.entries.get(name)?.volume,setPan:(name,v)=>{const e=this.entries.get(name);if(e){e.pan=v;if(e.panner)e.panner.pan.value=v/100;}},getPan:name=>this.entries.get(name)?.pan,stopAllSounds:()=>{for(const [name,e] of this.entries)if(!e.unForce)this.halt(name);},setActive:value=>{sb.active=value;if(!value)sb.stopAllSounds();}};
  for(const name of Object.keys(sounds))this.attach(name,protectedSounds.has(name));
  const sbt=this.sbt={FADEIN:1,FADEOUT:2,FADETO:4,STOPLOOP:8,addTransform:(name,type,speed,target)=>this.transforms.set(name,{type,speed:Math.max(1,speed),target,elapsed:0}),addTransformStartLoop:(name,type,speed,target)=>{const e=this.entries.get(name);if(!this.transforms.has(name)||(e&&!e.node&&!e.loading&&this.enabled&&this.context&&sb.active))sb.start(name,0,99999);sbt.addTransform(name,type,speed,target);}};
  const mb=this.mb={active:true,music:null,vol:0,start:(name,speed,vol)=>{mb.vol=vol;if(name!==mb.music)this.cancelIntro();if(!mb.active){mb.music=name;return;}if(name===mb.music){sbt.addTransform(name,4,speed,vol);return;}if(mb.music!==null)sbt.addTransform(mb.music,2,speed,0);sb.setVolume(name,0);const pending=sb.start(name,0,99999,true);sbt.addTransform(name,1,speed,vol);mb.music=name;return pending;},stop:speed=>sbt.addTransform(mb.music,2,speed,0),instantStart:(name,vol)=>{mb.vol=vol;if(name!==mb.music)this.cancelIntro();if(!mb.active){mb.music=name;return;}if(name===mb.music){sb.setVolume(name,vol);return;}if(mb.music!==null)sb.stop(mb.music);sb.setVolume(name,vol);mb.music=name;return sb.start(name,0,99999,true);},instantIntroStart:(name,next,vol)=>{mb.vol=vol;if(name!==mb.music)this.cancelIntro();if(!mb.active){mb.music=name;return;}if(name===mb.music){sb.setVolume(name,vol);return;}if(mb.music!==null)sb.stop(mb.music);sb.setVolume(name,vol);sb.setVolume(next,vol);mb.music=next;this.introName=name;const e=sb.getSound(name);if(e)e.onSoundComplete=()=>{if(this.introName!==name)return;this.introName=null;sb.start(next,0,99999,true);};return sb.start(name,0,0,true);},setActive:value=>{const before=mb.active;mb.active=value;if(mb.music===null)return;if(value){if(!before){sb.setVolume(mb.music,0);sb.start(mb.music,0,99999,true);sbt.addTransform(mb.music,1,5,mb.vol);}}else mb.stop(1);}};
 }
 cancelIntro(){if(this.introName){this.halt(this.introName);const e=this.entries.get(this.introName);if(e)e.onSoundComplete=null;this.introName=null;}}
 attach(name,unForce){if(this.entries.has(name))return this.entries.get(name);const e={volume:100,pan:0,unForce,token:0,onSoundComplete:null};Object.assign(e,{setVolume:v=>this.sb.setVolume(name,v),getVolume:()=>e.volume,start:(offset,loops)=>this.start(name,offset,loops,true),stop:()=>this.halt(name)});this.entries.set(name,e);return e;}
 async setEnabled(value){if(value===this.enabled)return;const revision=this.soundRevision=(this.soundRevision||0)+1;if(!value){if(this.mb.music){this.mutedMusic=this.mb.music;this.mutedVolume=this.mb.vol;}this.enabled=false;this.stop();return;}this.enabled=true;await this.unlock();if(!this.enabled||revision!==this.soundRevision)return;const name=this.mb.music||this.mutedMusic,volume=this.mb.music?this.mb.vol:this.mutedVolume;this.mb.music=null;if(name)return this.mb.instantStart(name,volume);}
 async unlock(){
  this.context??=this.makeContext();
  const resume=this.context.resume();
  // Gamepad polling can activate a menu before the browser permits audio.
  if(globalThis.navigator?.userActivation?.hasBeenActive===false){resume.catch(()=>{});return;}
  await resume;
 }
 load(name){
  if(!this.buffers.has(name))this.buffers.set(name,this.fetchAudio(this.sounds[name]).then(r=>{if(!r.ok)throw Error(name);return r.arrayBuffer();}).then(async bytes=>{const rawDuration=this.sourceMetadata[name]?rawMp3Duration(new Uint8Array(bytes)):null,buffer=await this.context.decodeAudioData(bytes),window=sourceAudioWindow(buffer,this.sourceMetadata[name],rawDuration);if(window)this.verifiedWindows.set(name,window);else this.verifiedWindows.delete(name);return buffer;}).catch(error=>{this.buffers.delete(name);this.verifiedWindows.delete(name);throw error;}));
  return this.buffers.get(name);
 }
 async prepare(names){
  if(!this.context||!this.enabled)return;
  await Promise.all([...new Set(names)].filter(name=>this.sounds[name]).map(async name=>{try{await this.load(name);}catch(error){console.warn('Audio unavailable',name,error.message);}}));
 }
 halt(name){const e=this.entries.get(name);if(!e)return;e.token++;e.loading=false;if(e.node){const node=e.node;e.node=null;node.onended=null;try{node.stop();}catch{}node.disconnect?.();e.gain?.disconnect?.();e.panner?.disconnect?.();this.active.delete(node);}}
 async start(name,offset=0,loops=1,force=false){
  const e=this.entries.get(name);if(!e||!this.context||!this.enabled||(!this.sb.active&&!force)||!this.sounds[name])return;
  this.halt(name);const token=e.token;e.loading=true;
  try{const buffer=await this.load(name);if(e.token!==token||!this.enabled)return;const node=this.context.createBufferSource(),gain=this.context.createGain();node.buffer=buffer;node.loop=loops>1;gain.gain.value=e.volume/100;node.connect(gain);if(this.context.createStereoPanner){e.panner=this.context.createStereoPanner();e.panner.pan.value=e.pan/100;gain.connect(e.panner).connect(this.context.destination);}else gain.connect(this.context.destination);
   // Apply source seek/count only when decoding retained every raw MP3 frame.
   // A decoder that already removed delay/padding must never be trimmed twice.
   const window=this.sampleWindows[name]??this.verifiedWindows.get(name);let start=offset,end=buffer.duration;if(window){start+=window.start/window.sampleRate;end=(window.start+window.frames)/window.sampleRate;if(start<0||end>buffer.duration)throw Error('Invalid decoded sample window');node.loopStart=window.start/window.sampleRate;node.loopEnd=end;}
   e.node=node;e.gain=gain;this.active.add(node);node.onended=()=>{this.active.delete(node);if(e.node===node){e.node=null;e.onSoundComplete?.();}node.disconnect?.();gain.disconnect?.();};node.start(0,start);if(loops>1&&loops<99999)node.stop(this.context.currentTime+(end-start)*loops);else if(window&&!node.loop)node.stop(this.context.currentTime+end-start);
  }catch(error){this.buffers.delete(name);console.warn('Audio unavailable',name,error.message);}finally{if(e.token===token)e.loading=false;}
 }
 play(name){return /Loop/.test(name)?this.mb.instantStart(name,100):this.sb.start(name);}
 // Pass elapsed milliseconds, including fractional frames. Source speed is an
 // interval in milliseconds, NOT a duration or one step per rendered frame.
 tick(milliseconds){if(this.paused)return;for(const [name,t] of this.transforms){t.elapsed+=milliseconds;while(t.elapsed>=t.speed&&this.transforms.get(name)===t){t.elapsed-=t.speed;const e=this.entries.get(name);if(!e){this.transforms.delete(name);break;}let done=false;if(t.type&1){this.sb.setVolume(name,e.volume+1);done=e.volume>=t.target;}else if(t.type&2){this.sb.setVolume(name,e.volume-1);done=e.volume<=t.target;if(done)this.halt(name);}else if(t.type&4){this.sb.setVolume(name,e.volume+(e.volume>t.target?-1:1));done=e.volume===t.target;}else if(t.type&8){this.halt(name);done=true;}if(done)this.transforms.delete(name);}}}
 async pause(value){this.paused=value;if(this.context)await(value?this.context.suspend():this.context.resume());}
 stop(){this.cancelIntro();for(const name of this.entries.keys())this.halt(name);this.transforms.clear();this.mb.music=null;}
}
