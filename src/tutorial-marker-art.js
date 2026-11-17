import {createArtworkCanvas} from './tile-art.js';

const markerShape=672;

function fill(ctx,path,color){
  ctx.fillStyle=color;
  ctx.fill(new Path2D(path));
}

export function prepareTutorialMarkerArt(data,images,createCanvas=createArtworkCanvas){
  const [,,width,height]=data.symbols[markerShape].bounds;
  const image=createCanvas(width*4,height*4),ctx=image.getContext('2d');
  ctx.scale(image.width/32,image.height/32);
  ctx.lineJoin='round';

  const beam=ctx.createLinearGradient(0,3,0,25);
  beam.addColorStop(0,'#36ff1b00');
  beam.addColorStop(.42,'#2cce1f60');
  beam.addColorStop(1,'#39f31aaf');
  fill(ctx,'M4 4Q16 1 28 4L20.4 24.9H11.6Z',beam);
  const halo=ctx.createRadialGradient(16,11,2,16,11,13);
  halo.addColorStop(0,'#48f82080');
  halo.addColorStop(.64,'#36ec2870');
  halo.addColorStop(1,'#25d32200');
  ctx.fillStyle=halo;
  ctx.fillRect(0,0,32,24);

  const question='M9.3 8.8C9.6 5.1 12.2 3.2 16 3.2C20 3.2 22.2 5.3 22.2 8.3C22.2 10.5 20.9 11.5 19.3 12.4C18.1 13.1 17.7 13.5 17.6 14.2H13.4C13.4 12.4 14.3 11.3 16 10.3C17.4 9.4 17.8 9 17.8 8.1C17.8 7.2 17.1 6.7 16 6.7C14.6 6.7 13.9 7.5 13.8 8.8ZM13.4 15.4H17.7V20H13.4Z';
  ctx.save();
  ctx.shadowColor='#59ff24';
  ctx.shadowBlur=9;
  fill(ctx,question,'#66ff23');
  ctx.restore();
  const glyph=ctx.createLinearGradient(0,3,0,20);
  glyph.addColorStop(0,'#8bff34');
  glyph.addColorStop(1,'#43f31e');
  fill(ctx,question,glyph);

  fill(ctx,'M7 30.2V27.6L10.2 24.3H21.7L25 27.6V30.2L23.8 31H8.2Z','#1a1c20');
  const steel=ctx.createLinearGradient(0,24.8,0,30);
  steel.addColorStop(0,'#eef0ee');
  steel.addColorStop(.42,'#9da2a6');
  steel.addColorStop(1,'#46484a');
  fill(ctx,'M8 29.9V28L10.8 25.1H21.1L24 28V29.9Z',steel);
  fill(ctx,'M11 25.2H12.1L12.7 29.9H11.4ZM19.8 25.2H21L20.8 29.9H19.5Z','#292c2e');
  fill(ctx,'M11.2 24.3Q16 23.2 20.8 24.3L20 25.4H12Z','#60ff23');
  fill(ctx,'M13 24.1H19L18.5 24.6H13.5Z','#bdff70');

  image.sharpVector=true;
  image.remasteredTutorialMarker=true;
  images.set(markerShape,image);
}
