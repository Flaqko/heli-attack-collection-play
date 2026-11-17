import {createArtworkCanvas} from './tile-art.js';

const frameCount=8;
const light={first:-2100,width:125,height:8};
const heavy={first:-2110,width:199,height:10};
const tail={first:-2120,width:38,height:38};
const heavyMainClip=-2130,heavyTailClip=-2131;

function blade(ctx,length,thickness,color){
  ctx.beginPath();
  ctx.moveTo(2,-thickness*.34);
  ctx.lineTo(length*.89,-thickness*.54);
  ctx.lineTo(length,-thickness*.18);
  ctx.lineTo(length*.96,thickness*.39);
  ctx.lineTo(3,thickness*.28);
  ctx.closePath();
  ctx.fillStyle=color;
  ctx.fill();
  ctx.fillStyle='#bec4b5';
  ctx.fillRect(length*.83,-thickness*.24,length*.06,thickness*.42);
}

function hub(ctx,radius){
  ctx.fillStyle='#262b2c';
  ctx.beginPath();
  ctx.ellipse(0,0,radius,radius*.68,0,0,Math.PI*2);
  ctx.fill();
  ctx.fillStyle='#9ba399';
  ctx.beginPath();
  ctx.ellipse(-.4,-.45,radius*.53,radius*.35,0,0,Math.PI*2);
  ctx.fill();
}

export function paintMain(ctx,phase,width){
  const span=width/2;
  const angle=(phase+.14)*Math.PI*2/frameCount;
  const projection=Math.abs(Math.cos(angle));
  const sweep=Math.abs(Math.sin(angle));
  const length=span*(.12+projection*.88);
  const thickness=1.55+sweep*2.45;

  ctx.strokeStyle='#98a6aa45';
  ctx.lineWidth=.8;
  ctx.beginPath();
  ctx.ellipse(0,0,span-.7,1.4+sweep,0,0,Math.PI*2);
  ctx.stroke();

  ctx.save();
  ctx.transform(1,Math.sin(angle)*.038,0,1,0,0);
  blade(ctx,length,thickness,'#474f50');
  ctx.rotate(Math.PI);
  blade(ctx,length,thickness,'#777e77');
  ctx.restore();
  hub(ctx,3.25);
}

export function paintTail(ctx,phase,width){
  ctx.strokeStyle='#8e9c9759';
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.arc(0,0,width/2-1.25,0,Math.PI*2);
  ctx.stroke();

  ctx.save();
  ctx.rotate(phase*Math.PI*2/frameCount);
  for(let i=0;i<3;i++){
    blade(ctx,width/2-1.2,3.8,i===0?'#818a7d':'#505957');
    ctx.rotate(Math.PI*2/3);
  }
  ctx.restore();
  hub(ctx,3.7);
}

function placement(id,depth,x,y){
  return {id,depth,name:'',matrix:[1,0,0,1,x,y],alpha:1};
}

export function prepareHelicopterRotors(data,images,createCanvas=createArtworkCanvas){
  const shapes=[],surfaces=[];
  for(const rotor of [light,heavy,tail]){
    for(let phase=0;phase<frameCount;phase++){
      const {first,width,height}=rotor,id=first-phase;
      const image=createCanvas(width*4,height*4),ctx=image.getContext('2d');
      ctx.translate(image.width/2,image.height/2);
      ctx.scale(4,4);
      (rotor===tail?paintTail:paintMain)(ctx,phase,width);
      image.sharpVector=true;
      shapes.push([id,{kind:'shape',bounds:[-width/2,-height/2,width,height]}]);
      surfaces.push([id,image]);
    }
  }
  for(const [id,shape] of shapes)data.symbols[id]=shape;
  for(const [id,image] of surfaces)images.set(id,image);
  const sequence=(rotor,x,y)=>Array.from({length:frameCount},(_,phase)=>[placement(rotor.first-phase,2,x,y)]);
  data.symbols[294]={...data.symbols[294],frames:sequence(light,63.5,2)};
  data.symbols[heavyMainClip]={kind:'sprite',frames:sequence(heavy,0,0)};
  data.symbols[heavyTailClip]={kind:'sprite',frames:sequence(tail,0,0)};
}

export function enableHeavyHelicopterRotors(data){
  const body=data.symbols[1110],frame=body.frames[0];
  if(frame.some(part=>part.id===heavyMainClip))return;
  data.symbols[1110]={...body,frames:[[
    ...frame,
    placement(heavyMainClip,10,20.25,-43),
    placement(heavyTailClip,11,-90.75,-13.5),
  ]]};
}
