export async function loadVectorPack(url='data/vector-assets.json.gz'){const response=await fetch(url);if(!response.ok)throw Error('Vector pack could not load.');return new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).json();}
export function vectorURL(svg){return URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));}
