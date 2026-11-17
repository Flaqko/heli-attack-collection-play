import {createCollectionMenu, createFullscreenAction} from '../src/collection-menu.js'
import {bindControllerCursor, createController} from '../src/controller.js'
import {bindMenuHighlight} from '../src/menu-highlight.js'
import {collectionPreferences} from '../src/collection-preferences.js'
import {bindFpsShortcut} from '../src/fps-counter.js'

bindFpsShortcut()

const collection = document.querySelector('.collection')
const menuButton = document.querySelector('#collection-menu')
const picker = document.querySelector('.games')
const player = document.querySelector('#collection-player')
const frame = player.querySelector('iframe')
const loader = player.querySelector('#collection-loading')
const loadingMessage = loader.querySelector('#collection-loading-message')
const retry = loader.querySelector('#collection-retry')
const spinner = loader.querySelector('.collection-spinner')
const loadingDelay = 250
const links = [...document.querySelectorAll('[data-game]')]
const titles = {
  'heli-attack-1': {name: 'Heli Attack 1', page: 'heli-attack-1.html?v=ha1-startup-2'},
  'heli-attack-2': {name: 'Heli Attack 2', page: 'heli-attack-2.html'},
  'heli-attack-3': {name: 'Heli Attack 3', page: '../index.html'},
}
let active
let sizeObserver
let resizeFrame
let loadObserver
let opening
let introAudio
function releaseIntroAudio() {
  introAudio?.context.close().catch(() => {})
  introAudio = undefined
}

function prepareIntroAudio(game) {
  if (!game || game === titles['heli-attack-1'] || active === game || !collectionPreferences().sound.get()) return
  try {
    releaseIntroAudio()
    const context = new AudioContext()
    introAudio = {game, context}
    context.resume().catch(() => {})
  } catch {}
}

for (const link of links) {
  if (picker.contains(link)) bindMenuHighlight(picker, link)
  link.addEventListener('click', event => {
    if (!event.isTrusted || event.defaultPrevented || event.ctrlKey || event.metaKey ||
        event.altKey || event.shiftKey) return
    delete frame.dataset.controllerLaunch
    prepareIntroAudio(titles[link.dataset.game])
  })
}

const fullscreenAction = createFullscreenAction(collection, () => resizeFrame?.())
window.collectionFullscreen = fullscreenAction
const quickMenu = createCollectionMenu(collection, {
  fullscreenAction,
  credits: document.querySelector('#collection-credits').content,
})
quickMenu.element.id = 'collection-quick-menu'
function toggleMenu() {
  quickMenu.toggle()
  menuButton.setAttribute('aria-expanded', String(quickMenu.open))
}
menuButton.addEventListener('click', toggleMenu)
quickMenu.element.addEventListener('close', () => {
  menuButton.setAttribute('aria-expanded', String(quickMenu.open))
})
const cursor = bindControllerCursor(picker)
const controller = createController({
  game: {root: {}, controllerKeys: new Set()},
  getGamepads: () => {
    try { return navigator.getGamepads?.() } catch { return [] }
  },
  getLayer: () => picker.hidden ? null : quickMenu.open ? quickMenu.element : picker,
  onMenuPress: () => { if (!picker.hidden) toggleMenu() },
  isPlaying: () => false,
  onControllerInput: () => { if (!picker.hidden) cursor.hide() },
  onConnection: connected => { if (!connected) cursor.show() },
  onMenuActivate: link => {
    if (!link) return
    if (quickMenu.open) { link.click(); return }
    if (navigator.userActivation?.hasBeenActive) prepareIntroAudio(titles[link.dataset.game])
    frame.dataset.controllerLaunch = 'true'
    location.hash = link.dataset.game
  },
})

function pollController(now) {
  if (!document.hidden) controller.poll(now)
  requestAnimationFrame(pollController)
}
requestAnimationFrame(pollController)

window.getCollectionIntroAudioContext = gameDocument =>
  introAudio?.game === active && frame.contentDocument === gameDocument ? introAudio?.context : undefined

function openGame(game) {
  resizeFrame = undefined
  sizeObserver?.disconnect()
  loadObserver?.disconnect()
  clearTimeout(opening?.timer)
  loader.hidden = true
  retry.hidden = true
  spinner.hidden = false
  loadingMessage.textContent = ''
  frame.style.removeProperty('height')
  frame.title = game?.name ?? 'Heli Attack'
  frame.inert = Boolean(game)
  if (!game) {
    delete frame.dataset.controllerLaunch
    opening = undefined
    frame.contentWindow.location.replace('about:blank')
    return
  }
  const url = new URL(game.page, document.baseURI).href
  opening = {previous: frame.contentDocument, timer: setTimeout(() => {
    loadingMessage.textContent = 'Opening ' + game.name + '…'
    loader.hidden = false
  }, loadingDelay)}
  frame.contentWindow.location.replace(url)
}

function finishOpening(failed) {
  clearTimeout(opening.timer)
  loadObserver?.disconnect()
  opening = undefined
  if (failed) {
    loadingMessage.textContent = active.name + ' could not open.'
    spinner.hidden = true
    retry.hidden = false
    loader.hidden = false
    return
  }
  loader.hidden = true
  frame.inert = false
}

retry.addEventListener('click', () => openGame(active))

function selectGame() {
  const id = location.hash.slice(1)
  const game = Object.hasOwn(titles, id) ? titles[id] : undefined
  if (active === game) return
  active = game
  if (introAudio && introAudio.game !== game) releaseIntroAudio()
  player.hidden = !game
  picker.hidden = Boolean(game)
  menuButton.hidden = Boolean(game)
  collection.classList.toggle('is-playing', Boolean(game))
  for (const link of links) {
    if (link.dataset.game === id && game) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  }
  openGame(game)
}

frame.addEventListener('load', () => {
  const document = frame.contentDocument
  const attempt = opening
  if (!active || !document || document === attempt?.previous ||
      document.URL !== new URL(active.page, window.document.baseURI).href) return
  const game = document.querySelector('main')
  if (!game) {
    if (attempt) finishOpening(true)
    return
  }
  const root = document.documentElement
  root.classList.add('in-collection')
  if (attempt) {
    function checkFirstFrame() {
      if (opening !== attempt || frame.contentDocument !== document) return
      if (root.dataset.collectionLoad === 'ready') finishOpening(false)
      else if (root.dataset.collectionLoad === 'failed') finishOpening(true)
    }
    loadObserver?.disconnect()
    loadObserver = new MutationObserver(checkFirstFrame)
    loadObserver.observe(root, {attributes: true, attributeFilter: ['data-collection-load']})
    checkFirstFrame()
  }
  const resize = () => {
    const collectionFullscreen = fullscreenAction.active()
    root.classList.toggle('collection-fullscreen', collectionFullscreen)
    if (collectionFullscreen) {
      frame.style.removeProperty('height')
      return
    }
    if (!document.fullscreenElement) frame.style.height = Math.ceil(game.getBoundingClientRect().height) + 'px'
  }
  sizeObserver?.disconnect()
  sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(game)
  document.addEventListener('fullscreenchange', resize)
  resizeFrame = resize
  resize()
})

window.addEventListener('hashchange', selectGame)
selectGame()
