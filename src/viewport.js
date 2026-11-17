export const WIDE_WIDTH=320*16/9;
export function adaptCamera(root){
 if(root.spw===448)return;
 const original=root.playerCam;
 root.playerCam=(...args)=>{
  const edge=root.clr,padding=root.stw*root.tw-root.spw;
  if(!Number.isFinite(edge)||!Number.isFinite(padding))return original(...args);
  // Source camera clamps against whole tile columns. Correct its fractional
  // viewport edge without changing the boundary used by actor collisions.
  root.clr=edge+padding;
  try{return original(...args);}finally{root.clr=edge;}
 };
}
export function layoutGameplay(root){
 const extra=root.spw-448;root.world.viewportWidth=root.spw;root.world.viewportHeight=root.sph;
 if(!extra)return;
 for(const child of root.hud.children.values())if(['weapon','reload','one','two','powerup','poweruptime'].includes(child._name)||['ammo','poweruptext'].includes(child.symbol?.variable))child._x+=extra;
 // Cover the wider view with uniform scaling; scenery and sprites stay undistorted.
 const scale=(root.spw+2)/448;root.sbg._xscale=root.sbg._yscale=scale*100;root.sbg._y=-(320*scale-root.sph)/2;
}
