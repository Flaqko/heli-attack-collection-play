// Recovered from frame_19/DoAction_2.as projectile callbacks.
export function advanceExplosive(shot, step) {
  const event = {}
  shot.effectClock = (shot.effectClock ?? 0) + step
  if (shot.effectClock > 1 + 1e-9) {
    shot.effectClock -= 1
    shot.effectTick = (shot.effectTick ?? 0) + 1
    const tick = shot.effectTick
    if (shot.weapon === 4) shot.vy += .75
    if (shot.weapon === 5) {
      event.ignite = tick === 3
      if (tick > 3 && tick < 7) {
        shot.vx *= 2
        shot.vy *= 2
      }
      if (tick > 2) event.trail = 'smoke'
    } else if ((shot.weapon === 6 || shot.weapon === 7) && tick % 2 === 0 ||
               shot.weapon === 3 && tick % 4 === 0) {
      event.trail = 'smoke'
    } else if (shot.weapon === 10 && tick % 4 === 0) event.trail = 'flame'
  }
  if (shot.weapon === 4 || shot.weapon === 5) event.spin = shot.vx * step * 4
  return event
}

export function blastProfile(weapon) {
  if (weapon === 10) return {radius: 300, horizontal: 24, vertical: 64, scale: 800}
  if (weapon === 3) return {radius: 50, horizontal: 6, vertical: 12, scale: 50}
  if (weapon === 4) return {radius: 100, horizontal: 9, vertical: 24, scale: 100}
  return {radius: 100, horizontal: 12, vertical: 32, scale: 100}
}
