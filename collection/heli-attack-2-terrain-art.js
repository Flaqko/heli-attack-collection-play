import {snapshotArtwork} from '../src/artwork-bitmap.js'
import {createArtworkCanvas} from '../src/tile-art.js'

export const terrainShapeIds = [305, 307, 309, 312, 315, 317]
const mirrored = new Map([[310, 309], [313, 312]])

export function prepareTerrainArt(entries, images, atlas) {
  const size = atlas.naturalWidth / 3
  if (!Number.isInteger(size) || atlas.naturalHeight !== size * 2) {
    throw Error('Invalid foreground terrain atlas')
  }
  const replacements = new Map()
  for (const [index, id] of terrainShapeIds.entries()) {
    const surface = createArtworkCanvas(size, size)
    const ctx = surface.getContext('2d')
    ctx.imageSmoothingEnabled = false
    const gutter = size / 52
    // Each 52px Flash tile has an empty 1px border around its 50px cell.
    ctx.drawImage(images.get(id), 1, 1, 50, 50, gutter, gutter, gutter * 50, gutter * 50)
    // Keep the original transparency along exposed rock edges.
    ctx.globalCompositeOperation = 'source-atop'
    ctx.drawImage(atlas, index % 3 * size, Math.floor(index / 3) * size,
      size, size, 0, 0, size, size)
    replacements.set(id, surface)
  }
  for (const [id, source] of mirrored) {
    const surface = createArtworkCanvas(size, size)
    const ctx = surface.getContext('2d')
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(replacements.get(source), 0, 0)
    replacements.set(id, surface)
  }
  return composeTileLayer(entries, replacements, size)
}

export const foliageShapeIds = [22, 24]

export function prepareFoliageArt(entries, bitmaps, atlas) {
  const size = atlas.naturalHeight
  if (atlas.naturalWidth !== size * foliageShapeIds.length) {
    throw Error('Invalid background foliage atlas')
  }
  const gutter = size / 52
  const paintedTiles = new Map()
  for (const [index, id] of foliageShapeIds.entries()) {
    const surface = createArtworkCanvas(size, size)
    const ctx = surface.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(bitmaps.get(id), 1, 1, 50, 50, gutter, gutter, gutter * 50, gutter * 50)

    // Fade to the original colors where the crown and trunk tiles connect.
    const painting = createArtworkCanvas(size, size)
    const paint = painting.getContext('2d')
    paint.drawImage(atlas, index * size, 0, size, size, 0, 0, size, size)
    paint.globalCompositeOperation = 'destination-in'
    const fade = paint.createLinearGradient(0, 0, 0, size)
    fade.addColorStop(0, index === 0 ? '#000' : '#0000')
    fade.addColorStop(.07, '#000')
    fade.addColorStop(.93, '#000')
    fade.addColorStop(1, '#0000')
    paint.fillStyle = fade
    paint.fillRect(0, 0, size, size)

    ctx.globalCompositeOperation = 'source-atop'
    ctx.drawImage(painting, 0, 0)
    paintedTiles.set(id, surface)
  }
  return composeTileLayer(entries, paintedTiles, size)
}

function composeTileLayer(entries, replacements, size) {
  const left = Math.min(...entries.map(({x}) => x))
  const top = Math.min(...entries.map(({y}) => y))
  const width = Math.max(...entries.map(({x}) => x)) + 52 - left
  const height = Math.max(...entries.map(({y}) => y)) + 52 - top
  const scale = size / 52
  const surface = createArtworkCanvas(width * scale, height * scale)
  const ctx = surface.getContext('2d')
  for (const {x, y, clip} of entries) {
    const shape = clip.children.values().next().value
    ctx.drawImage(replacements.get(shape.id), (x - left) * scale, (y - top) * scale)
  }
  return {surface: snapshotArtwork(surface), left, top, width, height, tiles: replacements}
}
