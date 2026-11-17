const maxSide=8192;
const maxPixels=16*1024*1024;

export function displayCanvasSize(cssWidth,cssHeight,pixelRatio=1){
  const ratio=Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1;
  const width=Number.isFinite(cssWidth)&&cssWidth>0?cssWidth:1;
  const height=Number.isFinite(cssHeight)&&cssHeight>0?cssHeight:1;
  const requested=Math.min(ratio,maxSide/Math.max(width,height),Math.sqrt(maxPixels/(width*height)));
  // Round physical pixels normally and round down when the safety limit applies.
  const round=requested<ratio?Math.floor:Math.round;
  return {width:Math.max(1,round(width*requested)),height:Math.max(1,round(height*requested))};
}
