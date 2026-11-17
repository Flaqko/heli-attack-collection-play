// Use the game's own MD5 routine: its hexadecimal formatting is significant.
export function applyCheat(root,stats,code,cheats){return applyHash(root,stats,root.calcMD5(code.toLowerCase()),cheats);}
export function cheatChoices(root,cheats){
 const levels=(count)=>stats=>stats.levels.slice(0,count).every(Boolean);
 return [
  {id:'infiniteHealth',toggle:'infiniteHealth',label:'Infinite Health',detail:'Enhanced cheat. Stay at full health; toggle on or off.'},
  {id:'infiniteAmmo',toggle:'infiniteAmmo',label:'Infinite Ammo',detail:'Enhanced cheat. Unlimited ammo for unlocked weapons; normal reload speed.'},
  {id:'c7fba0a0efed47872385ffb067ffcff7',label:'Unlock all weapons',detail:'Makes every original weapon available to drop.',unlocked:stats=>stats.guns.every(g=>g.unlocked)},
  {id:'be718e6a09dc819f60e8ffca7a63c93a',label:'Unlock all levels',detail:'Opens the full campaign and Zone X.',unlocked:stats=>stats.levels.every(Boolean)},
  {id:'ce5954a6651760a1dda24a1d94e5f453',label:'Unlock Amazon jungle',detail:'Opens the campaign through Zone 2-1.',unlocked:levels(6)},
  {id:'b6fda32cd7906f2642420dffb2a44e83',label:'Unlock Canyon lands',detail:'Opens the campaign through Zone 3-1.',unlocked:levels(10)},
  {id:'dce3b1ce7579a17a8e771db1947d6f07',label:'Unlock Underground lab',detail:'Opens the campaign through Zone 4-1.',unlocked:levels(14)},
  ...cheats.map(([gun,id])=>({id,label:'Unlock '+root.guns[gun].name,detail:'Makes this weapon available to drop.',unlocked:stats=>stats.guns[gun].unlocked})),
  {id:'da02d13c34e37ac3b7711035d8f9afe2',label:'Show iopred message',detail:'Original creator message; no gameplay effect.'},
  {id:'e61ad40c8597b3804daed1df3872df79',label:'Show DayDream message',detail:'Original creator message; no gameplay effect.'}
 ];
}
export function applyCheatChoice(root,stats,id,cheats){const choice=cheatChoices(root,cheats).find(c=>c.id===id);if(!choice)return '';if(choice.toggle){stats[choice.toggle]=stats[choice.toggle]!==true;return `${choice.label}: ${stats[choice.toggle]?'On':'Off'}`;}return applyHash(root,stats,id,cheats);}
function applyHash(root,stats,hash,cheats){
 const special={da02d13c34e37ac3b7711035d8f9afe2:"iopred - Instigator of Awesomness!\n\t(It's not going to be that easy)",e61ad40c8597b3804daed1df3872df79:"DayDream - Artwizard Extrordinaire!\n\t(It's not going to be that easy)"};if(special[hash])return special[hash];
 if(hash==='c7fba0a0efed47872385ffb067ffcff7'){for(const g of stats.guns)g.unlocked=true;return 'All weapons unlocked\n\t(Retro gaming ftw)';}
 const levels={be718e6a09dc819f60e8ffca7a63c93a:[stats.levels.length,'All levels unlocked\n\t(Gorgatron repellant)'],ce5954a6651760a1dda24a1d94e5f453:[6,'Amazon jungle unlocked\n\t(We’ve got jungle fever, we’re in love)'],b6fda32cd7906f2642420dffb2a44e83:[10,'Canyon lands unlocked\n\t(To keep me from getting to you)'],dce3b1ce7579a17a8e771db1947d6f07:[14,'Underground lab unlocked\n\t(Into our guitars)']};if(levels[hash]){const [n,text]=levels[hash];for(let i=0;i<Math.min(n,stats.levels.length);i++)stats.levels[i]=true;return text;}
 const found=cheats.find(c=>c[1]===hash);if(found){stats.guns[found[0]].unlocked=true;return `${root.guns[found[0]].name} unlocked\n\t(${found[2]})`;}return '';
}
