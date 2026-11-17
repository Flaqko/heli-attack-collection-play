// The original display map reuses bottom-center foliage in a middle row.
// Enhanced uses the actual middle foliage there, keeping trunk gaps at the base.
// Read the current tile name/map because scrolling recycles and renames clips.
export function resolveSnowTreeImage(clip,bottom,middle){
 const tile=clip._parent;if(tile?.id!==1612||!middle)return bottom;
 const match=/^t_(\d+)_(\d+)$/.exec(tile._name||'');if(!match)return bottom;
 const row=Number(match[1]),column=Number(match[2]),map=tile._parent?.map;
 return map?.[row]?.[column]===110&&map?.[row+1]?.[column]===110?middle:bottom;
}
