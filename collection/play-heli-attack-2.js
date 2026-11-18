import {bindMenuHighlight} from '../src/menu-highlight.js'
import {createCollectionMenu} from '../src/collection-menu.js'
import {returnToCollection} from '../src/collection-navigation.js'
import {collectionPreferences} from '../src/collection-preferences.js'
import {mountFpsCounter} from '../src/fps-counter.js'
import {beamHits} from './heli-attack-2-beam.js'
import {advanceExplosive, blastProfile} from './heli-attack-2-explosives.js'
import {stepDebris} from './heli-attack-2-debris.js'
import {stepPickup} from './heli-attack-2-pickups.js'
import {traceTravel} from './heli-attack-2-travel.js'
import {createShapeCollision} from './heli-attack-2-collision.js'
import {defaults, labels, allowedKey, readBindings, keyboardAction, keyLabel} from './heli-attack-2-controls.js'
import {freshStats, readLifetimeStats, recordRun, includeLegacyScore} from './heli-attack-2-stats.js'
import {bindControllerCursor, createController} from '../src/controller.js?v=initial-selection-1'
import {createMotionInterpolation} from '../src/motion-interpolation.js'
import {createPatrol, stepPatrol} from './heli-attack-2-patrol.js'
import {displayCanvasSize} from '../src/render-resolution.js'
import {moveHero} from './heli-attack-2-movement.js'
import {Clip} from '../src/scene.js'
import {decodeVector} from '../src/startup.js'
import {prepareArenaBackdrop, prepareTitlePainting} from './heli-attack-2-backdrop.js'
import {preparePlayerArt, prepareHeldWeaponArt, prepareHelicopterArt, drawHelicopterRotors, prepareParachuteArt, preparePickupCrateArt, prepareHudBarArt, prepareProjectileArt} from './heli-attack-2-player-art.js'
import {createArtworkCanvas, loadArtworkImage} from '../src/tile-art.js'
import {prepareTerrainArt, terrainShapeIds, prepareFoliageArt, foliageShapeIds} from './heli-attack-2-terrain-art.js'
import {prepareHudText, drawHudText, prepareTitleText, preparePopupText} from './heli-attack-2-hud-text.js?v=initial-selection-1'
import {removeBitmapFill} from '../src/registered-art.js'
import {GameAudio} from '../src/audio.js'
import {svgMaskPaths, maskShapeIds} from '../src/rendering.js'

const assets = new URL('assets/heli-attack-2/', import.meta.url)
const enhancedArt = new URLSearchParams(location.search).get('art') !== 'classic'
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')
const stage = canvas.closest('.ha2-stage')
stage.classList.toggle('ha2-smooth-title', enhancedArt)
const fullscreen = document.querySelector('#ha2-fullscreen')
fullscreen.disabled = !document.fullscreenEnabled
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement === stage) await document.exitFullscreen()
    else await stage.requestFullscreen()
  } catch (error) {
    status.textContent = 'Fullscreen is unavailable.'
    console.warn(error)
  }
})
document.addEventListener('fullscreenchange', () => {
  const active = document.fullscreenElement === stage
  fullscreen.textContent = active ? 'Exit fullscreen' : 'Fullscreen'
  fullscreen.setAttribute('aria-pressed', String(active))
  if (play.hidden) canvas.focus({preventScroll: true})
})
const play = document.querySelector('#play')
const helpButton = document.querySelector('#help-button')
const controlsButton = document.querySelector('#ha2-controls-button')
const statsButton = document.querySelector('#ha2-stats-button')
const highScoresButton = document.querySelector('#ha2-high-scores-button')
const helpMenuButtons = [helpButton, controlsButton, statsButton, highScoresButton]
const creditsButton = document.querySelector('#ha2-credits-button')
const returnButton = document.querySelector('#ha2-return')
const creditsPanel = document.querySelector('#ha2-credits-panel')
const titleMenuButtons = [play, ...helpMenuButtons, creditsButton, returnButton]
const titleCreditArt = new Set([417, 421, 424, 429])
const titlePaintingId = 426
const helpPanel = document.querySelector('#help-panel')
const helpPages = [...helpPanel.querySelectorAll('[data-menu-page]')]
let helpReturnFocus
const status = document.querySelector('#status')
const keys = new Map()
const held = action => [...keys.values()].includes(action)
const controlsKey = 'heli-attack-2.controls'
let keyboard = {...defaults}
try { keyboard = readBindings(localStorage.getItem(controlsKey)) } catch {}
let captureAction
const bindingList = document.querySelector('#ha2-binding-list')
const bindingStatus = document.querySelector('#ha2-binding-status')
const bindingButtons = new Map()

const menuControlLabels = {
  left: 'Left', right: 'Right', jump: 'Jump', duck: 'Duck', switch: 'Change Weapon',
  boost: 'HyperJump', time: 'TimeDistort', pause: 'Pause', endRun: 'End Run', sound: 'Sound Toggle',
}

function refreshBindings() {
  for (const [action, button] of bindingButtons) {
    button.lastElementChild.textContent = action === captureAction ? 'Press a key' : keyLabel(keyboard[action])
  }
}

for (const [action, label] of Object.entries(menuControlLabels)) {
  const button = document.createElement('button')
  const title = document.createElement('span')
  title.textContent = label + ':'
  button.type = 'button'
  button.className = 'ha2-binding-row'
  button.append(title, document.createElement('span'))
  button.addEventListener('click', () => {
    captureAction = action
    refreshBindings()
    bindingStatus.textContent = 'Press a key for ' + label + ' or Escape to cancel.'
  })
  bindingButtons.set(action, button)
  bindingList.append(button)
}

function saveBindings() {
  try { localStorage.setItem(controlsKey, JSON.stringify(keyboard)) } catch {}
  refreshBindings()
}

refreshBindings()
document.querySelector('#ha2-reset-keys').addEventListener('click', () => {
  keyboard = {...defaults}
  captureAction = undefined
  bindingStatus.textContent = 'Default controls restored.'
  saveBindings()
})
const pointer = {x: 225, y: 100}
const originalWidth = 450
const height = 320
const width = height * 16 / 9
const extraWidth = width - originalWidth
const tile = 50
const sound = new Audio(new URL('gun.mp3', assets))
let data, map, arenaBackdrop, scenery, hero, heli, images, state, camera, last, elapsed = 0
let arenaArtwork
let rotorPhase = 0
let shapeHit
let firing = false
let previousCamera = 0
let cameraTop = 0, previousTop = 0, spawnColumn = 0
const motion = createMotionInterpolation()
const pausePanel = document.querySelector('#ha2-pause-panel')
const pauseButton = document.querySelector('#ha2-pause')
const resumeButton = document.querySelector('#ha2-resume')
const quitButton = document.querySelector('#ha2-quit')
if (enhancedArt) {
  const heading = document.querySelector('#ha2-pause-heading')
  heading.hidden = false
  pausePanel.classList.add('ha2-remastered-pause')
  pausePanel.removeAttribute('aria-label')
  pausePanel.setAttribute('aria-labelledby', heading.id)
  resumeButton.textContent = 'Resume Game'
  quitButton.textContent = 'Back to Main Menu'
}
const bindings = {leftKey: 65, rightKey: 68, upKey: 87, downKey: 83, timeKey: 16, specialKey: 32, switchKey: 81}
const controllerGame = {root: {stats: bindings, pointer}, controllerKeys: new Set(), paused: false}
const isPlaying = () => play.hidden && !controllerGame.paused
const canControl = () => isPlaying() && !state?.death
let controllerConnected = false
let switchHeld = false

function updateGuide() {
  status.textContent = controllerConnected
    ? 'Xbox · Left stick move · Right stick aim · RT fire · A jump · B duck · Y Hyperjump · LT Bullet Time · RB weapon · Menu pause'
    : ['left', 'right', 'jump', 'duck', 'boost', 'time', 'switch', 'pause'].map(action => keyLabel(keyboard[action]) + ' ' + labels[action]).join(' · ')
}

const quickMenu = createCollectionMenu(stage, {onExit: returnToCollection})
const cursor = bindControllerCursor(canvas)
const controller = createController({
  game: controllerGame,
  getGamepads: () => {
    try { return navigator.getGamepads?.() } catch { return [] }
  },
  getLayer: () => quickMenu.open ? quickMenu.element : controllerGame.paused ? pausePanel : !creditsPanel.hidden ? creditsPanel : !helpPanel.hidden ? helpPanel : stage,
  isPlaying: canControl,
  onMenuPress: () => { if (quickMenu.open || (menu && !play.hidden && helpPanel.hidden && creditsPanel.hidden)) quickMenu.toggle() },
  onPause: () => setPaused(!controllerGame.paused),
  getAimOrigin: () => hero && ({
    x: hero._x + hero.gun._x - camera,
    y: hero._y + hero.gun._y - cameraTop,
  }),
  waitForConfirmRelease: window.frameElement?.dataset.controllerLaunch === 'true',
  onControllerInput: cursor.hide,
  onGameplayInput: () => canvas.classList.add('controller-aim'),
  onConnection: connected => {
    controllerConnected = connected
    if (!connected) cursor.show()
    if (isPlaying()) updateGuide()
  },
})

function clearInput() {
  keys.clear()
  firing = false
  switchHeld = false
  controller.clear()
}

function setPaused(value) {
  if (!play.hidden || state?.death || value === controllerGame.paused) return
  controllerGame.paused = value
  pausePanel.hidden = !value
  pauseButton.textContent = value ? resumeButton.textContent : 'Pause'
  clearInput()
  motion.reset()
  previousCamera = camera
  previousTop = cameraTop
  syncAudio()
  if (value) resumeButton.focus()
  else canvas.focus({preventScroll: true})
}

pauseButton.addEventListener('click', () => setPaused(!controllerGame.paused))
resumeButton.addEventListener('click', () => setPaused(false))
quitButton.addEventListener('click', () => {
  showMenu()
  play.focus()
})
let menu, menuText, results
const menuBack = document.querySelector('#ha2-menu-back')
const resultsPanel = document.querySelector('#ha2-results-panel')
const resultsFields = [...resultsPanel.querySelectorAll('[data-result]')]
const weaponNames = ['Machine Gun','Dual MAC-10s','Shotgun','Shotgun Rockets','Grenade Launcher','RPG','Rocket Launcher','Seeker Launcher','Flamethrower','Fire Mines','A-Bomb Launcher','Rail Gun','Grapple Cannon','Shoulder Cannon']
const highScoreKey = 'heli-attack-2.high-score'
const lifetimeKey = 'heli-attack-2.lifetime'
let hud, hudText, highScore = 0
let lifetime = freshStats()
try {
  const saved = Number(localStorage.getItem(highScoreKey))
  if (Number.isFinite(saved) && saved >= 0) highScore = Math.floor(saved)
  lifetime = readLifetimeStats(localStorage.getItem(lifetimeKey))
  includeLegacyScore(lifetime, highScore)
  highScore = Math.max(highScore, lifetime.topScores[0] ?? 0)
} catch {}

function saveRecords() {
  try {
    localStorage.setItem(highScoreKey, String(highScore))
    localStorage.setItem(lifetimeKey, JSON.stringify(lifetime))
  } catch {}
}

function showHighScores() {
  const scores = lifetime.topScores
  const table = document.querySelector('#ha2-scores-table')
  const list = document.querySelector('#ha2-scores-list')
  const empty = document.querySelector('#ha2-scores-empty')
  table.hidden = scores.length === 0
  empty.hidden = !table.hidden
  list.replaceChildren(...scores.map((score, index) => {
    const row = document.createElement('tr')
    row.insertCell().textContent = index + 1
    row.insertCell().textContent = new Intl.NumberFormat('en-US').format(score * 100)
    return row
  }))
}

function showLifetimeStats() {
  const seconds = ticks => ticks === null ? 'None' : Math.floor(ticks / data.fps) + ' seconds'
  let favorite = 0
  for (let i = 1; i < lifetime.weaponUse.length; i++) {
    if (lifetime.weaponUse[i] > (favorite ? lifetime.weaponUse[favorite] : 0)) favorite = i
  }
  const render = (selector, entries) => document.querySelector(selector).replaceChildren(
    ...entries.flatMap(([label, value]) => {
      const term = document.createElement('dt'), detail = document.createElement('dd')
      term.textContent = label
      detail.textContent = value
      return [term, detail]
    }))
  render('#ha2-lifetime-stats', [
    ['Times Played', lifetime.launches], ['Games Played', lifetime.games],
    ['Total Score', Math.floor(lifetime.score) * 100], ['High Score', highScore * 100],
    ['Total Time Played', seconds(lifetime.time)], ['Best Time', seconds(lifetime.bestTime || null)],
    ['Worst Time', seconds(lifetime.worstTime)], ['Total Helis Destroyed', lifetime.kills],
    ['Best Helis Destroyed', lifetime.bestKills], ['Shots Fired', lifetime.shots], ['Shots Hit', lifetime.hits],
    ['Accuracy', (lifetime.shots ? Math.floor(lifetime.hits / lifetime.shots * 100) : 0) + '%'],
    ['Favourite Weapon', lifetime.weaponUse[favorite] ? weaponNames[favorite] : 'None'],
    ['Time Distorted', seconds(lifetime.bulletTime)], ['Hyper Jumps', lifetime.hyperjumps],
  ])
  render('#ha2-lifetime-weapons', weaponNames.map((name, i) => [name, lifetime.weaponUse[i]]))
}

document.querySelector('#ha2-reset-stats').addEventListener('click', () => {
  if (!window.confirm('Reset lifetime stats and the local high score?')) return
  lifetime = freshStats()
  lifetime.launches = 1
  highScore = 0
  saveRecords()
  showLifetimeStats()
  document.querySelector('#ha2-stats-status').textContent = 'Lifetime stats reset.'
})
const weapons = [
  [5,8,10,1,'gun',0], [4,8,9,1,'gun',50,[-4,4]],
  [25,8,15,1,'shotgun',14,[-10,-5,0,5,10]],
  [40,7,40,7,'rocket',8,[-10,0,10],28],
  [30,15,75,4,'grenade',12,[0],42,.45],
  [40,4,75,8,'grenade',10,[0],38],
  [50,7,100,2,'rocket',8,[0],48],
  [55,7,100,5,'rocket',6,[0],42],
  [1,8,2,3,null,150],
  [100,3,5,10,null,3,[0],36,.6],
  [150,3,300,6,'rocket',2,[0],115,.2],
  [75,20,150,9,'rail',3], [250,20,300,12,'grapple',2],
  [100,20,300,11,'rail',0],
].map(([delay,speed,damage,frame,cue,ammo,spread = [0],radius = 0,gravity = 0]) =>
  ({delay,speed,damage,frame,cue,ammo,spread,radius,gravity}))
const weaponSounds = new Map([...new Set(weapons.map(({cue}) => cue).filter(Boolean))]
  .map(cue => [cue, cue === 'gun' ? sound : new Audio(new URL(cue + '.mp3', assets))]))
const powers = ['TriDamage', 'Invulnerability', 'Predator Mode', 'Time Rift', 'Jetpack']

const pickupCues = ['health','mac','shotgunPickup','shotgunRockets','grenadePickup','rpg','rocketPickup','seeker','flamePickup','mines','bomb','railPickup','grapplePickup']
const powerCues = ['tri','invulnerable','predator','rift','jetpack']
const powerColors = [
  {ra: 50, ga: 50, ba: 255},
  {ra: 100, ga: 0, ba: 0},
  undefined,
  {ra: 0, ga: 100, ba: 0},
]
for (const cue of ['boom','bigboom','hurt','heliboom','jump','metal0','metal1','metal2','metal3', ...pickupCues, ...powerCues]) {
  weaponSounds.set(cue, new Audio(new URL(cue + '.mp3', assets)))
}

const soundButton = document.querySelector('#ha2-sound')
const optionsSound = document.querySelector('#ha2-options-sound')
const soundPreference = collectionPreferences().sound
let soundEnabled = soundPreference.get()
// SWF DefineSound 381 specifies a seek of 1,669 samples and 151,200 loop samples.
const music = new GameAudio({title: new URL('music.mp3', assets), flame: new URL('flame.mp3', assets)}, {
  sourceMetadata: {
    title: {format: 2, start: 1669, frames: 151200, sampleRate: 22050},
    flame: {format: 2, start: 1669, frames: 23732, sampleRate: 22050},
  },
})
music.sb.setVolume('flame', 0)
const rotor = new Audio(new URL('rotor.mp3', assets))
rotor.loop = true
let audioUnlocked = false
let startingMusic = false
const collectionIntroAudio = window.frameElement && window.parent.getCollectionIntroAudioContext?.(document)
if (soundEnabled && collectionIntroAudio) {
  music.context = collectionIntroAudio
  audioUnlocked = true
  music.prepare(['title']).catch(error => console.warn('Title music could not be prepared.', error))
}

function syncMusic(audible) {
  if (!audible) {
    if (music.context) music.pause(true).catch(() => {})
    return
  }
  music.sb.setVolume('title', play.hidden ? 50 : 100)
  if (startingMusic) {
    if (music.context) music.pause(false).catch(() => {})
    return
  }
  if (music.sb.getSound('title').node) {
    music.pause(false).catch(() => {})
    return
  }
  startingMusic = true
  music.unlock().then(() => Promise.all([
    music.sb.start('title', 0, 99999, true), music.sb.start('flame', 0, 99999, true),
  ]))
    .catch(() => {}).finally(() => { startingMusic = false })
}

function syncAudio() {
  const audible = soundEnabled && audioUnlocked && !document.hidden && !controllerGame.paused
  syncMusic(audible)
  if (!audible) {
    rotor.pause()
    return
  }
  if (!play.hidden || state?.death) rotor.pause()
  else if (rotor.paused) rotor.play().catch(() => {})
}

function syncFlame() {
  let volume = 0
  if (isPlaying() && !state.death) {
    if (state.shots.some(shot => shot.weapon === 9 && shot.pillar)) volume = 255
    else if (state.flameFiredTick === state.ticks ||
      (state.weapon === 8 && (firing || controllerGame.controllerFire))) volume = 100
  }
  if (music.sb.getVolume('flame') !== volume) music.sb.setVolume('flame', volume)
}

function unlockAudio() {
  audioUnlocked = true
  syncAudio()
}

function showSoundSetting() {
  soundButton.textContent = soundEnabled ? 'Sound on' : 'Sound off'
  soundButton.setAttribute('aria-pressed', String(soundEnabled))
  optionsSound.textContent = soundEnabled ? 'On' : 'Off'
  optionsSound.setAttribute('aria-label', 'Sound')
  optionsSound.setAttribute('aria-pressed', String(soundEnabled))
}

showSoundSetting()
soundPreference.subscribe(enabled => {
  soundEnabled = enabled
  if (!soundEnabled) for (const cue of weaponSounds.values()) cue.pause()
  showSoundSetting()
  syncAudio()
})
function toggleSound() {
  soundPreference.set(!soundEnabled)
  unlockAudio()
}
soundButton.addEventListener('click', toggleSound)
optionsSound.addEventListener('click', toggleSound)
document.addEventListener('visibilitychange', syncAudio)
document.addEventListener('pointerdown', unlockAudio, {once: true})
document.addEventListener('keydown', unlockAudio, {once: true})

function playCue(name) {
  if (!name || !soundEnabled || document.hidden) return
  const cue = weaponSounds.get(name)
  cue.currentTime = 0
  cue.play().catch(() => {})
}

async function asset(path) {
  const response = await fetch(new URL(path, assets))
  if (!response.ok) throw Error('Missing ' + path)
  return response
}

function decodeHelicopterCrew(id, svg, repaint) {
  if (!repaint) return decodeVector(removeBitmapFill(svg, 78))
  // The same Flash bitmap sits at a different registration point in each doorway.
  const canvas = createArtworkCanvas(212 * 5, 106 * 5)
  const ctx = canvas.getContext('2d')
  ctx.scale(5, 5)
  const [x, width] = id === 79 ? [104.5, 25] : [84.45, 25.08]
  ctx.drawImage(repaint, x, 33.5, width, 48)
  return canvas
}

function symbol(name, frame = 1) {
  const clip = new Clip(data, data.names[name])
  clip.gotoAndStop(frame)
  return clip
}

function tiles(grid, name) {
  const sprites = new Map()
  return grid.flatMap((row, y) => row.flatMap(([, frame], x) => {
    if (!frame) return []
    if (!sprites.has(frame)) sprites.set(frame, symbol(name, frame + 1))
    return [{x: x * tile - 1, y: y * tile - 1, clip: sprites.get(frame)}]
  }))
}

function helicopterView() {
  return {x: camera, y: cameraTop, width, height, worldWidth: map[0].length * tile, worldHeight: map.length * tile}
}

function spawn(health = 300) {
  heli = symbol('Heli', 1 + Math.floor(Math.random() * 2))
  heli.hit._visible = false
  heli.gun.gotoAndStop(1)
  state.patrol = createPatrol(helicopterView(), state)
  heli._x = state.patrol.x
  heli._y = state.patrol.y
  state.enemyHealth = health
}

function showMenu() {
  state = undefined
  controllerGame.paused = false
  pausePanel.hidden = true
  pauseButton.disabled = true
  pauseButton.textContent = 'Pause'
  clearInput()
  results = undefined
  menuBack.hidden = true
  resultsPanel.hidden = true
  menu = new Clip(data, -1)
  menu.gotoAndStop(20)
  for (const clip of menu.children.values()) {
    if (titleCreditArt.has(clip.id)) clip._visible = false
  }
  menu._x = extraWidth / 2
  const menuPanel = [...menu.children.values()].find(clip => clip.id === 242)
  const [, panelTop, , panelHeight] = menuPanel.symbol.bounds
  const extraPanelScale = 12 / panelHeight
  menuPanel._y -= panelTop * extraPanelScale
  menuPanel._yscale += extraPanelScale * 100
  menuText = enhancedArt ? prepareTitleText(menu) : []
  positionMenuButton(play, enhancedArt ? 418 : 416)
  positionMenuButton(helpButton, enhancedArt ? 416 : 418)
  positionMenuButton(controlsButton, 413)
  positionMenuButton(statsButton, 414)
  positionMenuButton(highScoresButton, 415)
  positionMenuButton(creditsButton, 415, 14)
  positionMenuButton(returnButton, 416, 14)
  for (const button of helpMenuButtons) button.hidden = false
  creditsButton.hidden = false
  returnButton.hidden = false
  play.textContent = 'Start game'
  play.hidden = false
  syncAudio()
  status.textContent = 'Heli Attack 2 · Native preview'
  play.focus({preventScroll: true})
}

function positionMenuButton(button, id, offsetY = 0) {
  const target = [...menu.children.values()].find(clip => clip.id === id)
  target.gotoAndStop(4)
  const bounds = target.getBounds(null)
  target.gotoAndStop(1)
  button.classList.add('game-action')
  button.style.left = bounds.xMin / width * 100 + '%'
  button.style.top = (bounds.yMin + offsetY) / height * 100 + '%'
  button.style.width = (bounds.xMax - bounds.xMin) / width * 100 + '%'
  button.style.height = (bounds.yMax - bounds.yMin) / height * 100 + '%'
}

function begin() {
  for (const button of helpMenuButtons) button.hidden = true
  creditsButton.hidden = true
  returnButton.hidden = true
  results = undefined
  menuBack.hidden = true
  resultsPanel.hidden = true
  menu = undefined
  play.classList.remove('game-action')
  play.removeAttribute('style')
  hero = symbol('hero')
  hero.gun.gotoAndStop(1)
  hero.gfx.stop()
  hud = symbol('HUD')
  // Move authored HUD groups together so labels and masks stay aligned.
  for (const clip of hud.children.values()) {
    if (clip._x >= 350) clip._x += extraWidth
    else if (clip._x >= 200) clip._x += extraWidth / 2
  }
  hudText = enhancedArt ? prepareHudText(hud) : []
  hud.powerup._visible = false
  camera = previousCamera = cameraTop = previousTop = 0
  motion.reset()
  pauseButton.disabled = false
  keys.clear()
  firing = false
  state = {x: spawnColumn * tile + tile / 2 + 24, y: -2, vx: 0, vy: 0, health: 100, kills: 0, score: 0,
    arrival: true, chute: 0, survival: 0, level: 0, nextLevel: 10000, shots: [], fired: 0, hits: 0, weaponUse: weapons.map(() => 0), reload: weapons.map(() => 0), heroFraction: 0, ticks: 0, weapon: 0, ammo: weapons.map((_, index) => index === 0 ? Infinity : 0), drops: [], wrecks: [], blasts: [], nextHealth: 15, timeScale: 1, power: -1, powerTicks: 0, grounded: false, jumps: 0, jumpTicks: 0, jumpHeld: false, boostHeld: false, hyperjumped: false, boost: 150, time: 250}
  heli = undefined
  state.debris = []
  state.bounceSounds = 0
  hero.gfx.gotoAndStop(6)
  if (hero.gfx.hit) hero.gfx.hit._visible = false
  hero.gfx.chute._xscale = 0
  hero._x = state.x - 24
  hero._y = state.y - 48
  play.hidden = true
  rotor.volume = 0
  unlockAudio()
  updateGuide()
  canvas.focus()
}

function solid(x, y) {
  return Boolean((map[Math.floor(y / tile)]?.[Math.floor(x / tile)]?.[0] ?? 0) & 1)
}

function shoot(clip, enemy) {
  const gun = clip.gun
  const origin = {x: 0, y: 0}
  gun.barrell.localToGlobal(origin)
  const weapon = weapons[state.weapon]
  const speed = enemy ? 7 : weapon.speed
  const type = state.weapon
  const offsets = enemy ? [0] : weapon.spread
  const blocked = !enemy && type <= 2 && solid(origin.x, origin.y)
  for (let i = 0; !blocked && i < offsets.length; i++) {
    let offset = offsets[i]
    if (!enemy && (type === 0 || type === 1 || type === 8)) {
      const spread = type === 0 ? 2 : type === 1 ? 8 : 10
      offset = Math.floor(Math.random() * spread * 2) - spread
    }
    const rotation = gun._rotation + offset + (enemy ? clip._rotation - 5 + Math.floor(Math.random() * 10) : 0)
    const angle = rotation * Math.PI / 180
    const sprite = symbol(enemy ? 'enemyBullet' : 'Bullet', enemy ? 1 : weapon.frame)
    if (!enemy && type === 12 && sprite.gfx) sprite.gfx._rotation = rotation
    else sprite._rotation = rotation
    const muzzleAngle = gun._rotation * Math.PI / 180
    const stagger = !enemy && type === 1 && i === 1 ? speed : 0
    state.shots.push({sprite, x: origin.x + Math.cos(muzzleAngle) * stagger,
      y: origin.y + Math.sin(muzzleAngle) * stagger, vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed, enemy, weapon: type, age: 0, bounces: 0,
      damage: weapon.damage * (state.power === 0 ? 3 : 1)})
  }
  if (!enemy) {
    if (type === 8) state.flameFiredTick = state.ticks
    state.fired += weapon.spread.length
    state.weaponUse[state.weapon]++
  }
  if (!enemy) playCue(weapon.cue)
}

function switchWeapon() {
  if (!play.hidden || state.power === 2) return
  do state.weapon = (state.weapon + 1) % weapons.length
  while (!state.ammo[state.weapon])
  hero.gun.gotoAndStop(state.weapon + 1)
}

function aim(clip, x, y, step) {
  const gun = clip.gun
  const target = Math.atan2(y - clip._y - gun._y, x - clip._x - gun._x) * 180 / Math.PI
  const delta = ((target - gun._rotation + 540) % 360) - 180
  gun._rotation += delta * step / 2
  gun._yscale = Math.abs(gun._rotation) > 90 ? -100 : 100
}

function explode(shot) {
  const large = shot.weapon === 10
  playCue(large ? 'bigboom' : 'boom')
  const {radius, horizontal, vertical, scale} = blastProfile(shot.weapon)
  const x = state.x - shot.x
  const y = state.y - shot.y
  const force = Math.max(0, 1 - Math.hypot(x, y) / radius)
  const angle = Math.atan2(y, x)
  state.vx += Math.trunc(force * horizontal * Math.cos(angle))
  state.vy += force * vertical * Math.sin(angle)
  if (force > 0) state.hyperjumped = true
  const clip = symbol('Boom')
  clip._x = shot.x
  clip._y = shot.y
  clip._xscale = clip._yscale = scale
  state.blasts.push({clip, age: 0})
}

function addEffect(name, x, y, scale = 100, delay = 0, rotation = 0) {
  const clip = symbol(name)
  clip._x = x
  clip._y = y
  clip._rotation = rotation
  clip._xscale = clip._yscale = scale
  state.blasts.push({clip, age: -delay})
}

function showCombatLabel(label) {
  const popup = symbol('Popup')
  popup.text = label
  if (enhancedArt) preparePopupText(popup)
  popup._x = Math.floor(state.x - popup._width / 2)
  popup._y = Math.floor(hero._y - popup._height * 2)
  state.blasts.push({clip: popup, age: 0, combatLabel: true})
}

function addDebris(kind, x, y, vx, vy, frame = 1, rotation = 0) {
  const clip = symbol(kind === 'shard' ? 'Shard' : kind === 'pilot' ? 'guyBurned' : 'HeliDestroyed', frame)
  if (kind === 'shard') clip.gotoAndStop(1 + Math.floor(Math.random() * clip._totalframes))
  clip._x = x
  clip._y = y
  clip._rotation = rotation
  state.debris.push({clip, kind, x, y, vx, vy, rotation, bounces: 0})
}

function shards(x, y, count = 3) {
  for (let i = 0; i < count; i++) {
    addDebris('shard', x, y, -10 + Math.floor(Math.random() * 20), -10 + Math.floor(Math.random() * 20), 1, Math.floor(Math.random() * 360))
  }
}

function destroyHelicopter() {
  shards(heli._x, heli._y)
  addDebris('pilot', heli._x, heli._y, -10 + Math.floor(Math.random() * 20),
    -10 + Math.floor(Math.random() * 15), 1, heli._rotation)
  addDebris('wreck', heli._x, heli._y, state.patrol.vx, 0, heli._currentframe, heli._rotation)
  addEffect('Boom', heli._x, heli._y, 200)
  playCue('heliboom')
}

function metalBounce() {
  playCue('metal' + Math.floor(Math.random() * 4))
}

function advanceDebris(step) {
  const pending = []
  state.debris = state.debris.filter(d => {
    const event = stepDebris(d, step, solid)
    Object.assign(d.clip, {_x: d.x, _y: d.y, _rotation: d.rotation})
    if (d.kind === 'shard') {
      for (let i = 0; i < event.bounces; i++) if (state.bounceSounds++ % 3 === 0) metalBounce()
    }
    if (event.crash) {
      pending.push(d)
      addEffect('Boom', d.x, d.y, 200)
      playCue('boom')
    }
    return !event.remove && d.y < map.length * tile + tile &&
      d.x > camera - tile * 2 && d.x < camera + width + tile * 2
  })
  for (const d of pending) shards(d.x, d.y - tile / 2)
}

function tick() {
  const s = state
  if (s.death) { tickDeath(); return }
  if (s.arrival) {
    s.y += 7
    hero._y = s.y - 48
    cameraTop = Math.max(0, Math.min(map.length * tile - height, s.y - height * .75))
    if (solid(s.x, s.y + 250)) s.retracting = true
    s.chute = Math.max(0, Math.min(100, s.chute + (s.retracting ? -10 : 10)))
    hero.gfx.chute._xscale = s.chute
    if (s.retracting && s.chute === 0) {
      s.arrival = false
      spawn()
    }
    return
  }
  s.ticks++
  const switching = controllerGame.controllerKeys.has(81)
  if (switching && !switchHeld) switchWeapon()
  switchHeld = switching
  const timeRift = s.power === 3
  if (s.power >= 0 && s.powerTicks <= 0) {
    if (s.power === 2) {
      s.ammo[13] = 0
      s.weapon = 0
      hero.gun.gotoAndStop(1)
    }
    s.power = -1
  }
  hero.colorTransform = powerColors[s.power]
  const left = controllerGame.controllerKeys.has(65) || held('left')
  const right = controllerGame.controllerKeys.has(68) || held('right')
  const jump = controllerGame.controllerKeys.has(87) || held('jump')
  const slow = (controllerGame.controllerKeys.has(16) || held('time')) && s.time > 0
  if (slow || timeRift) s.bulletTimeTicks = (s.bulletTimeTicks ?? 0) + 1
  if (slow && !timeRift) s.time = Math.max(0, s.time - 1)
  s.timeScale = slow || timeRift ? Math.max(.2, s.timeScale - .1) : Math.min(1, s.timeScale + .1)
  const step = s.timeScale
  const duck = controllerGame.controllerKeys.has(83) || held('duck')
  const boostBefore = s.boost
  const motionTick = moveHero(s, {left, right, jump, duck, boost: held('boost') || controllerGame.controllerKeys.has(32)},
    solid, map[0].length * tile, timeRift ? 1 : step)
  if (motionTick && s.power >= 0) s.powerTicks--
  if (motionTick && s.power === 4 && !s.grounded) {
    s.jetpackFrames = (s.jetpackFrames ?? 0) + 1
    if (s.jetpackFrames % 5 === 1) addEffect('smoke', s.x, s.y)
  }
  if (boostBefore > 0 && s.boost === 0) {
    s.hyperjumps = (s.hyperjumps ?? 0) + 1
    playCue('jump')
  }
  camera = Math.max(0, Math.min(map[0].length * tile - width, s.x - width / 2))
  cameraTop = Math.max(0, Math.min(map.length * tile - height, s.y - height * .75))
  hero._x = s.x - 24
  hero._y = s.y - 48
  const pose = s.ducking ? 2 : !s.grounded ? (s.jumps > 1 ? 5 : 3) : Math.abs(s.vx) > 0 ? 4 : 1
  if (hero.gfx._currentframe !== pose) hero.gfx.gotoAndStop(pose)
  // The original hides the body in Predator Mode, leaving the weapon visible.
  const shimmer = (s.predatorFrame ?? 0) % 5
  hero.gfx._alpha = s.power === 2 ? (shimmer === 2 ? 10 : 0) : 100
  if (s.power === 2) s.predatorFrame = (s.predatorFrame ?? 0) + 1
  const legs = hero.gfx.gfx
  if (motionTick && pose === 4 && legs) legs.gotoAndStop(legs._currentframe % legs._totalframes + 1)
  if (hero.gfx.hit) hero.gfx.hit._visible = false
  const cameraY = cameraTop
  const healthBefore = s.enemyHealth
  heli.colorTransform = undefined
  heli.advance()
  const heroStep = timeRift ? 1 : step
  aim(hero, pointer.x + camera, pointer.y + cameraY, heroStep)
  s.heroFraction += heroStep
  const weaponTick = s.heroFraction >= 1 - 1e-9
  if (weaponTick) {
    s.heroFraction = Math.max(0, s.heroFraction - 1)
    s.reload[s.weapon] = Math.max(0, s.reload[s.weapon] - 1)
  }
  if (weaponTick && s.reload[s.weapon] === 0 && (firing || controllerGame.controllerFire || controllerGame.controllerShot)) {
    shoot(hero, false)
    controllerGame.controllerShot = false
    s.reload[s.weapon] = weapons[s.weapon].delay
    if (--s.ammo[s.weapon] === 0) {
      s.reload[s.weapon] = 0
      s.weapon = 0
      hero.gun.gotoAndStop(1)
    }
  }
  rotor.volume = .75 * Math.max(0, 1 - Math.hypot(heli._x - s.x, heli._y - hero._y) / 800)
  if (s.score > s.nextLevel) {
    s.nextLevel *= 2
    s.level++
    showCombatLabel('Level Up')
  }
  s.survival += step
  const level = s.level
  const patrol = s.patrol
  const flight = stepPatrol(patrol, s, helicopterView(), step, level)
  if (flight.replace) spawn(s.enemyHealth)
  else {
    heli._x = patrol.x
    heli._y = patrol.y
    heli._rotation = patrol.bank
    const targetX = s.power === 2 ? s.x + (Math.random() - .5) * width : s.x
    const gun = heli.gun
    const angle = Math.atan2(hero._y - heli._y - gun._y, targetX - heli._x - gun._x) *
      180 / Math.PI - heli._rotation
    const difference = ((angle - gun._rotation + 540) % 360) - 180
    gun._rotation += difference / Math.max(1, 10 - level) * step
    if (flight.fire && s.power === 2) gun._rotation = angle
    gun._yscale = Math.cos(gun._rotation * Math.PI / 180) < 0 ? -100 : 100
    if (flight.fire) shoot(heli, true)
  }
  let grappleHit
  s.shots = s.shots.filter(shot => {
    const gun = weapons[shot.weapon]
    shot.age += step
    if (!shot.enemy) {
      const effect = advanceExplosive(shot, step)
      if (effect.ignite) playCue('rocket')
      if (effect.spin) {
        const rotating = shot.weapon === 4 ? shot.sprite.gfx : shot.sprite
        if (rotating) rotating._rotation += effect.spin
      }
      if (effect.trail) {
        const clip = symbol(effect.trail)
        clip._x = shot.x
        clip._y = shot.y
        s.blasts.push({clip, age: 0})
      }
    }
    if (!shot.enemy && (shot.weapon === 11 || shot.weapon === 13)) {
      if (shot.age >= 1 && !shot.beamResolved) {
        shot.beamResolved = true
        const left = Math.floor(camera / tile) * tile
        const top = Math.floor(cameraY / tile) * tile
        const bounds = {left: left - tile, top: top - tile,
          right: left + (Math.ceil(width / tile) + 1) * tile,
          bottom: top + (Math.ceil(height / tile) + 1) * tile}
        if (!grappleHit && beamHits(shot, bounds, (x, y) => shapeHit(heli.hit, x, y))) {
          s.enemyHealth -= shot.damage
          s.score += shot.damage
          s.hits++
        }
      }
      shot.sprite._alpha = Math.max(0, 100 - Math.max(0, shot.age - 2) * 10)
      return shot.sprite._alpha > 0
    }
    if (!shot.enemy && shot.weapon === 7) {
      const target = Math.atan2(heli._y - shot.y, heli._x - shot.x)
      const heading = Math.atan2(shot.vy, shot.vx)
      const error = Math.atan2(Math.sin(target - heading), Math.cos(target - heading))
      const angle = heading + error / 15 * step
      shot.vx = Math.cos(angle) * gun.speed
      shot.vy = Math.sin(angle) * gun.speed
      shot.sprite._rotation = angle * 180 / Math.PI
    }

    if (!shot.enemy && shot.weapon === 9 && shot.pillar) {
      const life = shot.age - shot.armedAt
      const scale = Math.max(0, Math.min(100, life <= 30 ? life * 25 : 100 - (life - 30) * 7))
      shot.pillar._alpha = shot.pillar._xscale = scale
      if (!grappleHit && scale && shot.pillar.hitTest(heli)) {
        s.enemyHealth -= shot.damage * step
        s.score += shot.damage * step
        shot.overlaps = (shot.overlaps ?? 0) + 1
        if (shot.overlaps === 2) s.hits++
      }
      return life < 45
    }
    const grenade = !shot.enemy && shot.weapon === 4
    const mine = !shot.enemy && shot.weapon === 9
    if (mine) shot.vy += step
    const x = shot.x + shot.vx * step
    const y = shot.y + shot.vy * step
    const bouncing = grenade || mine
    let contact
    if (!bouncing) {
      const flame = !shot.enemy && shot.weapon === 8
      const target = shot.enemy ? hero.gfx.hit : grappleHit ? null : heli.hit
      const bounds = !flame && target?.getBounds(null)
      const travel = traceTravel(shot.x, shot.y, x, y, (px, py) => {
        if (solid(px, py)) return 'terrain'
        if (bounds && px >= bounds.xMin && px <= bounds.xMax &&
            py >= bounds.yMin && py <= bounds.yMax && shapeHit(target, px, py)) return 'target'
        return null
      })
      shot.x = travel.x
      shot.y = travel.y
      contact = travel.contact
    }
    if (bouncing && solid(x, shot.y)) {
      shot.vx *= -.5
      if (grenade) metalBounce()
    }
    else if (bouncing) shot.x = x
    if (bouncing && solid(shot.x, y)) {
      if (mine) {
        shot.pillar = symbol('FlamePillar')
        shot.pillar._x = shot.x
        shot.pillar._y = shot.y
        shot.pillar._alpha = shot.pillar._xscale = 0
        shot.armedAt = shot.age
        return true
      }
      shot.vy *= -.5
      shot.bounces++
      metalBounce()
    } else if (bouncing) shot.y = y
    if (shot.enemy && contact === 'target') {
      if (s.power !== 1) {
        s.health -= 10
        for (let i = 0; i < 3; i++) addEffect('Blood', s.x, s.y - 24, 100, i * 2, Math.floor(Math.random() * 360))
        playCue('hurt')
      }
      return false
    }
    const terrain = contact === 'terrain' || (bouncing && solid(shot.x, shot.y))
    if (!shot.enemy && shot.weapon === 8 && shot.sprite.gfx) {
      const flame = shot.sprite.gfx
      shot.sprite._x = shot.x
      shot.sprite._y = shot.y
      const frame = Math.max(1 + Math.floor(shot.age), flame._currentframe, terrain ? flame._totalframes - 3 : 1)
      if (Math.floor(shot.age) > Math.floor(shot.age - step) && terrain) {
        shot.age = Math.max(shot.age, flame._totalframes - 4)
      }
      if (!grappleHit && heli.hit.hitTest(shot.sprite)) {
        const damage = shot.damage * (1 - flame._currentframe / flame._totalframes) * step
        s.enemyHealth -= damage
        s.score += damage
        shot.overlaps = (shot.overlaps ?? 0) + 1
        if (shot.overlaps === 2) s.hits++
      }
      flame.gotoAndStop(frame)
      if (flame._currentframe >= flame._totalframes) return false
      return shot.x > camera - 100 && shot.x < camera + width + 100 &&
        shot.y > cameraY - 100 && shot.y < map.length * tile
    }
    const hit = !shot.enemy && !grappleHit && (contact === 'target' || (bouncing && shapeHit(heli.hit, shot.x, shot.y)))
    if (hit) {
      s.hits++
      s.enemyHealth -= shot.damage
      s.score += shot.damage
      if (shot.weapon === 12) {
        s.enemyHealth = 0
        grappleHit = {x: shot.x, y: shot.y}
        shards(shot.x, shot.y, 2)
        s.wrecks.push({clip: heli, shot, kind: 'wreck', x: heli._x, y: heli._y,
          vx: s.patrol.vx, vy: s.patrol.vy, rotation: heli._rotation,
          dx: shot.x - heli._x, dy: shot.y - heli._y})
      }
    }
    if (!shot.enemy && gun.radius && !mine &&
        (hit || terrain || shot.bounces >= 3)) explode(shot)
    return !hit && !terrain && shot.bounces < 3 && shot.x > camera - 100 &&
      shot.x < camera + width + 100 && shot.y > cameraY - 100 && shot.y < map.length * tile
  })
  advanceGrappleWrecks(step)
  advanceBlasts(step)
  advanceDebris(step)
  if (s.enemyHealth < healthBefore) heli.colorTransform = {ra: 100, ga: 100, ba: 100, rb: 25, gb: 25, bb: 25}
  if (s.enemyHealth <= 0) {
    s.kills++
    if (!grappleHit) {
      destroyHelicopter()
      s.time = Math.min(250, s.time + 250 / 3)
    }
    if (!grappleHit && s.y - 48 < heli._y) {
      showCombatLabel('Random Weapon')
      const weapon = 1 + Math.floor(Math.random() * 7)
      s.ammo[weapon] += [0, 10, 3, 2, 2, 2, 2, 1][weapon]
    }
    if (s.kills % 3 === 0) {
      const type = s.kills >= s.nextHealth ? 0 : 1 + Math.floor(Math.random() * 13)
      if (type === 0) s.nextHealth *= 2
      const clip = symbol('Powerup')
      clip.power.gotoAndStop(type + 1)
      clip.hit._visible = false
      clip._x = Math.max(25, Math.min(map[0].length * tile - 25, grappleHit?.x ?? heli._x))
      clip._y = grappleHit?.y ?? heli._y
      clip.chute._xscale = 0
      s.drops.push({clip, type, ticks: 0, vy: 2, chute: 0, cycling: type !== 0 && Math.floor(Math.random() * 100) % 32 === 0})
    }
    spawn()
  }
  s.drops = s.drops.filter(drop => {
    const {clip} = drop
    drop.x = clip._x
    drop.y = clip._y
    drop.chute ??= clip.chute._xscale
    stepPickup(drop, step, solid, clip.power._height / 2)
    clip.power.gotoAndStop(drop.type + 1)
    clip._y = drop.y
    clip._alpha = drop.alpha
    clip.chute._xscale = drop.chute
    clip.chute._visible = drop.chute > 0
    const type = drop.type
    if (!hero.hitTest(clip.power)) return !drop.expired
    let label = type === 0 ? 'Health' : weaponNames[type]
    if (type < 13) playCue(pickupCues[type])
    if (type === 0) s.health = Math.min(100, s.health + 20)
    else if (type < 13) s.ammo[type] += weapons[type].ammo
    else {
      if (s.power === 2) {
        s.weapon = 0
        s.ammo[13] = 0
        hero.gun.gotoAndStop(1)
      }
      s.power = Math.floor(Math.random() * powers.length)
      label = powers[s.power]
      s.powerTicks = 500
      s.predatorFrame = s.jetpackFrames = 0
      playCue(powerCues[s.power])
      if (s.power === 2) {
        s.weapon = 13
        s.ammo[13] = Infinity
        s.reload[13] = 0
        hero.gun.gotoAndStop(14)
      }
    }
    showCombatLabel(label)
    return false
  })
  highScore = Math.max(highScore, Math.floor(s.score))
  if (s.health <= 0 || s.y >= map.length * tile) beginDeath()
}

function advanceGrappleWrecks(step) {
  state.wrecks = state.wrecks.filter(wreck => {
    const {crash} = stepDebris(wreck, step, solid)
    Object.assign(wreck.clip, {_x: wreck.x, _y: wreck.y, _rotation: wreck.rotation})
    wreck.shot.x = wreck.x + wreck.dx
    wreck.shot.y = wreck.y + wreck.dy
    if (!crash && wreck.y < map.length * tile) return true
    addEffect('Boom', wreck.clip._x, wreck.clip._y, 200)
    shards(wreck.clip._x, wreck.clip._y - tile / 2)
    playCue('boom')
    return false
  })
}

function advanceBlasts(step) {
  state.blasts = state.blasts.filter(blast => {
    if (blast.combatLabel) {
      const before = Math.floor(blast.age + 1e-9)
      blast.age += step
      const frame = Math.floor(blast.age + 1e-9)
      blast.clip._y -= frame - before
      blast.clip._alpha = Math.max(0, 100 - Math.max(0, frame - 32) * 10)
      return blast.clip._alpha > 0
    }
    blast.age += step
    blast.clip.gotoAndStop(1 + Math.floor(blast.age))
    return blast.age < blast.clip._totalframes
  })
}

function beginDeath() {
  const s = state
  clearInput()
  pauseButton.disabled = true
  rotor.pause()
  s.shots = []
  s.drops = []
  s.death = {
    ticks: 0, vx: Math.floor(Math.random() * 20) - 10,
    vy: -Math.floor(Math.random() * 10), settled: false,
  }
  hero = symbol('guyBurned')
  hero._x = s.x
  hero._y = Math.min(s.y - 24, map.length * tile - 52)
  explode({weapon: 10, x: hero._x, y: hero._y})
  if (heli) {
    destroyHelicopter()
    heli = undefined
  }
}

function tickDeath() {
  const s = state
  const death = s.death
  death.ticks++
  s.timeScale = Math.max(.2, s.timeScale - .1)
  const step = s.timeScale
  if (!death.settled) {
    death.vy += step
    hero._rotation += Math.abs(death.vx + death.vy) * step
    const x = hero._x + death.vx * step
    if (solid(x, hero._y)) death.vx *= -.5
    else hero._x = x
    const y = hero._y + death.vy * step
    if (solid(hero._x, y + 4) || y >= map.length * tile) {
      if (death.vy < 4 || y >= map.length * tile) death.settled = true
      death.vy *= -.5
    } else hero._y = y
  }
  advanceBlasts(step)
  advanceDebris(step)
  advanceGrappleWrecks(step)
  if (death.ticks > 200 || death.settled && !s.wrecks.length && !s.debris.length && !s.blasts.length) showResults()
}

function showResults() {
  const s = state
  const score = Math.floor(s.score) * 100
  recordRun(lifetime, s)
  saveRecords()
  status.textContent = `Game over · Score ${score} · Helicopters ${s.kills}`
  results = symbol('stats')
  results._x = 81 + extraWidth / 2
  results._y = 80
  results.submit._visible = false
  for (const child of results.children.values()) {
    if (child.symbol?.button) child._visible = false
  }
  const favorite = s.weaponUse.reduce((best, count, i, all) =>
    i > 0 && count > (best === 0 ? 0 : all[best]) ? i : best, 0)
  Object.assign(results, {
    score,
    time: Math.floor(s.survival / data.fps) + ' seconds',
    shots: s.fired, hits: s.hits,
    accuracy: (s.fired ? Math.floor(s.hits / s.fired * 100) : 0) + '%',
    weapon: s.fired ? weaponNames[favorite] : 'None',
    helis: s.kills,
  })
  if (enhancedArt) {
    for (const field of resultsFields) field.textContent = results[field.dataset.result]
    resultsPanel.hidden = false
    menuBack.textContent = 'Click here for main menu'
  }
  pauseButton.disabled = true
  play.textContent = 'Retry'
  menuBack.hidden = false
  play.hidden = false
  syncAudio()
  play.focus()

}

function drawTiles(entries, xOffset, yOffset) {
  for (const {x, y, clip} of entries) {
    if (x - xOffset < -tile || x - xOffset >= width || y - yOffset < -tile || y - yOffset >= height) continue
    clip._x = x - xOffset
    clip._y = y - yOffset
    clip.render(ctx, images)
  }
}

function drawTileLayer(layer, entries, xOffset, yOffset) {
  if (!layer) {
    drawTiles(entries, xOffset, yOffset)
    return
  }
  const {surface, left, top, width, height} = layer
  ctx.drawImage(surface, left - xOffset, top - yOffset, width, height)
}

const updateFps = mountFpsCounter(stage)

function draw(now) {
  updateFps(now)
  const dt = Math.min(100, now - (last ?? now))
  last = now
  if (!document.hidden) controller.poll(now)
  if (isPlaying() && !document.hidden) {
    elapsed += dt
    while (elapsed >= 1000 / data.fps && isPlaying()) {
      previousCamera = camera
      previousTop = cameraTop
      motion.captureScene({children: [hero, heli].filter(Boolean)})
      tick()
      elapsed -= 1000 / data.fps
    }
  } else elapsed = 0
  syncFlame()
  const bounds = canvas.getBoundingClientRect()
  const backing = displayCanvasSize(bounds.width, bounds.height, devicePixelRatio)
  if (canvas.width !== backing.width) canvas.width = backing.width
  if (canvas.height !== backing.height) canvas.height = backing.height
  const predatorFilter = !menu && !state?.death && state?.power === 2 ? 'invert(1)' : ''
  if (canvas.style.filter !== predatorFilter) canvas.style.filter = predatorFilter
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
  ctx.fillStyle = '#526374'
  ctx.fillRect(0, 0, width, height)
  if (menu) {
    // Extend the title backdrop without stretching the logo or the menu targets.
    const background = menu.bg
    if (background) {
      if (arenaArtwork) {
        ctx.drawImage(arenaArtwork, 0, 0, width, height)
      } else {
        ctx.save()
        ctx.scale(width / originalWidth, 1)
        background.render(ctx, images)
        ctx.restore()
      }
      background._visible = false
    }
    if (helpPanel.hidden) {
      menu.render(ctx, images)
      const selected = titleMenuButtons.find(button => button.dataset.highlighted === 'true')
      drawHudText(ctx, menuText, selected === play ? 'Start' : selected?.textContent)
    }
    if (background) background._visible = true
    requestAnimationFrame(draw)
    return
  }
  if (arenaArtwork) {
    ctx.drawImage(arenaArtwork, 0, 0, width, height)
  } else {
    ctx.save()
    ctx.scale(width / originalWidth, 1)
    arenaBackdrop.render(ctx, images)
    ctx.restore()
  }
  const cameraY = cameraTop
  if (isPlaying() && heli && !document.hidden) rotorPhase = (rotorPhase + dt * .067 * state.timeScale) % 16
  const fraction = isPlaying() ? elapsed / (1000 / data.fps) : 1
  const viewY = state ? previousTop + (cameraY - previousTop) * fraction : map.length * tile - height
  const viewX = state ? previousCamera + (camera - previousCamera) * fraction : 0
  motion.setFraction(fraction)
  const foliageY = Math.max(0, scenery.bgHeight - height - (map.length * tile - height - viewY) / 2)
  drawTileLayer(scenery.foliage, scenery.bg, viewX * .45, foliageY)
  drawTileLayer(scenery.foreground, scenery.world, viewX, viewY)
  if (state) {
    ctx.save()
    ctx.translate(-viewX, -viewY)
    heli?.render(ctx, images, undefined, motion)
    if (heli && images.get(79)?.remasteredHelicopter) drawHelicopterRotors(ctx, heli, rotorPhase, motion)
    hero.render(ctx, images, undefined, motion)
    for (const {clip} of state.drops) clip.render(ctx, images)
    for (const {clip} of state.blasts) clip.render(ctx, images)
    for (const {clip} of state.debris) clip.render(ctx, images)
    for (const {clip} of state.wrecks) clip.render(ctx, images)
    for (const shot of [...state.shots, ...state.wrecks.map(wreck => wreck.shot)]) {
      if (shot.weapon === 12 && !shot.enemy) {
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(state.x, state.y - 24)
        ctx.lineTo(shot.x, shot.y)
        ctx.stroke()
      }
      shot.pillar?.render(ctx, images)
      shot.sprite._x = shot.x
      shot.sprite._y = shot.y
      shot.sprite.render(ctx, images)
    }
    ctx.restore()
    hud.score = "Score: " + Math.floor(state.score) * 100
    hud.highscore = "High Score: " + Math.floor(highScore) * 100
    hud.time = "Time: " + Math.floor(state.survival / data.fps) + " seconds     Helis: " + state.kills
    hud.ammo = state.death ? "0 x " : Number.isFinite(state.ammo[state.weapon]) ? state.ammo[state.weapon] : '∞'
    hud.powerup._visible = !state.death && state.power >= 0
    hud.powerup.text = powers[state.power] ?? ""
    hud.powerup.powerup.mask._yscale = Math.max(0, state.powerTicks / 5)
    hud.health.mask._yscale = Math.max(0, state.health)
    hud.hyperjump.mask._xscale = state.death ? 0 : state.boost / 150 * 100
    hud.bullettime.mask._xscale = state.death ? 0 : state.time / 250 * 100
    hud.reload.mask._xscale = state.death ? 0 : Math.max(0, 1 - state.reload[state.weapon] / weapons[state.weapon].delay) * 100
    hud.reload.yellow._visible = !state.death && state.reload[state.weapon] === 0
    hud.weapon.gotoAndStop(state.weapon + 1)
    hud.render(ctx, images)
    drawHudText(ctx, hudText)
    if (!enhancedArt) results?.render(ctx, images)
  }
  requestAnimationFrame(draw)
}

play.addEventListener('click', begin)
menuBack.addEventListener('click', showMenu)
for (const [i, page] of helpPages.entries()) {
  const button = helpMenuButtons[i]
  button.addEventListener('click', () => {
    const heading = page.querySelector('h2')
    if (page.dataset.menuPage === 'stats') showLifetimeStats()
    if (page.dataset.menuPage === 'scores') showHighScores()
    document.querySelector('#ha2-stats-status').textContent = ''
    for (const section of helpPages) section.hidden = section !== page
    helpPanel.setAttribute('aria-labelledby', heading.id)
    helpPanel.hidden = false
    helpPanel.scrollTop = 0
    helpReturnFocus = button
    for (const target of titleMenuButtons) target.inert = true
    heading.focus({preventScroll: true})
  })
}
function closeHelp() {
  helpPanel.hidden = true
  captureAction = undefined
  refreshBindings()
  bindingStatus.textContent = ''
  for (const target of titleMenuButtons) target.inert = false
  helpReturnFocus?.focus()
}
for (const back of helpPanel.querySelectorAll('.ha2-info-back')) back.addEventListener('click', closeHelp)
returnButton.addEventListener('click', returnToCollection)
creditsButton.addEventListener('click', () => {
  creditsPanel.hidden = false
  for (const button of titleMenuButtons) button.inert = true
  document.querySelector('#ha2-credits-heading').focus()
})
function closeCredits() {
  creditsPanel.hidden = true
  for (const button of titleMenuButtons) button.inert = false
  creditsButton.focus()
}
document.querySelector('#ha2-credits-back').addEventListener('click', closeCredits)
creditsPanel.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeCredits()
})
canvas.addEventListener('pointermove', event => {
  controller.releaseAim()
  canvas.classList.remove('controller-aim')
  const bounds = canvas.getBoundingClientRect()
  pointer.x = (event.clientX - bounds.left) * width / bounds.width
  pointer.y = (event.clientY - bounds.top) * height / bounds.height
})
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || !canControl()) return
  canvas.setPointerCapture(event.pointerId)
  firing = true
})
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { firing = false })
window.addEventListener('keydown', event => {
  if (captureAction && !helpPanel.hidden) {
    event.preventDefault()
    if (event.repeat) return
    if (event.code === 'Escape') bindingStatus.textContent = 'Key change canceled.'
    else {
      if (!allowedKey(event.code)) {
        bindingStatus.textContent = 'Choose a letter, number, arrow, Shift, or Space.'
        return
      }
      const other = Object.keys(defaults).find(action => action !== captureAction && keyboard[action] === event.code)
      if (other) keyboard[other] = keyboard[captureAction]
      keyboard[captureAction] = event.code
      saveBindings()
      bindingStatus.textContent = 'Control updated.'
    }
    captureAction = undefined
    refreshBindings()
    return
  }
  if (!helpPanel.hidden && event.code === 'Escape') {
    event.preventDefault()
    closeHelp()
    return
  }
  const action = keyboardAction(keyboard, event.code)
  if (!action) return
  if (action === 'sound') {
    event.preventDefault()
    if (!event.repeat) toggleSound()
    return
  }
  if (action === 'pause' && play.hidden) {
    event.preventDefault()
    if (!event.repeat) setPaused(!controllerGame.paused)
    return
  }
  if (!canControl()) return
  event.preventDefault()
  if (action === 'endRun') {
    if (!event.repeat) {
      state.endedByPlayer = true
      beginDeath()
    }
    return
  }
  if (action === 'switch' && !event.repeat) switchWeapon()
  keys.set(event.code, action)
})
window.addEventListener('keyup', event => keys.delete(event.code))
window.addEventListener('blur', clearInput)
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true) })

for (const button of stage.querySelectorAll('button')) bindMenuHighlight(stage, button)

async function start() {
  // Start the title assets alongside the original arena files.
  const titleImages = enhancedArt && Promise.allSettled([
    loadArtworkImage(new URL('title-repaint.png', assets)),
    loadArtworkImage(new URL('arena-repaint.webp', assets)),
  ])
  const [manifest, maps] = await Promise.all(['symbols.json', 'maps.json'].map(async file => (await asset(file)).json()))
  data = manifest
  map = maps.map1
  for (const row of map) {
    const marker = row.findIndex(cell => cell[0] === 32)
    if (marker < 0) continue
    spawnColumn = marker
    row[marker][0] = 0
  }
  const masks = maskShapeIds(data)
  const entries = Object.entries(data.symbols).filter(([, info]) => info.kind === 'shape')
  const helicopterBitmaps = new Map()
  const helicopterCrew = new Map()
  const terrainBitmaps = new Map()
  const foliageBitmaps = new Map()
  images = new Map()
  images.maskPaths = new Map()
  await Promise.all(entries.map(async ([id, info]) => {
    const svg = await (await asset(`shapes/${id}.svg`)).text()
    if (['79','110','113','114'].includes(id)) {
      const bitmap = svg.match(/xlink:href="(data:image\/PNG;base64,[^"]+)"/)?.[1]
      if (bitmap) helicopterBitmaps.set(Number(id), bitmap)
      if (id === '79' || id === '110') helicopterCrew.set(Number(id), svg)
    }
    const bitmapSources = terrainShapeIds.includes(Number(id)) ? terrainBitmaps
      : foliageShapeIds.includes(Number(id)) ? foliageBitmaps : null
    if (enhancedArt && bitmapSources) {
      const bitmap = svg.match(/xlink:href="(data:image\/PNG;base64,[^"]+)"/)?.[1]
      if (bitmap) bitmapSources.set(Number(id), bitmap)
    }
    images.set(Number(id), await decodeVector(svg, {rasterize: true}))
    if (masks.has(Number(id))) images.maskPaths.set(Number(id), svgMaskPaths(svg, info.bounds))
  }))
  scenery = {world: tiles(map, 'tiles'), bg: tiles(maps.bglayer1_1, 'bg'), bgHeight: maps.bglayer1_1.length * tile}
  shapeHit = createShapeCollision(data, images)
  const gameplay = new Clip(data, -1)
  gameplay.gotoAndStop(29)
  arenaBackdrop = gameplay.bg
  if (enhancedArt) {
    const remasters = Promise.all([
      loadArtworkImage(new URL('helicopters-repaint.png', assets))
        .then(async atlas => {
          const crewRepaint = loadArtworkImage(new URL('door-gunner-repaint.png', assets)).catch(error => {
            console.warn('Door gunner repaint unavailable; using the original crew artwork.', error)
          })
          const [originals, crew] = await Promise.all([
            Promise.all([...helicopterBitmaps].map(async ([id, src]) => [id, await loadArtworkImage(src)])),
            crewRepaint.then(repaint => Promise.all([...helicopterCrew].map(async ([id, svg]) => [id, await decodeHelicopterCrew(id, svg, repaint)]))),
          ])
          prepareHelicopterArt(data, images, atlas, new Map(originals), new Map(crew))
        })
        .catch(error => console.warn('Helicopter repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('background-foliage-repaint.png', assets))
        .then(async atlas => {
          const bitmaps = await Promise.all([...foliageBitmaps].map(async ([id, src]) => [id, await loadArtworkImage(src)]))
          scenery.foliage = prepareFoliageArt(scenery.bg, new Map(bitmaps), atlas)
        })
        .catch(error => console.warn('Background foliage repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('terrain-repaint.png', assets))
        .then(async atlas => {
          const bitmaps = await Promise.all([...terrainBitmaps].map(async ([id, src]) => [id, await loadArtworkImage(src)]))
          scenery.foreground = prepareTerrainArt(scenery.world, new Map(bitmaps), atlas)
        })
        .catch(error => console.warn('Terrain repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('hud-bars-repaint.png', assets))
        .then(atlas => prepareHudBarArt(data, images, atlas))
        .catch(error => console.warn('HUD bar repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('pickup-crates-repaint.png', assets))
        .then(atlas => preparePickupCrateArt(data, images, atlas))
        .catch(error => console.warn('Pickup crate repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('parachute-repaint.png', assets))
        .then(painting => images.set(134, prepareParachuteArt(images.get(134), painting)))
        .catch(error => console.warn('Parachute repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('projectiles-repaint.png', assets))
        .then(atlas => prepareProjectileArt(data, images, atlas))
        .catch(error => console.warn('Projectile repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('held-weapons-repaint.png', assets))
        .then(atlas => prepareHeldWeaponArt(data, images, atlas))
        .catch(error => console.warn('Weapon repaint unavailable; using the original artwork.', error)),
      loadArtworkImage(new URL('player-repaint.png', assets))
        .then(atlas => preparePlayerArt(data, images, atlas))
        .catch(error => console.warn('Player repaint unavailable; using the original artwork.', error)),
    ])
    // Wait for both title layers before showing the first frame.
    const [title, backdrop] = await titleImages
    if (title.status === 'fulfilled') {
      const painting = prepareTitlePainting(images.get(titlePaintingId), title.value)
      painting.remasteredTitle = true
      images.set(titlePaintingId, painting)
    } else console.warn('Title repaint unavailable; using the original artwork.', title.reason)
    if (backdrop.status === 'fulfilled') {
      arenaArtwork = prepareArenaBackdrop(arenaBackdrop, backdrop.value, originalWidth, height)
    } else console.warn('Backdrop repaint unavailable; using the original artwork.', backdrop.reason)
    await remasters
  }
  play.disabled = false
  lifetime.launches++
  saveRecords()
  showMenu()
  requestAnimationFrame(now => {
    draw(now)
    document.documentElement.dataset.collectionLoad = 'ready'
  })
}

start().catch(error => {
  console.error(error)
  status.textContent = 'The Heli Attack 2 arena could not load.'
  document.documentElement.dataset.collectionLoad = 'failed'
})
