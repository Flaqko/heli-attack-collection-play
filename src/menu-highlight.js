// Menu hotspots share one selection per page, regardless of the input device.
const selections=new WeakMap();
export const menuHighlightShapeIds=[1910,1933,2016,2020,2035,2050,2052,2054,2059,2069];

export function clearMenuHighlight(layer){selections.delete(layer);}

export function bindMenuHighlight(layer,button,bounds,clip){
 let state=selections.get(layer);
 if(!state){state={};selections.set(layer,state);}
 const selection={button,bounds,clip};
 function highlight(next){
  if(state.active===next)return;
  state.active?.button.setAttribute('data-highlighted','false');
  state.active=next;
  next?.button.setAttribute('data-highlighted','true');
 }
 button.setAttribute('data-menu-highlight','');
 button.onpointerenter=()=>highlight(selection);
 button.onpointerleave=()=>{if(state.active===selection)highlight(state.focused);};
 button.onfocus=()=>{state.focused=selection;highlight(selection);};
 button.onblur=()=>{
  if(state.focused===selection)state.focused=undefined;
  if(state.active===selection)highlight(undefined);
 };
}

export function renderMenuHighlight(ctx,images,layer,root){
 const selected=selections.get(layer)?.active;
 if(!selected?.bounds)return;
 const {xMin,yMin,xMax,yMax}=selected.bounds;
 ctx.save();
 ctx.beginPath();
 ctx.rect(xMin,yMin,xMax-xMin,yMax-yMin);
 ctx.clip();
 function visit(clip,insideSelection){
  if(!clip._visible||clip.removed)return;
  const inside=insideSelection||clip===selected.clip;
  const image=images.menuHighlights?.get(clip.id);
  if(image){
   ctx.save();
   ctx.transform(...clip.globalMatrix);
   ctx.drawImage(image,...clip.symbol.bounds);
   ctx.restore();
  }else if(inside&&clip.symbol?.kind==='text'){
   // These labels are already white. A small glow marks the active text.
   ctx.save();
   if(clip._parent)ctx.transform(...clip._parent.globalMatrix);
   const matrix=ctx.getTransform?.();
   ctx.shadowColor='#fff';
   ctx.shadowBlur=matrix?Math.max(2,Math.hypot(matrix.a,matrix.b)*1.5):3;
   clip.render(ctx,images);
   ctx.restore();
  }
  for(const child of clip.children.values())visit(child,inside);
 }
 visit(root,false);
 ctx.restore();
}
