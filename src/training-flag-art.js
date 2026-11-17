import {createArtworkCanvas} from './tile-art.js';

const exitFlagShape=675;

export function prepareTrainingFlagArt(data,images,createCanvas=createArtworkCanvas){
  const [,,width,height]=data.symbols[exitFlagShape].bounds;
  const image=createCanvas(width*4,height*4),ctx=image.getContext('2d');
  ctx.scale(4,4);
  ctx.lineJoin='round';

  const cloth=new Path2D('M16.8 3.5Q21.1 3.8 25.6 3.5L32 3.4L28.5 8.3L32 12.7L26 12.8Q21.4 13.2 16.8 12.9Z');
  ctx.strokeStyle='#263134';
  ctx.lineWidth=1.25;
  ctx.stroke(cloth);
  ctx.save();
  ctx.clip(cloth);
  const stripes=[
    [3.3,3.8,'#d49b27','#ffe17b','#eeb33d'],
    [7.1,2.1,'#b7b8a7','#fff8db','#e8e8d6'],
    [9.2,4.1,'#0755aa','#1597ea','#1269c1'],
  ];
  for(const [y,h,edge,light,tip] of stripes){
    const shade=ctx.createLinearGradient(17,0,32,0);
    shade.addColorStop(0,edge);
    shade.addColorStop(.36,light);
    shade.addColorStop(1,tip);
    ctx.fillStyle=shade;
    ctx.fillRect(16.5,y,16,h);
  }
  ctx.strokeStyle='#ffffff55';
  ctx.lineWidth=.4;
  ctx.stroke(new Path2D('M18.1 4.2Q22 4.7 26 4.3L30.6 4.1'));
  ctx.restore();

  const pole=new Path2D('M12.4 2.4Q12.4 1.8 13.2 1.8H16.2Q17.3 1.8 17.3 3.1V29.9L18.4 30.7V31.4H12.8V30.7L14 29.9V5.6H12.4Z');
  const steel=ctx.createLinearGradient(12.4,0,17.9,0);
  steel.addColorStop(0,'#595d58');
  steel.addColorStop(.38,'#d6d7c9');
  steel.addColorStop(.65,'#92958a');
  steel.addColorStop(1,'#414945');
  ctx.fillStyle=steel;
  ctx.fill(pole);
  ctx.strokeStyle='#20251e';
  ctx.lineWidth=1;
  ctx.stroke(pole);

  image.sharpVector=true;
  images.set(exitFlagShape,image);
}
