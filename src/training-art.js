import {snapshotArtwork} from './artwork-bitmap.js';
import{loadTileArt,loadArtworkImage,createArtworkCanvas}from'./tile-art.js';
export async function loadTrainingArt(images,{manifest,loadImage:decode=loadArtworkImage,createCanvas:canvas=createArtworkCanvas,...options}={}){
 if(!manifest){const response=await fetch('assets/enhanced/training-art.json');if(!response.ok)throw Error('Training registration could not load.');manifest=await response.json();}
 const entry=manifest.background,source=await decode(entry.path);
 if(source.naturalWidth!==entry.width||source.naturalHeight!==entry.height)throw Error('Training background dimensions do not match registration.');
 // Shape286 has authored448x320 bounds, including its original edge coverage.
 const surface=canvas(1792,1280);surface.getContext('2d').drawImage(source,0,0,1792,1280);
 const background=snapshotArtwork(surface,{sharpVector:true,remasteredTraining:true});
 const count=await loadTileArt(images,{...options,manifest,loadImage:decode,createCanvas:canvas,flag:'remasteredTraining'});
 images.set(entry.id,background);return count+1;
}
