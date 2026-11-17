export function bindFullscreen({document,element,button,focusTarget,onChange=()=>{},onError=()=>{}}){
 const supported=document.fullscreenEnabled!==false&&typeof element.requestFullscreen==='function'&&typeof document.exitFullscreen==='function';let pending=false,wasActive=document.fullscreenElement===element;
 function update(){const active=document.fullscreenElement===element;button.textContent=active?'Exit fullscreen':'Fullscreen';button.setAttribute('aria-pressed',String(active));button.disabled=!supported||pending;button.title=supported?'Toggle fullscreen. Escape exits.':'Fullscreen is unavailable in this browser.';}
 function changed(){const active=document.fullscreenElement===element;update();if(active!==wasActive){wasActive=active;onChange(active);focusTarget?.focus();}}
 const click=async()=>{if(!supported||pending)return;pending=true;update();try{if(document.fullscreenElement===element)await document.exitFullscreen();else await element.requestFullscreen();}catch{onError('Fullscreen could not be changed. Please try again.');}finally{pending=false;update();}};
 button.onclick=click;document.addEventListener('fullscreenchange',changed);update();
 return {dispose(){document.removeEventListener('fullscreenchange',changed);if(button.onclick===click)button.onclick=null;}};
}
