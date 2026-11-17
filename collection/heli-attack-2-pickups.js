// Source powerupFrame: age starts on landing; cycling/gravity use world time.
export function stepPickup(d, step, solid, halfHeight) {
  d.clock = (d.clock ?? 0) + step
  if (d.clock > 1 + 1e-9) {
    d.clock -= 1
    d.vy = d.falling ? d.vy + 1 : 2
    if (d.cycling) d.type = d.type % 13 + 1
  }
  const bottom = d.y + halfHeight
  if (!d.landed) {
    d.y += d.vy * step
    if (d.falling) {
      d.chute = Math.max(0, d.chute - 10 * step)
      if (solid(d.x, bottom)) {
        const floor = Math.floor(bottom / 50) * 50
        if (d.vy < 4) {
          d.y = floor - halfHeight + 2
          d.landed = true
        } else {
          d.y = floor - halfHeight - 2
          d.vy *= -.25
          d.y += d.vy * step
        }
      }
    } else {
      d.chute = Math.min(100, d.chute + 10 * step)
      if (solid(d.x, d.y + 150)) d.falling = true
    }
  } else d.ticks++
  d.alpha = Math.max(0, Math.min(100, (500 - d.ticks) * 2))
  d.expired = d.ticks >= 500
}
