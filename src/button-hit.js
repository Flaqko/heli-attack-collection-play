import {Clip} from './scene.js';
// Flash's fourth button state is geometry only; it must never be painted.
export function buttonBounds(clip,reference){
 if(!clip.symbol?.button||!clip.symbol.frames[3]?.length)return clip.getBounds(reference);
 const hit=new Clip(clip.data,clip.id,clip._parent,'',clip.depth);
 hit.setPlacement({matrix:clip.matrix,alpha:1});hit.gotoAndStop(4);
 return hit.getBounds(reference);
}
