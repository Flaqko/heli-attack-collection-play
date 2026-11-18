const labels = new Map([
  [167, ['Hyper-Jump:', 70]],
  [168, ['TimeDistort:', 72]],
  [169, ['Reload:', 42]],
  [214, ['Health:', 40]],
])
const labelShadows = new Set([139, 140, 141, 146])
const textVariables = new Set(['score', 'highscore', 'time', 'ammo', 'text'])

export function prepareHudText(hud) {
  const fields = []
  for (const clip of [...hud.children.values(), ...hud.powerup.children.values()]) {
    const label = labels.get(clip.id)
    const {variable, color, align, bounds} = clip.symbol
    if (label || labelShadows.has(clip.id) || textVariables.has(variable)) clip._visible = false
    if (label) {
      fields.push({clip, label: label[0], maxWidth: label[1], y: bounds[1] - 1, size: 11})
    } else if (textVariables.has(variable) && color === '#ffffff') {
      const right = align === 1
      fields.push({clip, variable, right, x: bounds[0] + (right ? bounds[2] : 0), y: bounds[1], size: 9})
    }
  }
  return fields
}

export function drawHudText(ctx, fields, highlighted) {
  for (const {clip, label, maxWidth, variable, right, x = 0, y, size} of fields) {
    if (!clip._parent._visible) continue
    const value = label ?? clip._parent[variable] ?? clip.text
    if (value === '') continue
    ctx.save()
    ctx.transform(...clip.globalMatrix)
    ctx.font = `600 ${size}px Arial, sans-serif`
    ctx.textBaseline = 'top'
    ctx.textAlign = right ? 'right' : 'left'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 1.1
    ctx.strokeStyle = '#182028'
    ctx.fillStyle = '#fff'
    ctx.strokeText(value, x, y, maxWidth ?? clip.symbol.bounds[2])
    if (label !== undefined && label === highlighted) {
      const matrix = ctx.getTransform()
      ctx.shadowColor = '#fff'
      ctx.shadowBlur = Math.max(2, Math.hypot(matrix.a, matrix.b) * 2)
    }
    ctx.fillText(value, x, y, maxWidth ?? clip.symbol.bounds[2])
    ctx.restore()
  }
}

export function prepareTitleText(menu) {
  const heading = [...menu.children.values()].find(clip => clip.id === 423)
  const shadow = [...menu.children.values()].find(clip => clip.id === 422)
  heading._visible = shadow._visible = false
  return [
    ['Main menu:', 1], ['Start', 29], ['Controls', 43],
    ['Statistics', 57], ['High Scores', 71], ['Credits', 85], ['Instructions', 99], ['Return', 113],
  ].map(([label, y]) => ({clip: heading, label, y, size: 10.5, maxWidth: 74.5}))
}

export function preparePopupText(popup) {
  for (const field of popup.children.values()) {
    field.setTextFormat({font: 'Arial, sans-serif', size: 9})
  }
}
