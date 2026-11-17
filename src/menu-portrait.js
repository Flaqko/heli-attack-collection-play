import {createArtworkCanvas,loadArtworkImage} from './tile-art.js';

const portraitShape=6;
const healthyPortrait=[1799,183,307,361];

export async function loadMenuPortrait(data,images){
  const atlas=await loadArtworkImage('assets/enhanced/hud-portraits-v1.png');
  const [,,width,height]=data.symbols[portraitShape].bounds;
  const image=createArtworkCanvas(width*6,height*6),ctx=image.getContext('2d');
  ctx.scale(image.width/66,image.height/66);

  ctx.fillStyle='#39492e';
  ctx.fillRect(0,0,66,66);
  ctx.fillStyle='#687b527c';
  for(let row=0;row<13;row++){
    for(let column=0;column<13;column++){
      const x=3+column*5,y=3+row*5;
      ctx.fillRect(x-1.45,y-.47,2.9,.94);
      ctx.fillRect(x-.47,y-1.45,.94,2.9);
    }
  }
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(atlas,...healthyPortrait,6,1,55,65);

  ctx.strokeStyle='#9ba88a';
  ctx.lineWidth=.9;
  ctx.strokeRect(.52,.52,64.96,64.96);
  image.sharpVector=true;
  images.set(portraitShape,image);
}
