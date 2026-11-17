export function bindCombatPointer(canvas,window,{game,isRunning,onMenuGesture,onAim}){
 let owner=null;const listeners=[];
 function listen(target,type,handler,options){target.addEventListener(type,handler,options);listeners.push(()=>target.removeEventListener(type,handler,options));}
 function aim(e){const r=canvas.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;const x=(e.clientX-r.left)*(game.root.spw||448)/r.width,y=(e.clientY-r.top)*(game.root.sph||320)/r.height;if(!Number.isFinite(x)||!Number.isFinite(y))return false;Object.assign(game.root.pointer,{x,y});onAim?.();return true;}
 function clear(){owner=null;game.root.mouseD=0;}
 listen(canvas,'pointermove',e=>{if(owner===e.pointerId&&e.buttons!==undefined&&!(e.buttons&1))clear();if(e.isPrimary!==false&&(owner===null||owner===e.pointerId))aim(e);});
 listen(canvas,'pointerdown',e=>{if(e.button!==0||e.isPrimary===false)return;if(onMenuGesture?.())return;if(!isRunning()||game.paused||!aim(e))return;owner=e.pointerId;canvas.setPointerCapture(owner);game.root.mouseD=1;game.root.pendingShot=true;canvas.focus();});
 const release=e=>{if(e.pointerId===owner)clear();};
 listen(window,'pointerup',release);listen(window,'pointercancel',e=>{if(e.pointerId===owner){clear();game.root.pendingShot=false;}});listen(canvas,'lostpointercapture',e=>{if(e.pointerId===owner){clear();game.root.pendingShot=false;}});listen(window,'blur',()=>{clear();game.root.pendingShot=false;});
 listen(canvas,'wheel',e=>{e.preventDefault();if(isRunning()&&!game.paused)game.root.mouseW=-Math.sign(e.deltaY);},{passive:false});
 listen(canvas,'contextmenu',e=>e.preventDefault());
 return {clear,dispose(){clear();game.root.pendingShot=false;for(const remove of listeners)remove();}};
}
