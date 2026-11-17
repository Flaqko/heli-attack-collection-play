// Flash samples the beam in projectile-speed increments, including through terrain.
export function beamHits(shot, bounds, hitTest) {
  let {x, y} = shot
  while (x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom) {
    x += shot.vx
    y += shot.vy
    if (hitTest(x, y)) return true
  }
  return false
}
