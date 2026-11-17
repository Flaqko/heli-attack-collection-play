// Browser Gamepad API standard mapping (Xbox layout).
const A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, MENU=9;
const UP=12, DOWN=13, LEFT=14, RIGHT=15;
const BACK_LABELS=new Set(['back','menu','main menu','levelselect','back to players','cancel new player','continue']);

function center(element){
  const {left,top,width,height}=element.getBoundingClientRect();
  return [left+width/2,top+height/2];
}

function navigate(buttons,focused,x,y){
  if(!focused){buttons[0]?.focus();return;}
  const [originX,originY]=center(focused);
  let nearest, opposite, best=Infinity, wrapScore=Infinity;
  for(const button of buttons){
    if(button===focused)continue;
    const [bx,by]=center(button),dx=bx-originX,dy=by-originY;
    const distance=dx*x+dy*y;
    const offset=Math.abs(dx*y-dy*x);
    if(distance < -1 && distance+offset*3 < wrapScore){opposite=button;wrapScore=distance+offset*3;}
    if(distance<=1)continue;
    const score=distance+offset*3;
    if(score<best){nearest=button;best=score;}
  }
  const position=buttons.indexOf(focused);
  const nextInOrder=buttons[(position+x+y+buttons.length)%buttons.length];
  (nearest??opposite??nextInOrder)?.focus();
}

function defaultAimOrigin(root){
  const player=root.player,arm=player?.torso?.arm;
  if(arm&&root.fg)return {x:root.fg._x+player._x+arm._x,y:root.fg._y+player._y+arm._y};
}
export function bindControllerCursor(target){
  const root=target.ownerDocument.documentElement,window=target.ownerDocument.defaultView;
  function hide(){root.classList.add('controller-input');}
  function show(){
    root.classList.remove('controller-input');
    target.classList.remove('controller-aim');
  }
  for(const event of ['pointermove','pointerdown','keydown'])window.addEventListener(event,show,{passive:true});
  if(window.frameElement?.dataset.controllerLaunch==='true')hide();
  return {hide,show};
}

export function createController({game,getGamepads,getLayer,isPlaying,onPause,onMenuPress=()=>{},getAimOrigin=defaultAimOrigin,onConnection=()=>{},onGameplayInput=()=>{},onControllerInput=()=>{},onMenuActivate=target=>target?.click(),waitForConfirmRelease=false}){
  let index=null, previous=[], aim, direction='', repeatAt=0;
  const {root,controllerKeys}=game;
  function clear(){
    controllerKeys.clear();
    game.controllerFire=false;
    game.controllerShot=false;
    aim=undefined;
    direction='';
  }

  function poll(now){
    const pads=Array.from(getGamepads()||[]).filter(pad=>pad?.connected&&pad.mapping==='standard');
    const pad=pads.find(candidate=>candidate.index===index)||pads[0];
    if((pad?.index??null)!==index){
      clear();
      previous=[];
      const wasConnected=index!==null;
      index=pad?.index??null;
      if(wasConnected!==(index!==null))onConnection(index!==null);
    }
    if(!pad)return;
    const heldButtons=pad.buttons.map(button=>button.pressed||button.value>=.35);
    const down=id=>Boolean(heldButtons[id]);
    const pressed=id=>down(id)&&!previous[id];
    if(!down(A))waitForConfirmRelease=false;
    const [leftX=0,leftY=0,rightX=0,rightY=0]=pad.axes;
    if(heldButtons.some((held,id)=>held&&!previous[id]))onControllerInput();

    if(pressed(MENU)&&(isPlaying()||game.paused)){
      clear();
      onPause();
    }else if(pressed(MENU)){
      onMenuPress();
    }else if(isPlaying()){
      controllerKeys.clear();
      const bindings=[
        ['leftKey',leftX<-.32||down(LEFT)],
        ['rightKey',leftX>.32||down(RIGHT)],
        ['upKey',down(A)||down(UP)],
        ['downKey',leftY>.5||down(B)||down(DOWN)],
        ['timeKey',down(LT)],
        ['grenadeKey',down(X)],
        ['specialKey',down(Y)],
        ['switchDownKey',down(LB)],
        ['switchKey',down(RB)],
      ];
      for(const [key,held] of bindings)if(held&&Number.isInteger(root.stats[key]))controllerKeys.add(root.stats[key]);

      const magnitude=Math.hypot(rightX,rightY);
      if(controllerKeys.size||magnitude>.24||down(RT)){onControllerInput();onGameplayInput();}
      if(magnitude>.24)aim=[rightX/magnitude,rightY/magnitude];
      const origin=aim&&getAimOrigin(root);
      if(origin){
        root.pointer.x=origin.x+aim[0]*1000;
        root.pointer.y=origin.y+aim[1]*1000;
      }
      if(!down(RT))game.controllerFire=false;
      if(pressed(RT)){game.controllerFire=true;game.controllerShot=true;}
    }else{
      controllerKeys.clear();
      game.controllerFire=false;
      game.controllerShot=false;
      aim=undefined;
      const layer=getLayer();
      if(layer&&!layer.inert){
        const buttons=[...layer.querySelectorAll('button:not(:disabled), a[href]')].filter(button=>{
          const {width,height}=button.getBoundingClientRect();
          return width>0&&height>0;
        });
        const previousLevel=buttons.find(button=>button.dataset?.levelStep==='previous');
        const nextLevel=buttons.find(button=>button.dataset?.levelStep==='next');
        const levelSelect=Boolean(previousLevel||nextLevel);
        const stepBack=pressed(LB)||pressed(LEFT),stepForward=pressed(RB)||pressed(RIGHT);
        if(levelSelect&&(stepBack||stepForward)){
          const target=stepBack===stepForward?null:stepBack?previousLevel:nextLevel;
          if(target){
            target.click();
            layer.querySelector('[data-menu-action="play"]')?.focus();
          }
          direction='';
          previous=heldButtons;
          return;
        }
        const focused=buttons.find(button=>button===layer.ownerDocument.activeElement);
        const x=Number((!levelSelect&&down(RIGHT))||leftX>.55)-Number((!levelSelect&&down(LEFT))||leftX<-.55);
        const y=Number(down(DOWN)||leftY>.55)-Number(down(UP)||leftY<-.55);
        const nextDirection=x||y?`${x},${y}`:'';
        if(nextDirection&&(nextDirection!==direction||now>=repeatAt)){
          onControllerInput();
          navigate(buttons,focused,y?0:x,y);
          repeatAt=now+(nextDirection===direction?130:340);
        }
        direction=nextDirection;
        if(!waitForConfirmRelease&&pressed(A)){
          const target=buttons.find(button=>button===layer.ownerDocument.activeElement)||buttons[0];
          onMenuActivate(target);
        }
        if(pressed(B)){
          const back=buttons.find(button=>button.dataset?.menuAction==='back')??buttons.find(button=>{
            const label=button.getAttribute('aria-label')||button.textContent||'';
            return BACK_LABELS.has(label.trim().toLowerCase());
          });
          back?.click();
        }
        if(Math.abs(rightY)>.28){
          const region=focused?.closest?.('.cheat-list')||layer.querySelector('[role="region"]');
          region?.scrollBy(0,rightY*12);
        }
      }else direction='';
    }
    previous=heldButtons;
  }
  return {poll,clear,releaseAim(){aim=undefined;}};
}
