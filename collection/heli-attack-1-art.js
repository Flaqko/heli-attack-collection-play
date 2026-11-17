// Light and shade follow the original path boundaries, including the cockpit opening.
const palettes = {
  33: {'#2f97ff': ['#287ad5', '#66bcfa', '#c2e8ff']},
  34: {'#006c00': ['#266143', '#214b3b'], '#009900': ['#599958', '#32754e']},
  36: {'#006c00': ['#30773c', '#123d29'], '#009900': ['#67a84d', '#306e39'], '#009933': ['#449759', '#225936']},
  39: {'#006c00': ['#276232', '#113c23'], '#009900': ['#67ac46', '#247239', '#164f29']},
  92: {
    '#003300': ['#47694a', '#163421'],
    '#006600': ['#759e54', '#427747', '#245335'],
    '#0066ff': ['#b0ddf6', '#4c91c5', '#225b86'],
    '#3399ff': ['#c8edff', '#62aad4'],
    '#666666': ['#9da6a1', '#4a5353'],
    '#999999': ['#dce1d8', '#7a8883'],
  },
  119: {
    '#993300': ['#a8582b', '#66331d'],
    '#cc6600': ['#efad51', '#c97532', '#8a4524'],
    '#ffcc99': ['#ffe3b2', '#d89d6e'],
  },
}

export function enhancedArtwork(id, svg) {
  const palette = Object.hasOwn(palettes, id) && palettes[id]
  if (!palette) return svg
  const gradients = Object.entries(palette).map(([color, stops], index) => {
    const name = `shade-${index}`
    svg = svg.replaceAll(`fill="${color}"`, `fill="url(#${name})"`)
    const gradient = stops.map((stop, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${stop}"/>`).join('')
    return `<linearGradient id="${name}" x2="0" y2="1">${gradient}</linearGradient>`
  })
  return svg.replace(/<svg\b[^>]*>/, root => root + `<defs>${gradients.join('')}</defs>`)
}
