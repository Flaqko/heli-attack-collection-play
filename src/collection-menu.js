import {bindMenuHighlight} from './menu-highlight.js'
import {collectionPreferences} from './collection-preferences.js'

export function createFullscreenAction(element, onChange = () => {}) {
  const active = () => document.fullscreenElement === element || element.classList.contains('viewport-fullscreen')
  async function toggle() {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    if (active()) {
      element.classList.remove('viewport-fullscreen')
    } else {
      if (document.fullscreenEnabled && navigator.userActivation?.isActive !== false) {
        try {
          await element.requestFullscreen()
          return
        } catch {
          // Controller input and some mobile browsers require a viewport fallback.
        }
      }
      element.classList.add('viewport-fullscreen')
    }
    onChange()
  }
  document.addEventListener('fullscreenchange', onChange)
  return {active, toggle}
}

export function createCollectionMenu(element, {onExit, fullscreenAction} = {}) {
  const shell = window.frameElement?.hasAttribute('data-collection-player') ? window.parent : null
  const localFullscreen = fullscreenAction ?? (shell?.collectionFullscreen ? null : createFullscreenAction(element))
  const fullscreen = () => document.fullscreenElement && shell
    ? {active: () => true, toggle: () => document.exitFullscreen()}
    : shell?.collectionFullscreen ?? localFullscreen
  const sound = collectionPreferences().sound
  const dialog = document.createElement('dialog')
  dialog.className = 'collection-quick-menu'
  dialog.setAttribute('aria-label', 'Game menu')

  function addButton(label, callback) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', callback)
    dialog.append(button)
    bindMenuHighlight(dialog, button)
    return button
  }

  const fullscreenButton = addButton('Fullscreen', () => {
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
  document.body.append(dialog)
  return {
    element: dialog,
    get open() { return dialog.open },
    toggle() {
      if (dialog.open) {
        dialog.close()
        return
      }
      fullscreenButton.textContent = fullscreen().active() ? 'Exit fullscreen' : 'Fullscreen'
      dialog.showModal()
      fullscreenButton.focus()
    },
  }
}
