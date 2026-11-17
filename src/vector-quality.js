// Bot Arena's bounded supersampling approach, applied only to actual vectors.
function rectangleOnly(svg){
 const paths=[...svg.matchAll(/<path\b[^>]*>/g)];if(paths.length!==1)return false;
 const path=paths[0][0];if(/\bstroke="(?!none")/.test(path))return false;
 const d=path.match(/\bd="([^"]+)"/)?.[1];if(!d||/[^MLZmlz\d.\s,+-]/.test(d)||/[mlz]/.test(d))return false;
 const n=(d.match(/[-+]?\d*\.?\d+/g)||[]).map(Number);if(n.length!==10||n[0]!==n[8]||n[1]!==n[9])return false;
 return new Set(n.filter((_,i)=>i%2===0)).size===2&&new Set(n.filter((_,i)=>i%2===1)).size===2&&[0,2,4,6].every(i=>n[i]===n[i+2]||n[i+1]===n[i+3]);
}
export function prepareVector(svg){
 const unchanged={svg,sharpVector:false};
 if(/<image\b/i.test(svg)||rectangleOnly(svg))return unchanged;
 const tag=svg.match(/<svg\b[^>]*>/)?.[0];if(!tag)return unchanged;
 const dimension=name=>Number(tag.match(new RegExp(`\\b${name}="([\\d.]+)(?:px)?"`))?.[1]),w=dimension('width'),h=dimension('height');
 if(!(w>0&&h>0&&Number.isFinite(w)&&Number.isFinite(h)))return unchanged;
 const view=tag.match(/\bviewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
 if(view&&(view.length!==4||view.some(n=>!Number.isFinite(n))||!(view[2]>0&&view[3]>0)||Math.abs(view[2]/view[3]/(w/h)-1)>1e-9))return unchanged;
 const scale=Math.min(4,2048/Math.max(w,h),Math.sqrt(524288/(w*h))),width=Math.max(1,Math.floor(w*scale)),height=Math.max(1,Math.floor(h*scale));
 let root=tag.replace(/\bwidth="[^"]+"/,`width="${width}"`).replace(/\bheight="[^"]+"/,`height="${height}"`);
 if(!/\bviewBox=/.test(root))root=root.replace(/>$/,` viewBox="0 0 ${w} ${h}">`);
 // Rounded raster dimensions must not introduce SVG aspect-fit padding. Scene
 // rendering maps the complete raster back to the original logical bounds.
 root=/\bpreserveAspectRatio="/.test(root)?root.replace(/\bpreserveAspectRatio="[^"]+"/,'preserveAspectRatio="none"'):root.replace(/>$/,' preserveAspectRatio="none">');
 return {svg:svg.replace(tag,root),sharpVector:true,width,height};
}
