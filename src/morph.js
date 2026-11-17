// Native interpolation of the supplied SWF's nine single-fill morph shapes.
// Coordinates are extracted in pixels; SWF placement ratios range 0..65535.
const mix=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
export function morphGeometry(symbol,ratio=0){
 const t=Math.max(0,Math.min(65535,ratio))/65535;
 return symbol.start.map((a,i)=>{const b=symbol.end[i],curved=a.control||b.control;return {from:point(a.from,b.from,t),to:point(a.to,b.to,t),control:curved?point(a.control||point(a.from,a.to,.5),b.control||point(b.from,b.to,.5),t):null};});
}
export function traceMorph(target,geometry){
 let pen;for(const edge of geometry){if(!pen||edge.from.some((v,i)=>Math.abs(v-pen[i])>1e-8))target.moveTo(...edge.from);if(edge.control)target.quadraticCurveTo(...edge.control,...edge.to);else target.lineTo(...edge.to);pen=edge.to;}
}
export function morphBounds(symbol,ratio=0){return point(symbol.startBounds,symbol.endBounds,Math.max(0,Math.min(65535,ratio))/65535);}
function rgba(start,end,t,color){const values=point(start,end,t).map((v,i)=>Math.max(0,Math.min(255,v*color[i]+color[i+4])));return `rgba(${values[0]},${values[1]},${values[2]},${values[3]/255})`;}
export function renderMorph(ctx,symbol,ratio,color){
 const t=Math.max(0,Math.min(65535,ratio||0))/65535,fill=symbol.fill;
 if(fill.type===0)ctx.fillStyle=rgba(fill.start,fill.end,t,color);
 else {ctx.save();ctx.transform(...point(fill.startMatrix,fill.endMatrix,t));const gradient=ctx.createLinearGradient(-819.2,0,819.2,0);for(const stop of fill.stops)gradient.addColorStop(mix(stop.startRatio,stop.endRatio,t)/255,rgba(stop.start,stop.end,t,color));ctx.restore();ctx.fillStyle=gradient;}
 ctx.beginPath();traceMorph(ctx,morphGeometry(symbol,ratio));ctx.fill('evenodd');
}
