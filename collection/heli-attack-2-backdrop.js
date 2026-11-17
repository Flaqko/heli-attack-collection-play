import {snapshotArtwork} from '../src/artwork-bitmap.js'
import {createArtworkCanvas} from '../src/tile-art.js'

export function prepareArenaBackdrop(backdrop, painting, sourceWidth, sourceHeight) {
  const surface = createArtworkCanvas(1920, 1080)
  const ctx = surface.getContext('2d')
  const bounds = backdrop.getBounds(null)
  ctx.imageSmoothingQuality = 'high'
  ctx.setTransform(surface.width / sourceWidth, 0, 0, surface.height / sourceHeight, 0, 0)
  ctx.drawImage(painting, bounds.xMin, bounds.yMin,
    bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin)
  return snapshotArtwork(surface)
}

export function prepareTitlePainting(original, repaint) {
  const surface = createArtworkCanvas(repaint.naturalWidth, repaint.naturalHeight)
  const ctx = surface.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(surface.width / 452, surface.height / 322)
  ctx.drawImage(original, 0, 0, 452, 322)
  // Keep both original helicopter silhouettes above the badge. Clip the
  // repaint along the plate's dark upper rim, where the layers meet.
  ctx.beginPath()
  ctx.moveTo(0, 129)
  ctx.bezierCurveTo(100, 118, 215, 100, 281, 93)
  ctx.quadraticCurveTo(319, 82, 362, 91)
  ctx.lineTo(452, 114)
  ctx.lineTo(452, 322)
  ctx.lineTo(0, 322)
  ctx.closePath()
  ctx.clip()
  ctx.clearRect(0, 0, 452, 322)
  ctx.drawImage(repaint, 0, 0, 452, 322)
  return snapshotArtwork(surface)
}
