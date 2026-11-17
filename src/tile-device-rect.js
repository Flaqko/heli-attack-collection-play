// Align the 32px interior of authored 34px tiles to a shared device-pixel grid.
// Retain the surrounding artwork gutter and leave non-axis-aligned art untouched.
export function tileDeviceRect(m,[x,y,w,h]){
 if(w!==34||h!==34||!m||m.b!==0||m.c!==0||m.a<=0||m.d<=0)return null;
 const left=Math.round(m.e+m.a*(x+1)),right=Math.round(m.e+m.a*(x+33));
 const top=Math.round(m.f+m.d*(y+1)),bottom=Math.round(m.f+m.d*(y+33));
 if(![left,right,top,bottom].every(Number.isFinite)||right<=left||bottom<=top)return null;
 const unitX=(right-left)/32,unitY=(bottom-top)/32;
 return{x:left-unitX,y:top-unitY,width:34*unitX,height:34*unitY,unitX,unitY};
}
