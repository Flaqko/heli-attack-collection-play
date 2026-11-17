import {Clip} from '../src/scene.js'

// Rasterize only the authored hit symbol. Transform the test point into that
// symbol's local coordinates, preserving rotation, mirroring and nested poses.
export function createShapeCollision(data, images) {
  const masks = new Map()
  return (clip, x, y) => {
    if (!clip) return false
    const p = {x, y}
    clip.globalToLocal(p)
    const key = clip.id + ':' + clip._currentframe
    let mask = masks.get(key)
    if (!mask) {
      const copy = new Clip(data, clip.id)
      copy.gotoAndStop(clip._currentframe)
      const b = copy.bounds()
      const left = Math.floor(b.xMin), top = Math.floor(b.yMin)
      const width = Math.max(1, Math.ceil(b.xMax) - left)
      const height = Math.max(1, Math.ceil(b.yMax) - top)
      const canvas = document.createElement('canvas')
      canvas.width = width * 2
      canvas.height = height * 2
      const context = canvas.getContext('2d', {willReadFrequently: true})
      context.setTransform(2,0,0,2,-left*2,-top*2)
      copy.render(context, images)
      mask = {left,top,width:canvas.width,height:canvas.height,pixels:context.getImageData(0,0,canvas.width,canvas.height).data}
      masks.set(key,mask)
    }
    const px = Math.floor((p.x-mask.left)*2), py = Math.floor((p.y-mask.top)*2)
    return px >= 0 && py >= 0 && px < mask.width && py < mask.height && mask.pixels[(py*mask.width+px)*4+3] > 0
  }
}
