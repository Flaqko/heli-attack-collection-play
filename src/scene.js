import {tileDeviceRect} from './tile-device-rect.js';
import {Graphics} from './graphics.js';
import {renderMorph,morphBounds} from './morph.js';
import {textLines,textFont,textStyle} from './text-layout.js';
import {IDENTITY_COLOR,clipColor,composeColor,coloredImage,colorCSS,maskPath,drawVectorPaths} from './rendering.js';
const identity=()=>[1,0,0,1,0,0];
export function multiply(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function invert(m){const d=m[0]*m[3]-m[1]*m[2];return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
function point(m,p){const x=p.x,y=p.y;p.x=m[0]*x+m[2]*y+m[4];p.y=m[1]*x+m[3]*y+m[5];return p;}
export class Clip {
 get _name(){return this.instanceName;}
 set _name(value){const name=String(value);if(this._parent&&this._parent[this.instanceName]===this)delete this._parent[this.instanceName];this.instanceName=name;if(this._parent&&name)this._parent[name]=this;}
 get _x(){return this.removed?undefined:this.positionX;}
 set _x(value){if(!this.removed&&value!=null&&!Number.isNaN(Number(value)))this.positionX=Number(value);}
 get _y(){return this.removed?undefined:this.positionY;}
 set _y(value){if(!this.removed&&value!=null&&!Number.isNaN(Number(value)))this.positionY=Number(value);}
 get colorTransform(){return this.channelTransform;}
 set colorTransform(value){this.channelTransform=value;this.tint=undefined;if(value?.aa!==undefined)this._alpha=Number(value.aa);}
 constructor(data,id=0,parent=null,name='',depth=0){
  this.data=data;this.id=id;this._parent=parent;this._name=name;this.depth=depth;this.children=new Map();this.timeline=new Set();
  this._x=0;this._y=0;this._xscale=100;this._yscale=100;this._rotation=0;this._alpha=100;this._visible=true;this._currentframe=1;this.playing=true;
  this.symbol=data.symbols[id];this._totalframes=this.symbol?.frames?.length||1;
  this.text=this.symbol?.text||'';this.applyFrame(1,true);
 }
 get _xscale(){return this.scaleX??100;}
 set _xscale(value){this.scaleColumn(0,Number(value));}
 get _yscale(){return this.scaleY??100;}
 set _yscale(value){this.scaleColumn(1,Number(value));}
 scaleColumn(column,value){
  this.basis??=[1,0,0,1];const key=column?'scaleY':'scaleX',old=this[key]??100,i=column*2;
  if(old){this.basis[i]*=value/old;this.basis[i+1]*=value/old;}
  else {const r=((this.rotation??0)+(column?90:0))*Math.PI/180;this.basis[i]=Math.cos(r)*value/100;this.basis[i+1]=Math.sin(r)*value/100;}
  this[key]=value;
 }
 get _rotation(){return this.rotation??0;}
 set _rotation(value){
  this.basis??=[1,0,0,1];const r=(Number(value)-(this.rotation??0))*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r);
  for(const i of [0,2]){const x=this.basis[i],y=this.basis[i+1];this.basis[i]=cos*x-sin*y;this.basis[i+1]=sin*x+cos*y;}
  this.rotation=Number(value);
 }
 get matrix(){return [...this.basis,this._x,this._y];}
 get globalMatrix(){return this._parent?multiply(this._parent.globalMatrix,this.matrix):this.matrix;}
 get _xmouse(){return point(invert(this.globalMatrix),{x:this.root.pointer.x,y:this.root.pointer.y}).x;}
 get _ymouse(){return point(invert(this.globalMatrix),{x:this.root.pointer.x,y:this.root.pointer.y}).y;}
 get root(){return this._parent?this._parent.root:this;}
 get _width(){const b=this.bounds();return (b.xMax-b.xMin)*Math.abs(this._xscale)/100;}
 set _width(v){if(this.symbol?.kind==='text'){this.symbol={...this.symbol,bounds:[...this.symbol.bounds]};this.symbol.bounds[2]=v;return;}const b=this.bounds();this._xscale=v/(b.xMax-b.xMin||1)*100;}
 get _height(){const b=this.bounds();return (b.yMax-b.yMin)*Math.abs(this._yscale)/100;}
 set _height(v){if(this.symbol?.kind==='text'){this.symbol={...this.symbol,bounds:[...this.symbol.bounds]};this.symbol.bounds[3]=v;return;}const b=this.bounds();this._yscale=v/(b.yMax-b.yMin||1)*100;}
 setPlacement(p){const [a,b,c,d,x,y]=p.matrix;this.basis=[a,b,c,d];this._x=x;this._y=y;this.rotation=Math.atan2(b,a)*180/Math.PI;this.scaleX=Math.hypot(a,b)*100;this.scaleY=Math.hypot(c,d)*(a*d-b*c<0?-100:100);this._alpha=(p.alpha??1)*100;this.colorTransform=p.colorTransform;this.tint=undefined;this.clipDepth=p.clipDepth;this.ratio=p.ratio??0;}
 applyFrame(frame,force=false){
  const next=this.symbol?.frames?.[frame-1];if(!next)return;
  const previous=this.symbol.frames[this._currentframe-1]||[];const active=new Set(next.map(p=>p.depth));
  for(const depth of this.timeline)if(!active.has(depth)){this.children.get(depth)?.removeMovieClip();this.timeline.delete(depth);}
  for(const p of next){let child=this.children.get(p.depth);const old=previous.find(v=>v.depth===p.depth);
   if(!child||child.id!==p.id){child?.removeMovieClip();child=new Clip(this.data,p.id,this,p.name,p.depth);this.children.set(p.depth,child);if(p.name)this[p.name]=child;child.setPlacement(p);}
   else if(force||JSON.stringify(old)!==JSON.stringify(p))child.setPlacement(p);
   this.timeline.add(p.depth);
  }
  this._currentframe=frame;
  if(this.symbol?.button)this.playing=false;
  for(const action of this.symbol?.actions?.[frame]||[]){if(action.stop)this.playing=false;else if(action.goto&&action.goto!==frame){this.playing=action.play;this.applyFrame(this.resolveFrame(action.goto));}}
 }
 gotoAndStop(frame){this.playing=false;this.applyFrame(this.resolveFrame(frame),true);}
 gotoAndPlay(frame){this.playing=true;this.applyFrame(this.resolveFrame(frame),true);}
 resolveFrame(frame){return Math.max(1,Math.min(this._totalframes,typeof frame==='string'?(this.symbol?.labels?.[frame]||this.symbol?.labels?.[Object.keys(this.symbol?.labels||{}).find(label=>label.toLowerCase()===frame.toLowerCase())]||Number(frame)||1):Math.floor(frame)||1));}
 stop(){this.playing=false;}
 play(){this.playing=true;}
 nextFrame(){this.applyFrame(Math.min(this._totalframes,this._currentframe+1));}
 prevFrame(){this.applyFrame(Math.max(1,this._currentframe-1));}
 advance(){const existing=new Set(this.children.values());if(this.playing&&this._totalframes>1)this.applyFrame(this._currentframe%this._totalframes+1);for(const child of this.children.values())if(existing.has(child)&&!child.removed)child.advance();this.onEnterFrame?.();}
 createEmptyMovieClip(name,depth){return this.add(new Clip(this.data,0,this,name,depth));}
 attachMovie(link,name,depth,init){const id=this.data.names[link]??this.data.names[Object.keys(this.data.names).find(n=>n.toLowerCase()===link.toLowerCase())];if(id===undefined)return undefined;return Object.assign(this.add(new Clip(this.data,id,this,name,depth)),init||{});}
 add(child){this.children.get(child.depth)?.removeMovieClip();this.children.set(child.depth,child);this[child._name]=child;return child;}
 getNextHighestDepth(){return this.children.size?Math.max(...this.children.keys())+1:0;}
 getDepth(){return this.depth;}
 removeMovieClip(){if(this._parent){this._parent.children.delete(this.depth);if(this._parent[this._name]===this)delete this._parent[this._name];}this.removed=true;this._x=undefined;this._y=undefined;}
 localToGlobal(p){point(this.globalMatrix,p);}
 globalToLocal(p){point(invert(this.globalMatrix),p);}
 bounds(){
  if(this.symbol?.kind==='morph'){const [x,y,w,h]=morphBounds(this.symbol,this.ratio);return {xMin:x,yMin:y,xMax:x+w,yMax:y+h};}
  if(this.symbol?.bounds){const [x,y,w,h]=this.symbol.bounds;return {xMin:x,yMin:y,xMax:x+w,yMax:y+h};}
  const bounds=[...this.children.values()].map(c=>c.getBounds(this));const drawn=this.graphics?.bounds();if(drawn)bounds.push(drawn);
  return bounds.length?{xMin:Math.min(...bounds.map(b=>b.xMin)),xMax:Math.max(...bounds.map(b=>b.xMax)),yMin:Math.min(...bounds.map(b=>b.yMin)),yMax:Math.max(...bounds.map(b=>b.yMax))}:{xMin:0,yMin:0,xMax:0,yMax:0};
 }
 getBounds(target){const b=this.bounds();const m=multiply(invert(target?.globalMatrix||identity()),this.globalMatrix);const ps=[[b.xMin,b.yMin],[b.xMax,b.yMin],[b.xMax,b.yMax],[b.xMin,b.yMax]].map(([x,y])=>point(m,{x,y}));return {xMin:Math.min(...ps.map(p=>p.x)),xMax:Math.max(...ps.map(p=>p.x)),yMin:Math.min(...ps.map(p=>p.y)),yMax:Math.max(...ps.map(p=>p.y))};}
 hitTest(other,y){const b=this.getBounds(null);if(typeof other==='number')return other>=b.xMin&&other<=b.xMax&&y>=b.yMin&&y<=b.yMax;if(!other?.getBounds)return false;const a=other.getBounds(null);return a.xMax>=b.xMin&&a.xMin<=b.xMax&&a.yMax>=b.yMin&&a.yMin<=b.yMax;}
 createTextField(name,depth,x,y,w,h){const c=this.createEmptyMovieClip(name,depth);c._x=x;c._y=y;c.symbol={kind:'text',bounds:[0,0,w,h],size:12,color:'#ffffff'};return c;}
 get textWidth(){const size=this.format?.size||this.symbol?.size||12,lines=String(this.text??'').split('\n');if(typeof OffscreenCanvas==='function'){const ctx=new OffscreenCanvas(1,1).getContext('2d');ctx.font=`${size}px ${textFont(this)}`;return Math.max(...lines.map(line=>ctx.measureText(line).width));}return Math.max(...lines.map(line=>line.length*size*.6));}
 get textHeight(){const s=textStyle(this),size=this.format?.size||s.size||12;let measure=text=>text.length*size*.6;if(typeof OffscreenCanvas==='function'){const ctx=new OffscreenCanvas(1,1).getContext('2d');ctx.font=`${size}px ${textFont(this)}`;measure=text=>ctx.measureText(text).width;}const count=textLines(this.text??'',s,measure).length;return count*size*1.2+Math.max(0,count-1)*(s.leading||0);}
 setTextFormat(format){this.format=format;}
 setNewTextFormat(format){this.format=format;}
 clear(){this.graphics?.clear();}
 lineStyle(...args){(this.graphics??=new Graphics()).lineStyle(...args);}
 beginFill(...args){(this.graphics??=new Graphics()).beginFill(...args);}
 endFill(){this.graphics?.endFill();}
 moveTo(...args){(this.graphics??=new Graphics()).moveTo(...args);}
 lineTo(...args){(this.graphics??=new Graphics()).lineTo(...args);}
 render(ctx,images,parentColor=IDENTITY_COLOR,motion){
  if(!this._visible||this.removed||!Number.isFinite(this._x))return;
  const matrix=motion?motion.matrix(this,this.matrix):this.matrix;
  const fall=this._parent?.crateFallOffsets?.get(this._name);
  if(fall)matrix[5]+=fall;
  ctx.save();ctx.transform(...matrix);const color=composeColor(parentColor,clipColor(this));
  if(this.symbol?.kind==='morph')renderMorph(ctx,this.symbol,this.ratio,color);
  else if(this.symbol?.kind==='shape'){
   const source=images.get(this.id),image=source?.resolveForClip?.(this)||source;
   if(image?.nativePaths)drawVectorPaths(ctx,image.nativePaths,color);
   else if(image){
    const [r,g,b,alpha,red,green,blue,offset]=color;
    const opacityOnly=r===1&&g===1&&b===1&&red===0&&green===0&&blue===0&&offset===0&&alpha>=0&&alpha<=1;
    if(!opacityOnly||alpha!==0){
     const [x,y,w,h]=this.symbol.bounds;
     if(image.bitmapTile)ctx.imageSmoothingEnabled=false;
     const rect=image.bitmapTile?tileDeviceRect(ctx.getTransform?.(),this.symbol.bounds):null;
     const bitmap=opacityOnly?image:coloredImage(image,color);
     const priorAlpha=ctx.globalAlpha;
     if(opacityOnly&&alpha!==1)ctx.globalAlpha=priorAlpha*alpha;
     if(rect){
      ctx.save();ctx.setTransform(1,0,0,1,0,0);
      ctx.drawImage(bitmap,rect.x,rect.y,rect.width,rect.height);ctx.restore();
     }else ctx.drawImage(bitmap,x,y,w,h);
     if(opacityOnly&&alpha!==1)ctx.globalAlpha=priorAlpha;
    }
   }
  }
  else if(this.symbol?.kind==='text'){const s=textStyle(this);const text=s.variable&&this._parent?.[s.variable]!==undefined?this._parent[s.variable]:this.text;ctx.fillStyle=colorCSS(this.format?.color!==undefined?`#${Number(this.format.color).toString(16).padStart(6,'0')}`:s.color||'#fff',color.map((v,i)=>i===3?v*(s.textAlpha??1):v));ctx.font=`${this.format?.size||s.size||12}px ${textFont(this)}`;ctx.textBaseline='top';ctx.textAlign=s.align===1?'right':s.align===2?'center':'left';const size=this.format?.size||s.size||12,lines=textLines(text,s,t=>ctx.measureText(t).width);for(let i=0;i<lines.length;i++){const y=s.bounds[1]+i*(size*1.2+(s.leading||0));if(y>=s.bounds[1]+s.bounds[3])break;ctx.fillText(lines[i],s.bounds[0]+(s.align===1?s.bounds[2]-(s.rightMargin||0):s.align===2?s.bounds[2]/2:s.leftMargin||0),y);}}
  this.graphics?.render(ctx,color);
  let masks=[];
  for(const c of [...this.children.values()].sort((a,b)=>a.depth-b.depth)){
   if(masks.length)masks=masks.filter(mask=>c.depth<=mask.clipDepth);
   if(c.clipDepth)masks.push(c);
   else if(!masks.length)c.render(ctx,images,color,motion);
   else {ctx.save();for(const mask of masks)ctx.clip(maskPath(mask,images),'evenodd');c.render(ctx,images,color,motion);ctx.restore();}
  }
  ctx.restore();
 }
}

