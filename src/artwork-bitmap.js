// Resolve deferred canvas draws before the artwork reaches the gameplay renderer.
export function snapshotArtwork(surface,flags){
 let bitmap=surface;
 try{bitmap=surface.transferToImageBitmap?.()??surface;}
 catch{} // The painted canvas still works on browsers without bitmap transfer.
 return Object.assign(bitmap,flags);
}
