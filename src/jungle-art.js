import{loadTileArt,loadArtworkImage,createArtworkCanvas}from'./tile-art.js';
export async function loadJungleArt(images,{manifest,loadImage:decode=loadArtworkImage,createCanvas:canvas=createArtworkCanvas,...options}={}){
 if(!manifest){const response=await fetch('assets/enhanced/jungle-art.json');if(!response.ok)throw Error('Jungle registration could not load.');manifest=await response.json();}
 // Prepare the optional backdrop before publishing any tile replacements.
 const source=await decode(manifest.background.path),entry=manifest.background;
 if(source.naturalWidth!==entry.width||source.naturalHeight!==entry.height)throw Error('Jungle background dimensions do not match registration.');
 const background=canvas(1792,1280);background.getContext('2d').drawImage(source,0,0,1792,1280);background.sharpVector=true;background.remasteredJungle=true;
 const count=await loadTileArt(images,{...options,manifest,loadImage:decode,createCanvas:canvas,flag:'remasteredJungle'});
 images.set(entry.id,background);return count+1;
}
