// Biomes independently wait for common assets and share their own requests.
export function createLevelArtworkLoader(baseReady,loadJungle,loadCanyon,loadTraining,loadSnow){let jungleReady,canyonReady,trainingReady,snowReady;return level=>(level===0||level>=13)?(trainingReady??=baseReady.then(loadTraining)):level>=9?(canyonReady??=baseReady.then(loadCanyon)):level>=5?(jungleReady??=baseReady.then(loadJungle)):loadSnow?(snowReady??=baseReady.then(loadSnow)):baseReady;}
// A shared readiness promise can finish after the player selects another biome.
export const artworkBiome=level=>(level===0||level>=13)?'laboratory':level>=9?'canyon':level>=5?'jungle':'snow';
export function createArtworkStatus(selectedLevel,publish){return(level,text,error=false)=>{if(artworkBiome(level)===artworkBiome(selectedLevel()))publish(text,error);};}
