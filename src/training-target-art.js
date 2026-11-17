import {createArtworkCanvas} from './tile-art.js';

const targetFrames=[
  [659,'#ffd3a9'],
  [661,'#ffd7a7'],
  [663,'#ffdda1'],
  [665,'#f8dc93'],
  [667,'#e8ec99'],
  [669,'#e4ff99'],
];

export function prepareTrainingTargetArt(data,images,createCanvas=createArtworkCanvas){
  const replacements=new Map();
  for(const [id,tint] of targetFrames){
    const original=images.get(id);
    if(!original)throw Error('Missing original training target frame '+id);
    const [,,width,height]=data.symbols[id].bounds;
    const image=createCanvas(width*4,height*4),ctx=image.getContext('2d');

    // Retain the original shaded figure and the transparency of each flicker frame.
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(original,0,0,image.width,image.height);
    ctx.globalCompositeOperation='source-atop';

    // Overlay the projected lines in the source frame's own color.
    ctx.scale(4,4);
    const glow=ctx.createRadialGradient(width*.42,height*.37,0,width*.42,height*.37,width*.54);
    glow.addColorStop(0,tint+'30');
    glow.addColorStop(1,tint+'00');
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle=tint;
    ctx.globalAlpha=.34;
    for(let y=4;y<height-3;y+=2)ctx.fillRect(0,y+.25,width,.28);
    ctx.fillStyle='#331c15';
    ctx.globalAlpha=.14;
    for(let y=5;y<height-3;y+=2)ctx.fillRect(0,y+.35,width,.36);

    image.sharpVector=true;
    replacements.set(id,image);
  }

  for(const [id,image] of replacements)images.set(id,image);
}
