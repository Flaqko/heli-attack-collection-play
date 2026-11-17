// Wooden crate indices in the Training/Lab foreground tileset.
const crateTiles=new Set([64,65,66]);
const fallTicks=5;
const tileName=(x,y)=>`t_${y}_${x}`;

export function installCrateGravity(root){
  const fallingColumns=new Map();
  const offsets=new Map();
  const breakTile=root.breakTile;
  const isCrate=(x,y)=>crateTiles.has(root.map[y]?.[x])&&Boolean(root.col[y]?.[x]&root.BREAKABLE);
  const empty=(x,y)=>root.col[y]?.[x]===0&&root.map[y]?.[x]===0;

  root.breakTile=(x,y)=>{
    const broken=breakTile(x,y);
    if(broken&&root.tileset==='trainingTiles'&&isCrate(x,y-1)&&!fallingColumns.has(x)){
      fallingColumns.set(x,null);
    }
    return broken;
  };

  function moveCrate(x,y){
    const tile=root.map[y][x],collision=root.col[y][x];
    root.map[y+1][x]=tile;
    root.col[y+1][x]=collision;
    root.map[y][x]=0;
    root.col[y][x]=0;
    root.fg[tileName(x,y)]?.gotoAndStop(1);
    root.fg[tileName(x,y+1)]?.gotoAndStop(tile+1);
  }

  function occupied(x,y){
    const left=x*root.tw,top=y*root.th;
    return [root.player,...root.enemyArr].some(actor=>
      actor&&!actor.removed&&actor._x<left+root.tw&&actor._x+actor.w>left&&
      actor._y<top+root.th&&actor._y+actor.h>top
    );
  }

  return {
    reset(){
      fallingColumns.clear();
      offsets.clear();
      if(root.tileset==='trainingTiles')root.fg.crateFallOffsets=offsets;
    },
    tick(){
      if(!fallingColumns.size)return;
      offsets.clear();
      for(const [x,current] of fallingColumns){
        let drop=current;
        if(!drop||!isCrate(x,drop.y)||!empty(x,drop.y+1)){
          drop=null;
          for(let y=root.h-2;y>=0;y--){
            if(isCrate(x,y)&&empty(x,y+1)){
              drop={y,elapsed:0};
              break;
            }
          }
          if(!drop){fallingColumns.delete(x);continue;}
          fallingColumns.set(x,drop);
        }
        // Wait for actors to clear the landing tile before committing a drop.
        if(occupied(x,drop.y+1)){
          drop.elapsed=0;
          continue;
        }
        drop.elapsed+=root.cSpeed;
        if(drop.elapsed>=fallTicks){
          moveCrate(x,drop.y);
          fallingColumns.set(x,null);
        }else{
          const fraction=drop.elapsed/fallTicks;
          offsets.set(tileName(x,drop.y),root.th*fraction*fraction);
        }
      }
    },
  };
}
