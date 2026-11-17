import {colorCSS} from './rendering.js';
const css=n=>'#'+(Number(n)>>>0).toString(16).padStart(6,'0').slice(-6);
export class Graphics {
 constructor(){this.clear();}
 clear(){this.paths=[];this.stroke=null;this.fill=null;this.current=null;this.pen=[0,0];}
 lineStyle(width,color=0,alpha=100){this.stroke=width===undefined?null:{width:Math.max(1,Number(width)),color,alpha};this.current=null;}
 beginFill(color,alpha=100){this.fill={color,alpha};this.current=null;}
 endFill(){this.fill=null;this.current=null;}
 moveTo(x,y){this.pen=[Number(x),Number(y)];this.current=null;}
 lineTo(x,y){if(!this.current){this.current={points:[this.pen],stroke:this.stroke,fill:this.fill};this.paths.push(this.current);}this.pen=[Number(x),Number(y)];this.current.points.push(this.pen);}
 bounds(){const extents=[];for(const p of this.paths){if(!p.fill&&!(p.stroke?.alpha>0))continue;const pad=p.stroke?.alpha>0?p.stroke.width/2:0;for(const [x,y]of p.points)extents.push([x-pad,y-pad],[x+pad,y+pad]);}if(!extents.length)return null;return {xMin:Math.min(...extents.map(p=>p[0])),xMax:Math.max(...extents.map(p=>p[0])),yMin:Math.min(...extents.map(p=>p[1])),yMax:Math.max(...extents.map(p=>p[1]))};}
 render(ctx,color){for(const p of this.paths){if(p.points.length<2)continue;ctx.beginPath();ctx.moveTo(...p.points[0]);for(const point of p.points.slice(1))ctx.lineTo(...point);if(p.fill){const c=[...color];c[3]*=p.fill.alpha/100;ctx.fillStyle=colorCSS(css(p.fill.color),c);ctx.fill();}if(p.stroke?.alpha>0){const c=[...color];c[3]*=p.stroke.alpha/100;ctx.strokeStyle=colorCSS(css(p.stroke.color),c);ctx.lineWidth=p.stroke.width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();}}}
}
