import {collectionPreferences} from './collection-preferences.js'

export function bindFpsShortcut() {
  const preference = collectionPreferences().fps
  window.addEventListener('keydown', event => {
    if (event.code !== 'F3' || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    event.preventDefault()
    if (event.repeat) return
    preference.set(!preference.get())
  })
}

export function mountFpsCounter(stage) {
  const counter = document.createElement('span')
  counter.className = 'fps-counter'
  const preference = collectionPreferences().fps
  counter.hidden = !preference.get()
  counter.textContent = '— FPS'
  stage.append(counter)

  let sampleStart
  let frames = 0
  function resetSample() {
    sampleStart = undefined
    frames = 0
  }

  bindFpsShortcut()
  preference.subscribe(visible => {
    counter.hidden = !visible
    counter.textContent = '— FPS'
    resetSample()
  })
  document.addEventListener('visibilitychange', resetSample)

  return now => {
    if (counter.hidden || document.hidden) return
    if (sampleStart === undefined) {
      sampleStart = now
      return
    }
    frames++
    const duration = now - sampleStart
    if (duration < 500) return
    counter.textContent = Math.round(frames * 1000 / duration) + ' FPS'
    sampleStart = now
    frames = 0
  }
}
