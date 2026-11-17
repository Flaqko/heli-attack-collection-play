const random = (max, rng) => Math.floor(rng() * max)

export function createPatrol(view, player, rng = Math.random) {
  const side = random(3, rng)
  return {
    x: side === 0 ? view.x + view.width / 2 : side === 1 ? view.x - 105 : view.x + view.width + 105,
    y: side === 0 ? view.y - 55 : view.y,
    vx: 0, vy: 0, bank: 0, offset: 0, targetY: player.y - 175,
    ticks: 0, fraction: 0, remaining: 150 + random(100, rng), exit: null,
  }
}

export function stepPatrol(patrol, player, view, step, level, rng = Math.random) {
  patrol.fraction += step
  const move = patrol.fraction >= 1
  if (move) patrol.fraction -= 1
  const outside = patrol.y < view.y || patrol.x < view.x || patrol.x > view.x + view.width
  const beyond = patrol.y < view.y - 105 || patrol.x < view.x - 210 || patrol.x > view.x + view.width + 210
  if (patrol.remaining <= 0 && beyond) return {replace: true, fire: false}

  let targetX = player.x + patrol.offset
  if (patrol.remaining <= 0) {
    patrol.exit ??= random(10, rng)
    if (patrol.exit < 8) targetX = view.x + (patrol.exit < 4 ? -2 : 2) * view.width
    else patrol.targetY = view.y - 350
  } else {
    if (move && patrol.ticks % 75 === 1) patrol.offset = -120 + random(345, rng)
    targetX = Math.max(105, Math.min(view.worldWidth - 105, player.x + patrol.offset))
    if (player.hyperjumped) patrol.targetY = Math.min(view.worldHeight - view.height / 2 - 100, player.y + 2 + random(50, rng))
    else if (move && patrol.ticks % 40 === 1) patrol.targetY = player.y - 48 - 175 + (2 - random(4, rng)) * 10
    if (move && !outside) patrol.remaining--
  }

  const quick = outside || patrol.remaining <= 0
  patrol.vx += (targetX - patrol.x) / (quick ? 100 : 200) * step
  patrol.vy += (patrol.targetY - patrol.y) / (quick ? 20 : 100) * step
  patrol.x += patrol.vx * step
  patrol.y += patrol.vy * step
  if (move) {
    const bank = Math.max(-35, Math.min(35, Math.floor(patrol.vx * .75)))
    patrol.bank = Math.abs(bank) > 2 ? bank : 0
    patrol.vx *= .9
    patrol.vy *= .9
  }
  const fire = move && !beyond && patrol.ticks % Math.max(10, 16 - level) === 1
  if (move) patrol.ticks++
  return {replace: false, fire}
}
