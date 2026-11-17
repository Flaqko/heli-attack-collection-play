// Floating gameplay text keeps source placement, motion and lifetime without boxes.
export function installGameplayPopups(root){
 const original=root.addPopUp;
 root.addPopUp=function(...args){
  const popup=original.apply(this,args);
  popup?.clear();
  return popup;
 };
}
