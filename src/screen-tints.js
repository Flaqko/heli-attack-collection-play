// Enhanced-only presentation preferences; original power-up state remains intact.
export function installScreenTints(root){
 const newPlayer=root.newPlayer,addToggle=root.menuAddToggle;
 root.newPlayer=function(...args){return{...newPlayer.apply(this,args),screenTints:false};};
 root.menuAddToggle=function(clip,name,variable){
  if(variable==='weaponswitch')addToggle.call(this,clip,'Screen Tints:','screenTints');
  return addToggle.call(this,clip,name,variable);
 };
}
export function configureScreenTints(root){
 Object.defineProperty(root.world,'suppressColorTransform',{get:()=>root.stats.screenTints!==true,configurable:true});
}
