import {snapshotArtwork} from '../src/artwork-bitmap.js'
import {paintMain, paintTail} from '../src/helicopter-rotors.js'
import {createArtworkCanvas} from '../src/tile-art.js'

const poses = [117, 121, 125, 127, 129, 132]
const heldWeapons = [81, 84, 86, 88, 90, 92, 94, 96, 98, 100, 102, 104, 106]
const helicopters = [79, 110, 113, 114]

export function prepareParachuteArt(original, repaint) {
  const surface = createArtworkCanvas(repaint.naturalWidth, repaint.naturalHeight)
  const ctx = surface.getContext('2d')
  const {width, height} = surface
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(original, 0, 0, width, height)
  // Keep the Flash silhouette and cord geometry while repainting the canopy.
  ctx.beginPath()
  ctx.rect(0, 0, width, height * 51 / 93)
  ctx.clip()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.drawImage(repaint, 0, 0)
  return snapshotArtwork(surface, {sharpVector: true, remasteredParachute: true})
}

function inkBounds(pixels, stride, x, y, width, height) {
  let left = x + width, right = x - 1, top = y + height, bottom = y - 1
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      if (pixels[(row * stride + col) * 4 + 3] < 24) continue
      left = Math.min(left, col)
      right = Math.max(right, col)
      top = Math.min(top, row)
      bottom = row
    }
  }
  if (left > right || top > bottom) throw Error('Missing sprite artwork')
  return [left, top, right - left + 1, bottom - top + 1]
}

export function prepareProjectileArt(data, images, atlas) {
  // Atlas order follows the two bullet colors, then the explosive projectile variants.
  const ids = [36, 67, 55, 46, 53, 38, 49, 51]
  prepareSpriteArt(data, images, atlas, ids, 4, 2, 'remasteredProjectile', {preserveAlpha: true})
}

export function prepareHudBarArt(data, images, atlas) {
  // Health empty/full, shared long track, Hyper Jump, TimeDistort, and three reload states.
  const ids = [171, 175, 158, 162, 165, 148, 152, 154]
  prepareSpriteArt(data, images, atlas, ids, 4, 2, 'remasteredHudBar', {preserveAlpha: true})
}

export function preparePickupCrateArt(data, images, atlas) {
  // Sprite 221 lists the crate faces in pickup order in the Flash timeline.
  const ids = data.symbols[221].frames.map(([crate]) => crate.id)
  prepareSpriteArt(data, images, atlas, ids, 7, 2, 'remasteredPickupCrate')
}

export function preparePlayerArt(data, images, atlas) {
  prepareSpriteArt(data, images, atlas, poses, 3, 2, 'remasteredPlayer')
}

export function prepareHeldWeaponArt(data, images, atlas) {
  prepareSpriteArt(data, images, atlas, heldWeapons, 4, 4, 'remasteredHeldWeapon')
}

export function prepareHelicopterArt(data, images, atlas, originalBitmaps, crewLayers) {
  const prepared = new Map(images)
  prepareSpriteArt(data, prepared, atlas, helicopters, 2, 2, 'remasteredHelicopter', {
    originals: originalBitmaps,
    preserveAlpha: true,
    preserve(ctx, id, original, width, height) {
      if (id !== 79 && id !== 110) return
      // Keep the Flash rotor mast and tail blur under the animated blades.
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, width, height * .10)
      ctx.ellipse(width * .11, height * .26, width * .10, height * .19, 0, 0, Math.PI * 2)
      ctx.clip()
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(original, 0, 0, width, height)
      ctx.restore()
      ctx.clearRect(0, 0, width, height * 6.5 / 106)
    },
  })
  const completed = helicopters.map(id => {
    const repaint = prepared.get(id)
    const surface = createArtworkCanvas(repaint.width, repaint.height)
    const ctx = surface.getContext('2d')
    ctx.save()
    if (id === 110 || id === 114) {
      ctx.translate(surface.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(repaint, 0, 0)
    ctx.restore()
    const crew = crewLayers.get(id)
    if (crew) ctx.drawImage(crew, 0, 0, surface.width, surface.height)
    return [id, snapshotArtwork(surface, {sharpVector: true, remasteredHelicopter: true})]
  })
  for (const [id, surface] of completed) images.set(id, surface)
}

export function drawHelicopterRotors(ctx, helicopter, phase, motion) {
  const matrix = motion ? motion.matrix(helicopter, helicopter.matrix) : helicopter.matrix
  ctx.save()
  ctx.transform(...matrix)
  if (helicopter._currentframe === 2) ctx.scale(-1, 1)
  ctx.translate(2, -50.5)
  paintMain(ctx, phase, 194)
  ctx.translate(-85, 23)
  paintTail(ctx, phase * 1.5, 32)
  ctx.restore()
}

function prepareSpriteArt(data, images, atlas, ids, columns, rows, flag, {preserve, originals = images, preserveAlpha = false} = {}) {
  const width = atlas.naturalWidth, height = atlas.naturalHeight
  const sheet = createArtworkCanvas(width, height)
  const atlasContext = sheet.getContext('2d')
  atlasContext.drawImage(atlas, 0, 0)
  const pixels = atlasContext.getImageData(0, 0, width, height).data
  const replacements = ids.map((id, index) => {
    const col = index % columns, row = Math.floor(index / columns)
    const x = Math.round(col * width / columns)
    const y = Math.round(row * height / rows)
    const cellWidth = Math.round((col + 1) * width / columns) - x
    const cellHeight = Math.round((row + 1) * height / rows) - y
    const source = inkBounds(pixels, width, x, y, cellWidth, cellHeight)
    if (source[2] >= cellWidth * .94 || source[3] >= cellHeight * .98) {
      throw Error('Repaint crosses an atlas cell boundary')
    }
    const [,, w,h] = data.symbols[id].bounds
    const canvas = createArtworkCanvas(w * 5, h * 5)
    const ctx = canvas.getContext('2d')
    const sourceArt = originals.get(id)
    ctx.drawImage(sourceArt, 0, 0, canvas.width, canvas.height)
    const original = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const target = inkBounds(original, canvas.width, 0, 0, canvas.width, canvas.height)
    if (preserveAlpha) ctx.globalCompositeOperation = 'source-atop'
    else ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(sheet, ...source, ...target)
    ctx.globalCompositeOperation = 'source-over'
    preserve?.(ctx, id, sourceArt, canvas.width, canvas.height)
    return [id, snapshotArtwork(canvas, {sharpVector: true, [flag]: true})]
  })
  for (const [id, canvas] of replacements) images.set(id, canvas)
}
