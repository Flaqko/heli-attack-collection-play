// Enhanced-only runtime adapters. Keep finite health/HUD values and the original
// reload routines; never persist temporary infinite ammunition as earned ammo.
export function adaptCheatRewards(root){
 // These source routines add earned ammunition. Read the finite reserve during
 // their additions, then restore infinite availability for aiming/firing/HUD.
 for(const name of ['itemFrame','enemyKill']){const original=root[name];root[name]=function(...args){
  if(root.stats?.infiniteAmmo!==true)return Reflect.apply(original,this,args);
  const previous=root.cheatReadFiniteAmmo;root.cheatReadFiniteAmmo=true;
  try{return Reflect.apply(original,this,args);}finally{root.cheatReadFiniteAmmo=previous;}
 };}
}
export function installGameplayCheats(root){
 const player=root.player;root.cheatAmmoReserves=null;root.cheatSpawn={x:player._x,y:player._y};
 if(root.stats.infiniteHealth===true){let health=player.maxHealth;player.lastHealth=health;
  Object.defineProperty(player,'health',{configurable:true,enumerable:true,get:()=>root.stats.infiniteHealth===true?player.maxHealth:health,set:value=>{health=root.stats.infiniteHealth===true?player.maxHealth:value;}});
 }
 if(root.stats.infiniteAmmo===true){const reserves=[];root.cheatAmmoReserves=reserves;
  player.guns.forEach((gun,index)=>{let bullets=gun.bullets;reserves[index]=()=>bullets;
   Object.defineProperty(gun,'bullets',{configurable:true,enumerable:true,get:()=>root.stats.infiniteAmmo===true&&!root.cheatReadFiniteAmmo&&root.stats.guns[index].unlocked?Infinity:bullets,set:value=>{if(root.stats.infiniteAmmo!==true||value!==Infinity)bullets=value;}});
  });
 }
}
export function recoverCheatFall(root){
 const p=root.player;if(root.stats?.infiniteHealth!==true||root.gameOver||!p||p._y<=(root.fg.h+2)*root.th)return;
 p._x=root.cheatSpawn.x;p._y=root.cheatSpawn.y;p.xspeed=p.yspeed=p.forcexspeed=0;root.old(p);
}
export function restoreCheatAmmo(root){
 if(root.stats.infiniteAmmo===true&&root.cheatAmmoReserves&&!root.worldTraining)root.cheatAmmoReserves.forEach((reserve,i)=>{root.stats.guns[i].ammo=reserve();});
}
