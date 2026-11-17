import{loadRegisteredArt}from'./registered-art.js';
import{decodeVector}from'./startup.js';
import{hudVectors}from'./hud-vectors.js';
// Keep the entire HUD on original artwork if either generated sheets or a panel fails.
export async function loadHudArt(data,images,{decodePanel=svg=>decodeVector(svg,{rasterize:true}),...options}={}){
 const prepared=new Map();
 await loadRegisteredArt(data,prepared,{manifestURL:'assets/enhanced/hud-art.json',kind:'hud',...options});
 const panels=await Promise.all(Object.entries(hudVectors).map(async([id,svg])=>{const image=await decodePanel(svg);image.remasteredHud=true;image.sharpVector=true;return[Number(id),image];}));
 for(const[id,image]of panels)prepared.set(id,image);
 for(const[id,image]of prepared)images.set(id,image);
 return prepared.size;
}
