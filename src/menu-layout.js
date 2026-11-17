// Adapt original placements without changing the extracted timelines or assets.
export function layoutMenu(root,page,width){
 root.viewportWidth=width;root.viewportHeight=320;
 const extra=width-448;if(!extra)return;
 for(const c of root.children.values()){
  if(c.id===1857||c.id===1922){c._xscale*=width/448;continue;}
  if(c.id===1863){const scale=width/448;c._xscale*=scale;c._yscale*=scale;c._y-=(320*scale-320)/2;continue;}
  if(c._name==='logo'||c._name==='playerD')continue;
  if(c.id===1925){c._width+=extra;continue;}
  if(c.symbol?.kind==='text'&&['instructions','credits','statsd','weaponsd','cheatd','leveld','scored'].includes(c._name)&&page!=='levelselect'){
   c._width=root.data.symbols[c.id].bounds[2]+extra;continue;
  }
  if(c.id===1932||c._name==='cont'||(c._x>=300&&(c._y<60||c._y>=280))){c._x+=extra;continue;}
  if(c._name==='opt')continue;
  c._x+=extra/2;
 }
}
