// Dynamic embedded Arial labels resolve to the supplied SWF's small-text face.
// Authored large Arial fields (font68) retain their separate face.
export function resolveTextFamily(family,data){
 return family==='FlashArial'&&data?.smoothSmallText?'Arial, sans-serif':family;
}
export function textFont(clip){
 const embeddedArial=clip.format?.font==='Arial'&&clip.embedFonts&&!clip.symbol?.fontId;
 const family=embeddedArial?'FlashArial':clip.format?.font||clip.symbol?.fontFamily||'Arial';
 return resolveTextFamily(family,clip.data);
}
export function textStyle(clip){const s=clip.symbol;return {...s,multiline:clip.multiline??s.multiline,wordWrap:clip.wordWrap??s.wordWrap,align:({left:0,right:1,center:2})[clip.format?.align]??s.align};}
export function textLines(text,symbol,measure){
 const paragraphs=String(text??'').replace(/\r\n?/g,'\n').split('\n');
 if(!symbol.multiline)return [paragraphs.join(' ')];
 if(!symbol.wordWrap)return paragraphs;
 const width=Math.max(1,symbol.bounds[2]-(symbol.leftMargin||0)-(symbol.rightMargin||0));
 const lines=[];
 for(const paragraph of paragraphs){let line='';for(const token of paragraph.trimEnd().match(/\S+\s*|\s+/g)||[]){if(line&&measure((line+token).trimEnd())>width){lines.push(line.trimEnd());line='';}for(const char of token){if(line&&measure(line+char)>width){lines.push(line.trimEnd());line='';if(/\s/.test(char))continue;}line+=char;}}lines.push(line.trimEnd());}
 return lines;
}
