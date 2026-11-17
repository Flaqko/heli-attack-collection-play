import {traceTravel} from './heli-attack-2-travel.js'

const tile = 50

export function moveHero(hero, input, solid, worldWidth, step = 1) {
  const {left, right, jump, boost} = input
  hero.motionClock = (hero.motionClock ?? 0) + step
  const sourceTick = hero.motionClock >= 1 - 1e-9
  if (sourceTick) {
    hero.motionClock -= 1
    hero.ducking = Boolean(input.duck)
  }
  const duck = hero.ducking
  const halfWidth = duck ? 10 / 3 : 5
  const bodyHeight = duck ? 28 : 42
  if (sourceTick) {
    const direction = Number(right) - Number(left)
    if (direction && !duck && hero.vx * direction < 5) hero.vx += direction
    if (!direction || (duck && hero.grounded) || Math.abs(hero.vx) > 6) {
      hero.vx -= Math.sign(hero.vx) * Math.min(1, Math.abs(hero.vx))
    }
    hero.boost = Math.min(150, hero.boost + 1)
    const boostReady = boost && hero.boost === 150 && !hero.hyperjumped && hero.jumps < 2
    if (boostReady && !hero.boostHeld) {
      hero.boost = 0
      hero.vy = -32
      hero.jumps++
      hero.hyperjumped = true
      hero.jumpTicks = 0
    } else if (jump && hero.power === 4) {
      hero.jumps = 2
      hero.hyperjumped = true
      hero.jumpTicks = 0
      hero.vy = Math.max(-32, hero.vy - 2)
    } else if (jump) {
      if (!hero.jumpHeld && hero.jumps < 2) {
        hero.jumps++
        hero.jumpTicks = 6
      }
      if (hero.jumpTicks > 0) {
        hero.vy = Math.min(hero.vy, -8)
        hero.jumpTicks--
      }
    } else hero.jumpTicks = 0
    hero.jumpHeld = jump
    hero.boostHeld = boostReady
    hero.vy = Math.max(-tile, Math.min(tile, hero.vy)) + 1
  }

  const nextX = Math.max(halfWidth, Math.min(worldWidth - halfWidth, hero.x + hero.vx * step))
  const leadingX = nextX + Math.sign(hero.vx) * (halfWidth - .01)
  if (!solid(leadingX, hero.y - bodyHeight) && !solid(leadingX, hero.y - 1)) hero.x = nextX
  else hero.vx = 0

  const nextY = hero.y + hero.vy * step
  const offset = hero.vy < 0 ? bodyHeight : 0
  const {y: edge, contact: hits} = traceTravel(hero.x, hero.y - offset, hero.x, nextY - offset,
    (x, y) => solid(x - halfWidth + .01, y) || solid(x + halfWidth - .01, y))
  hero.grounded = hero.vy >= 0 && (hits || (!hero.vy &&
    (solid(hero.x - halfWidth + .01, hero.y + .02) || solid(hero.x + halfWidth - .01, hero.y + .02))))
  if (hero.grounded) {
    if (hits) hero.y = Math.floor(edge / tile) * tile - .01
    hero.jumps = hero.jumpTicks = 0
    hero.hyperjumped = false
  } else if (hits) {
    hero.y = (Math.floor(edge / tile) + 1) * tile + bodyHeight
    hero.jumps = 2
    hero.jumpTicks = 0
  } else {
    hero.y = nextY
    if (hero.vy > 0 && hero.jumps === 0) hero.jumps = 1
  }
  if (hits) hero.vy = 0
  return sourceTick
}
