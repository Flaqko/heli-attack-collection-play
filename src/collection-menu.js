import {bindMenuHighlight} from './menu-highlight.js'
import {collectionPreferences} from './collection-preferences.js'

export function createFullscreenAction(element, onChange = () => {}) {
  const touchScreen = window.matchMedia('(any-pointer: coarse)')
  const portrait = window.matchMedia('(orientation: portrait)')
  const orientation = window.screen.orientation
  const status = document.createElement('div')
  status.className = 'landscape-fullscreen-status'
  status.hidden = true
  const tap = document.createElement('button')
  tap.type = 'button'
  tap.textContent = 'Tap for landscape'
  const hint = document.createElement('span')
  hint.textContent = 'You can also rotate your phone.'
  status.append(tap, hint)
  element.append(status)

  let locked = false
  let entering = false
  const active = () => document.fullscreenElement === element || element.classList.contains('viewport-fullscreen')
  const canEnterNative = () => document.fullscreenEnabled && typeof element.requestFullscreen === 'function'

  function update() {
    if (!active() && locked) {
      orientation.unlock?.()
      locked = false
    }
    tap.hidden = !canEnterNative() || document.fullscreenElement === element
    hint.textContent = tap.hidden ? 'Rotate your phone for landscape.' : 'You can also rotate your phone.'
    status.hidden = !active() || !touchScreen.matches || !portrait.matches
    onChange()
  }

  async function enter() {
    if (entering) return
    entering = true
    try {
      if (!document.fullscreenElement && canEnterNative() && navigator.userActivation?.isActive !== false) {
        try {
          await element.requestFullscreen()
          element.classList.remove('viewport-fullscreen')
        } catch {
          // Some browsers require a tap to enter native fullscreen.
        }
      }
      if (document.fullscreenElement !== element) element.classList.add('viewport-fullscreen')
      if (touchScreen.matches && typeof orientation?.lock === 'function') {
        try {
          await orientation.lock('landscape')
          locked = true
        } catch {
          // Keep the viewport available for phones that rely on device rotation.
        }
      }
    } finally {
      entering = false
      update()
    }
  }

  async function toggle() {
    if (entering) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else if (active()) {
      element.classList.remove('viewport-fullscreen')
      update()
    } else {
      await enter()
    }
  }

  tap.addEventListener('click', enter)
  for (const query of [touchScreen, portrait]) query.addEventListener('change', update)
  document.addEventListener('fullscreenchange', update)
  return {active, toggle}
}

export function createCollectionMenu(element, {onExit, fullscreenAction, credits} = {}) {
  const shell = window.frameElement?.hasAttribute('data-collection-player') ? window.parent : null
  const localFullscreen = fullscreenAction ?? (shell?.collectionFullscreen ? null : createFullscreenAction(element))
  const fullscreen = () => document.fullscreenElement && shell
    ? {active: () => true, toggle: () => document.exitFullscreen()}
    : shell?.collectionFullscreen ?? localFullscreen
  const sound = collectionPreferences().sound
  const dialog = document.createElement('dialog')
  dialog.className = 'collection-quick-menu'
  dialog.setAttribute('aria-label', 'Game menu')

  const actions = document.createElement('div')
  dialog.append(actions)

  function addButton(label, callback, group = actions) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', callback)
    group.append(button)
    bindMenuHighlight(dialog, button)
    return button
  }

  const fullscreenButton = window.HeliAndroid ? null : addButton('Fullscreen', () => {
    dialog.close()
    fullscreen().toggle().catch(error => console.warn('Fullscreen could not change.', error))
  })
  const soundButton = addButton('Sound', () => sound.set(!sound.get()))
  const syncSound = enabled => {
    soundButton.textContent = enabled ? 'Sound on' : 'Sound off'
    soundButton.setAttribute('aria-pressed', String(enabled))
  }
  syncSound(sound.get())
  sound.subscribe(() => syncSound(sound.get()))
  if (onExit) addButton('Exit Game', () => {
    dialog.close()
    onExit()
  })
  addButton('Back', () => dialog.close()).dataset.menuAction = 'back'
  if (credits) {
    const panel = document.createElement('section')
    panel.className = 'collection-credits'
    panel.hidden = true
    panel.append(credits.cloneNode(true))
    const creditsButton = addButton('Credits', () => {
      actions.hidden = true
      panel.hidden = false
      dialog.setAttribute('aria-label', 'Credits')
      back.focus()
    })
    const back = addButton('Back', () => {
      panel.hidden = true
      actions.hidden = false
      dialog.setAttribute('aria-label', 'Game menu')
      creditsButton.focus()
    }, panel)
    back.dataset.menuAction = 'back'
    dialog.append(panel)
    dialog.addEventListener('close', () => {
      panel.hidden = true
      actions.hidden = false
      dialog.setAttribute('aria-label', 'Game menu')
    })
  }
  if (credits && window.HeliAndroid) addButton('Exit App', () => window.HeliAndroid.exitApp())
  document.body.append(dialog)
  return {
    element: dialog,
    get open() { return dialog.open },
    toggle() {
      if (dialog.open) {
        dialog.close()
        return
      }
      if (fullscreenButton) fullscreenButton.textContent = fullscreen().active() ? 'Exit fullscreen' : 'Fullscreen'
      dialog.showModal()
      const firstButton = fullscreenButton ?? soundButton
      firstButton.focus()
    },
  }
}
