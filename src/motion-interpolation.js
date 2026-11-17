export const simulationStep=1000/35;
const teleportDistance=128;

export function createMotionInterpolation(){
  let previous=new WeakMap();
  let alpha=1;

  function record(clip){
    if(!clip||clip.removed||!Number.isFinite(clip._x)||!Number.isFinite(clip._y))return;
    previous.set(clip,{matrix:clip.matrix,rotation:clip._rotation});
  }

  function actorTree(clip){
    if(!clip||clip.removed)return;
    record(clip);
    for(const child of clip.children.values()){
      if(child.clipDepth)continue;
      actorTree(child);
    }
  }

  return {
    capture(root){
      previous=new WeakMap();
      record(root.fg);
      record(root.bg);
      record(root.sbg);
      for(const layer of [root.game,root.undergame,root.overgame,root.environment])actorTree(layer);
    },
    captureScene(root){previous=new WeakMap();actorTree(root);},
    reset(){previous=new WeakMap();alpha=1;},
    setFraction(fraction){alpha=Math.max(0,Math.min(1,fraction));},
    matrix(clip,current){
      const sample=previous.get(clip);
      if(!sample||alpha===1)return current;
      const old=sample.matrix;
      const dx=current[4]-old[4],dy=current[5]-old[5];
      if(Math.abs(dx)>teleportDistance||Math.abs(dy)>teleportDistance)return current;
      const oldDet=old[0]*old[3]-old[1]*old[2],det=current[0]*current[3]-current[1]*current[2];
      // A mirror switches the authored pivot as well as the facing.
      if(Math.sign(oldDet)!==Math.sign(det))return current;

      current[4]=old[4]+dx*alpha;
      current[5]=old[5]+dy*alpha;
      if((clip._name==='fg'||clip._name==='bg')&&clip.w>0&&clip.h>0){
        // Recycled tile grids no longer have cells beyond their left/top edge.
        current[4]=Math.min(current[4],-clip.x*(clip.pw/clip.w));
        current[5]=Math.min(current[5],-clip.y*(clip.ph/clip.h));
      }

      if(old[0]===current[0]&&old[1]===current[1]&&old[2]===current[2]&&old[3]===current[3])return current;
      const delta=((clip._rotation-sample.rotation+180)%360+360)%360-180;
      const turn=delta*Math.PI/180;
      const undoCos=Math.cos(turn),undoSin=Math.sin(turn);
      const cos=Math.cos(turn*alpha),sin=Math.sin(turn*alpha);
      for(const column of [0,2]){
        const x=old[column]*(1-alpha)+(current[column]*undoCos+current[column+1]*undoSin)*alpha;
        const y=old[column+1]*(1-alpha)+(current[column+1]*undoCos-current[column]*undoSin)*alpha;
        current[column]=x*cos-y*sin;
        current[column+1]=x*sin+y*cos;
      }
      return current;
    },
  };
}
