export const defaults = Object.freeze({
  left: 'KeyA', right: 'KeyD', jump: 'KeyW', duck: 'KeyS',
  boost: 'Space', time: 'ShiftLeft', switch: 'KeyQ', pause: 'KeyP', endRun: 'KeyK', sound: 'KeyM',
})
export const labels = {
  left: 'Move left', right: 'Move right', jump: 'Jump', duck: 'Duck',
  boost: 'Hyperjump', time: 'Bullet Time', switch: 'Switch weapon', pause: 'Pause', endRun: 'End run', sound: 'Sound toggle',
}
const aliases = {left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', duck: 'ArrowDown', time: 'ShiftRight'}
export const allowedKey = code => typeof code === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right))$/.test(code)
export function readBindings(raw) {
  try {
    const saved = JSON.parse(raw)
    for (const action of ['endRun', 'sound']) {
      if (!saved || saved[action] !== undefined) continue
      const used = Object.values(saved)
      saved[action] = [defaults[action], ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => 'Key' + letter)]
        .find(code => !used.includes(code))
    }
    const codes = Object.keys(defaults).map(action => saved?.[action])
    if (codes.every(allowedKey) && new Set(codes).size === codes.length) {
      return Object.fromEntries(Object.keys(defaults).map((action, i) => [action, codes[i]]))
    }
  } catch {}
  return {...defaults}
}
export function keyboardAction(bindings, code) {
  return Object.keys(defaults).find(action => bindings[action] === code) ??
    Object.keys(aliases).find(action => bindings[action] === defaults[action] && aliases[action] === code)
}
export function keyLabel(code) {
  return code.replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Left Shift').replace('ShiftRight', 'Right Shift').replace(/^Arrow/, '')
}
