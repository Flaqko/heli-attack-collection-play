import {createArtworkCanvas} from './tile-art.js';

const parachuteShape=1814;

function outline(ctx,path,fill,stroke,width){
  const shape=new Path2D(path);
  ctx.fillStyle=fill;
  ctx.fill(shape);
  ctx.strokeStyle=stroke;
  ctx.lineWidth=width;
  ctx.stroke(shape);
}

function paintCords(ctx){
  const attachments=[[25,158,0],[48,169,0],[73,164,0],[97,158,0],[117,167,0],[139,164,0],
    [167,161,1],[190,175,0],[216,168,0],[241,186,1],[268,188,1],[291,183,0],
    [315,208,1],[339,213,1],[366,231,1],[398,241,1],[448,211,1],[475,180,1]];
  for(const [i,[x,y,right]] of attachments.entries()){
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(right?256:158,316+right*3);
    ctx.strokeStyle=i%3===0?'#30352a':'#93916e';
    ctx.lineWidth=i%3===0?2.6:1.7;
    ctx.stroke();
  }
  outline(ctx,'M148 305 Q160 311 170 317 L240 318 Q253 318 263 309 L258 326 Q242 333 226 330 L173 329 Q161 329 153 322Z',
    '#676748','#24261c',3);
  ctx.strokeStyle='#25271f';
  ctx.lineWidth=3.2;
  ctx.stroke(new Path2D('M160 321 Q166 335 172 344 L165 349 L171 350 M253 323 Q249 335 242 348 L249 351 L244 354'));
}

export function prepareParachuteArt(data,images,createCanvas=createArtworkCanvas){
  const original=images.get(parachuteShape);
  if(!original)throw Error('Missing original parachute artwork.');
  const [,,width,height]=data.symbols[parachuteShape].bounds;
  const surface=createCanvas(width*4,height*4),ctx=surface.getContext('2d');
  ctx.scale(surface.width/492,surface.height/360);
  ctx.lineJoin='round';
  ctx.lineCap='round';
  paintCords(ctx);

  // Keep the source fabric, including the printed logo, grain, and discoloration.
  // The crop follows the bottom of the canopy so the redrawn cords can show.
  ctx.save();
  ctx.clip(new Path2D('M0 0H492V151L482 180 461 207 426 238 409 244 378 246 358 230 343 214 308 215 290 200 281 191 245 192 221 177 185 177 163 165 118 169 90 162 61 171 34 173 17 161 0 150Z'));
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(original,0,0,492,360);
  ctx.restore();
  surface.sharpVector=true;
  surface.remasteredParachute=true;
  images.set(parachuteShape,surface);
}
