export function traceTravel(fromX, fromY, toX, toY, contactAt) {
  const dx = toX - fromX
  const dy = toY - fromY
  const samples = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
  for (let i = 1; i <= samples; i++) {
    const x = i === samples ? toX : fromX + dx * i / samples
    const y = i === samples ? toY : fromY + dy * i / samples
    const contact = contactAt(x, y)
    if (contact) return {x, y, contact}
  }
  return {x: toX, y: toY, contact: null}
}
