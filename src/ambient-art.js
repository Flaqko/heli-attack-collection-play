import {createArtworkCanvas} from './tile-art.js';

const leaves=[
  [1682,'M3 12.8L5.1 10.9L3.1 8.3L6.9 9.2L5.1 5.8L8.7 7.2L8.5 5.2L11.9 7.3L12.6 5.9L14.3 9L15.4 9.4L15.8 12.3L14.5 14.4L11.8 15.3L8.2 14.8L6.1 13.7Z','M4 12.4Q8 13.5 13.7 11.9M8.8 13Q8.5 10.6 6.8 9M11.4 12.6Q11.3 9.2 9.9 8', '#b0ca3f','#728e20'],
  [1684,'M2.2 8.1L3.1 5.2L5.2 4.1L8.7 3.6L12 4.2L14.8 5.4L16 8.4L15.7 12.1L14.4 13.2L13.3 9.5L12.1 10.6L11.1 15L9.6 14.8L8.3 11L6.6 14.9L4.8 14.5L4 10.4L2.9 11.3Z','M9.1 5.3Q8.5 7.7 9.8 13.7M8.7 7L5.5 10.6M9.3 7L13.5 9.2','#a9c747','#577b22'],
  [1686,'M1.5 10.9L3.7 8.1L3.2 7.4L6 5.5L9.8 4.4L13.2 5.6L16.8 8.6L14.3 9L14.1 10.7L11.1 11L10.4 14.4L8.4 14.9L9 11.3L6.9 12.4L4.7 15.3L4.2 13.1L5.5 10.8L2.8 11.7Z','M3.3 11.2Q7.8 6.5 14.6 8.4M8.2 8.8L6.9 11.9M10.8 8.4L10 12.8','#78aa38','#2c611f'],
];

function drawLeaf(ctx,[,shape,veins,light,dark]){
  const blade=new Path2D(shape);
  const color=ctx.createLinearGradient(5,4,13,15);
  color.addColorStop(0,light);
  color.addColorStop(.7,dark);
  color.addColorStop(1,'#263f17');
  ctx.fillStyle=color;
  ctx.fill(blade);
  ctx.strokeStyle='#172c13';
  ctx.lineJoin='round';
  ctx.lineWidth=.65;
  ctx.stroke(blade);
  ctx.strokeStyle='#dcdf7d9e';
  ctx.lineCap='round';
  ctx.lineWidth=.36;
  ctx.stroke(new Path2D(veins));
}

const snowflakes=[
  [1646,2.85,false,true],
  [1648,2.7,true,true],
  [1650,2.2,false,false,'square'],
  [1652,2.85,false,false],
  [1654,1.3,true,false,'diamond'],
  [1656,2.1,true,true,'diamond'],
];

function drawSnowflake(ctx,[,radius,diamond,filled,grid]){
  ctx.translate(4.5,4.5);
  const glow=ctx.createRadialGradient(0,0,0,0,0,radius+1.35);
  glow.addColorStop(0,'#e6f6ff57');
  glow.addColorStop(.63,'#d6efff37');
  glow.addColorStop(1,'#c9e7ff00');
  ctx.fillStyle=glow;
  ctx.fillRect(-4.5,-4.5,9,9);

  if(grid){
    ctx.fillStyle='#f4fbffe8';
    const rows=filled?2:1,spacing=radius/rows;
    for(let y=-rows;y<=rows;y++){
      for(let x=-rows;x<=rows;x++){
        if(grid==='diamond'&&Math.abs(x)+Math.abs(y)>rows)continue;
        ctx.beginPath();
        ctx.arc(x*spacing,y*spacing,.32,0,Math.PI*2);
        ctx.fill();
      }
    }
    return;
  }

  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.lineWidth=filled?.63:.43;
  ctx.strokeStyle='#f4fbffe6';
  ctx.beginPath();
  if(diamond){
    ctx.moveTo(0,-radius);
    ctx.lineTo(radius,0);
    ctx.lineTo(0,radius);
    ctx.lineTo(-radius,0);
    ctx.closePath();
  }
  for(let i=0;i<4;i++){
    ctx.moveTo(0,0);
    ctx.lineTo(radius,0);
    ctx.rotate(Math.PI/2);
  }
  ctx.stroke();

  ctx.fillStyle='#f8fdfff2';
  for(let i=0;i<4;i++){
    ctx.beginPath();
    ctx.arc(radius*.62,radius*.62,filled?.32:.24,0,Math.PI*2);
    ctx.fill();
    ctx.rotate(Math.PI/2);
  }
  if(filled){
    ctx.beginPath();
    ctx.arc(0,0,radius*.28,0,Math.PI*2);
    ctx.fill();
  }
}

export function prepareAmbientArt(data,images,kind,createCanvas=createArtworkCanvas){
  const frames=kind==='jungle'?leaves:snowflakes;
  const draw=kind==='jungle'?drawLeaf:drawSnowflake;
  const replacements=new Map();
  for(const frame of frames){
    const [id]=frame,[,,width,height]=data.symbols[id].bounds;
    const image=createCanvas(width*6,height*6),ctx=image.getContext('2d');
    ctx.scale(6,6);
    draw(ctx,frame);
    image.sharpVector=true;
    replacements.set(id,image);
  }
  for(const [id,image] of replacements)images.set(id,image);
}
