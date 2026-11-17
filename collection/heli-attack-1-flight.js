import {snapshotArtwork} from '../src/artwork-bitmap.js'
import {paintMain} from '../src/helicopter-rotors.js'
import {createArtworkCanvas} from '../src/tile-art.js'

export function keepFlightUpright(matrix) {
  const [a, b, c, d] = matrix
  const roll = Math.atan2(b, a)
  const maxBank = Math.PI / 4
  if (Math.abs(roll) <= maxBank) return
  const bank = Math.max(-maxBank, Math.min(maxBank, Math.asin(Math.sin(roll))))
  const turn = bank - roll
  const cos = Math.cos(turn)
  const sin = Math.sin(turn)
  matrix.splice(0, 4, a * cos - b * sin, a * sin + b * cos, c * cos - d * sin, c * sin + d * cos)
}

export function prepareFlightRotors(symbols, images, createCanvas = createArtworkCanvas) {
  const rotor = symbols[97]
  const width = 210
  const height = 18
  rotor.frames = Array.from({length: 8}, (_, phase) => {
    const id = -100 - phase
    const image = createCanvas(width * 4, height * 4)
    const ctx = image.getContext('2d')
    ctx.translate(image.width / 2, image.height / 2)
    ctx.scale(4, 4)
    paintMain(ctx, phase, width)
    images.set(id, snapshotArtwork(image, {sharpVector: true}))
    symbols[id] = {kind: 'shape', bounds: [-width / 2, -height / 2, width, height]}
    return [{id, depth: 2, matrix: [1, 0, 0, 1, 0, 0]}]
  })
}
