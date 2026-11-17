// Count complete raw Layer III frames in the supplied exports. Unknown wrappers,
// free-format streams and truncated data deliberately disable automatic windows.
export function rawMp3Duration(bytes){
 let at=0,seconds=0;
 while(at<bytes.length){
  if(at+4>bytes.length||bytes[at]!==255||(bytes[at+1]&224)!==224)return null;
  const version=(bytes[at+1]>>3)&3,layer=(bytes[at+1]>>1)&3,index=bytes[at+2]>>4,rateIndex=(bytes[at+2]>>2)&3;
  if(version===1||layer!==1||index===0||index===15||rateIndex===3)return null;
  const rate=[44100,48000,32000][rateIndex]/(version===3?1:version===2?2:4),bitrate=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[index];
  const length=Math.floor((version===3?144000:72000)*bitrate/rate)+((bytes[at+2]>>1)&1);
  if(length<4||at+length>bytes.length)return null;
  seconds+=(version===3?1152:576)/rate;at+=length;
 }
 return at?seconds:null;
}
export function sourceAudioWindow(buffer,source,rawDuration){
 if(!source||source.format!==2||!Number.isFinite(rawDuration)||rawDuration<=0||!Number.isFinite(buffer.duration)||buffer.duration<=0||!Number.isFinite(buffer.sampleRate)||buffer.sampleRate<=0)return null;
 const {start,frames,sampleRate}=source;
 if(!Number.isInteger(start)||start<0||!Number.isInteger(frames)||frames<=0||!Number.isFinite(sampleRate)||sampleRate<=0)return null;
 const tolerance=2/buffer.sampleRate;
 if(Math.abs(buffer.duration-rawDuration)>tolerance||(start+frames)/sampleRate>buffer.duration)return null;
 return source;
}
