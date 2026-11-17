import{loadTileArt,loadArtworkImage,createArtworkCanvas}from'./tile-art.js';
export async function loadCanyonArt(images,{manifest,loadImage:decode=loadArtworkImage,createCanvas:canvas=createArtworkCanvas,...options}={}){
 if(!manifest){const response=await fetch('assets/enhanced/canyon-art.json');if(!response.ok)throw Error('Canyon registration could not load.');manifest=await response.json();}
 const entry=manifest.background,source=await decode(entry.path);
 if(source.naturalWidth!==entry.width||source.naturalHeight!==entry.height)throw Error('Canyon background dimensions do not match registration.');
 // Shape289 has authored452x322 bounds, including its original edge coverage.
 const background=canvas(1808,1288);background.getContext('2d').drawImage(source,0,0,1808,1288);background.sharpVector=true;background.remasteredCanyon=true;
 const count=await loadTileArt(images,{...options,manifest,loadImage:decode,createCanvas:canvas,flag:'remasteredCanyon'});
 images.set(entry.id,background);return count+1;
}
