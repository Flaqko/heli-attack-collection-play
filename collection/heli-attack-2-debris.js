// Source callbacks shardFrame, guyFall and heliFall (frame_19/DoAction_2.as).
export function stepDebris(d, step, solid) {
  const event = {bounces: 0, remove: false, crash: false}
  d.clock = (d.clock ?? 0) + step
  if (d.kind === 'shard' ? d.clock > 1 + 1e-9 : d.clock >= 1 - 1e-9) {
    d.vy++
    d.clock -= 1
  }
  if (d.kind === 'wreck') {
    d.rotation += (d.vx > 0 ? 1 : -1) * d.vy * step / 4
    d.x += d.vx * step
    d.y += d.vy * step
    event.crash = solid(d.x, d.y)
    event.remove = event.crash
    return event
  }
  d.rotation += (d.kind === 'shard' ? d.vx * 4 : Math.abs(d.vx + d.vy)) * step
  if (solid(d.x + d.vx * step, d.y)) {
    d.vx *= -.5
    event.bounces++
  } else d.x += d.vx * step
  if (solid(d.x, d.y + d.vy * step)) {
    event.bounces++
    if (d.kind === 'pilot') {
      event.remove = d.vy < 4
      d.vy *= -.2
    } else {
      d.vy *= -.5
      d.bounces++
      event.remove = d.bounces >= 3
    }
  } else d.y += d.vy * step
  return event
}
