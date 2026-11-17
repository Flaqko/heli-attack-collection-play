import {bindMenuHighlight} from '../src/menu-highlight.js'
import {createCollectionMenu} from '../src/collection-menu.js'
import {returnToCollection} from '../src/collection-navigation.js'
import {collectionPreferences} from '../src/collection-preferences.js'
import {mountFpsCounter} from '../src/fps-counter.js'
import {Clip} from '../src/scene.js'
import {decodeVector} from '../src/startup.js'
import {bindControllerCursor, createController} from '../src/controller.js'
import {createMotionInterpolation} from '../src/motion-interpolation.js'
import {displayCanvasSize} from '../src/render-resolution.js'
import {enhancedArtwork} from './heli-attack-1-art.js'
import {keepFlightUpright, prepareFlightRotors} from './heli-attack-1-flight.js'
import {maskShapeIds, svgMaskPaths} from '../src/rendering.js'

const originalWidth = 550
const height = 400
const width = height * 16 / 9
const extraWidth = width - originalWidth
// Match the original edge-to-edge shot travel time in the wider arena.
const projectileSpeed = 7 * width / originalWidth
const playerEdgeInset = 15
const runningSpeed = 3 * (width - 2 * playerEdgeInset) / (originalWidth - 2 * playerEdgeInset)
const intro = 1
const title = 5
const results = 10
const gameplay = 15
const assets = new URL('./assets/heli-attack-1/', import.meta.url)
const stage = document.querySelector('#game-stage')
const updateFps = mountFpsCounter(stage)
const canvas = document.querySelector('canvas')
const action = document.querySelector('#play')
const returnButton = document.querySelector('#ha1-return')
const fullscreen = document.querySelector('#fullscreen')
const status = document.querySelector('#status')
const pausePanel = document.querySelector('#pause-panel')
const pause = document.querySelector('#pause')
const resume = document.querySelector('#resume')
const sound = document.querySelector('#sound')
const pauseSound = document.querySelector('#ha1-pause-sound')
const motion = createMotionInterpolation()
const keyboardGuide = 'A D / ← → Move · W / ↑ Jump · Mouse aim and fire · P pause'
const controllerGuide = 'Xbox · Left stick move · Right stick aim · RT fire · A jump · Menu pause'
const context = canvas.getContext('2d')
const collision = document.createElement('canvas')
collision.width = collision.height = 1
const hitContext = collision.getContext('2d', {willReadFrequently: true})
let audioContext, audioOutput, introSound
const shotFiles = ['1716_sBulletSmall0.mp3', '1715_sBullet.mp3', '1725_sRocketlauncher.mp3', '1717_sFlame.mp3', '1727_sShotgun.mp3']
const shotSounds = new Map()
const keys = new Set()
const controls = {ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39}
const movementAliases = {ArrowLeft: 'KeyA', ArrowUp: 'KeyW', ArrowRight: 'KeyD'}
const scoreKey = 'heli-attack-1.highscore'
const soundPreference = collectionPreferences().sound
function readSetting(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function saveSetting(key, value) {
  try { localStorage.setItem(key, String(value)) } catch {}
}
let muted = !soundPreference.get()
const pointer = {x: width / 2, y: height / 2}
const weapon = [
  {rate: 5, damage: 5, points: 100, shot: 1, pose: 1},
  {name: 'HEALTH', pose: 1},
  {name: 'MACHINE GUN', rate: 2, damage: 4, points: 75, shot: 1, pose: 1},
  {name: 'ROCKET LAUNCHER', rate: 25, damage: 45, points: 250, shot: 2, pose: 2},
  {name: 'FLAMETHROWER', rate: 2, damage: 3, points: 25, shot: 3, pose: 3},
  {name: 'SHOTGUN', rate: 15, damage: 5, points: 25, shot: 1, pose: 4},
  {name: 'INVINSIBILITY', pose: 1},
]
const layers = [
  {depth: 2, repeats: [4, 5], divisor: 8, gap: 30},
  {depth: 6, repeats: [9, 10], divisor: 2, gap: 0},
  {depth: 13, repeats: [15, 16], divisor: 1, gap: 0.5, gameplayScale: 0.5},
]
let data, root, state, projectiles, effects
let scene = 0
let score = 0
let best = Number(readSetting(scoreKey)) || 0
let paused = false
let controllerConnected = false
let shooting = false
let menuButton
let images = new Map()
const random = limit => Math.floor(Math.random() * limit)
const clamp = (n, low, high) => Math.max(low, Math.min(high, n))
const degrees = radians => radians * 180 / Math.PI
const angleTo = (x, y, target) => degrees(Math.atan2(target.y - y, target.x - x))

const controllerGame = {
  root: {pointer, stats: {leftKey: 37, upKey: 38, rightKey: 39}},
  controllerKeys: new Set(),
}
const quickMenu = createCollectionMenu(stage, {onExit: returnToCollection})
const cursor = bindControllerCursor(canvas)
const controller = createController({
  game: controllerGame,
  getGamepads: () => {
    try { return navigator.getGamepads?.() } catch { return [] }
  },
  getLayer: () => quickMenu.open ? quickMenu.element : paused ? pausePanel : stage,
  isPlaying: () => scene === gameplay && !paused,
  onMenuPress: () => { if (quickMenu.open || (scene === title)) quickMenu.toggle() },
  onPause: () => setPaused(!paused),
  onConnection: connected => {
    controllerConnected = connected
    if (!connected) cursor.show()
    if (data) status.textContent = connected ? controllerGuide : keyboardGuide
  },
  getAimOrigin: () => {
    const player = root?.guy
    if (player?.gun) return {x: player._x + player.gun._x, y: player._y + player.gun._y}
  },
  waitForConfirmRelease: window.frameElement?.dataset.controllerLaunch === 'true',
  onControllerInput: cursor.hide,
  onGameplayInput: () => canvas.classList.add('controller-aim'),
})

function setPaused(value) {
  if (scene !== gameplay || paused === value) return
  paused = value
  controllerGame.paused = value
  pausePanel.hidden = !paused
  pause.textContent = paused ? 'Continue' : 'Pause'
  clearInput()
  motion.reset()
  if (paused) resume.focus({preventScroll: true})
  else canvas.focus({preventScroll: true})
}

function unlockAudio() {
  if (!audioContext) {
    audioContext = new AudioContext()
    audioOutput = audioContext.createGain()
    audioOutput.gain.value = muted ? 0 : 1
    audioOutput.connect(audioContext.destination)
    for (const file of shotFiles) {
      fetch(new URL('../assets/sounds/' + file, import.meta.url))
        .then(response => {
          if (!response.ok) throw Error('Could not load ' + file)
          return response.arrayBuffer()
        })
        .then(bytes => audioContext.decodeAudioData(bytes))
        .then(buffer => shotSounds.set(file, buffer))
        .catch(error => console.warn('Could not load a shooting sound.', error))
    }
    introSound = fetchAsset('intro.mp3')
      .then(response => response.arrayBuffer())
      .then(bytes => audioContext.decodeAudioData(bytes))
      .catch(error => {
        console.warn('Could not decode the original Heli Attack intro audio.', error)
        return null
      })
  }
  return audioContext.resume()
}

async function playIntroSound() {
  const buffer = await introSound
  if (!buffer || scene !== intro || audioContext.state !== 'running') return
  playSound(buffer)
}

function playSound(buffer, volume = 1) {
  if (!buffer || muted || audioContext?.state !== 'running') return
  const source = audioContext.createBufferSource()
  source.buffer = buffer
  const gain = audioContext.createGain()
  gain.gain.value = volume
  source.connect(gain).connect(audioOutput)
  source.start()
}

function syncSound() {
  if (audioOutput) audioOutput.gain.value = muted ? 0 : 1
  for (const button of [sound, pauseSound]) {
    button.textContent = muted ? 'Sound off' : 'Sound on'
    button.setAttribute('aria-pressed', String(!muted))
  }
}

async function fetchAsset(path) {
  const response = await fetch(new URL(path, assets))
  if (!response.ok) throw Error(`Could not load ${path}`)
  return response
}

function layoutStage(frame) {
  for (const clip of root.children.values()) {
    switch (clip.id) {
      case 32: case 42: case 44: case 45: case 51: case 52: case 53:
      case 56: case 57: case 69: case 122:
        clip._x += extraWidth / 2
        break
      case 33: case 41:
        clip._xscale *= width / originalWidth
        break
      case 38:
        clip._x += extraWidth / 2
        break
      case 67: case 68: case 127:
        clip._x += extraWidth
        break
    }
  }
  if (frame === intro) return
  for (const {depth, repeats} of layers) {
    const clip = root.children.get(depth)
    const repeat = root.add(new Clip(data, clip.id, root, '', repeats[1]))
    repeat.setPlacement({matrix: clip.matrix})
  }
  parallax(0)
}

function show(frame) {
  root = new Clip(data, -1)
  root.gotoAndStop(frame)
  for (const clip of root.children.values()) {
    if (clip.symbol?.kind !== 'text') continue
    clip._x += 2
    clip._y += 4.5
  }
  layoutStage(frame)
  scene = frame
  pause.disabled = frame !== gameplay
  motion.reset()
  shooting = false
  projectiles = []
  effects = []
  action.hidden = frame === gameplay || frame === intro
  returnButton.hidden = frame !== title
  action.classList.toggle('game-action', frame === title || frame === results)
  menuButton = [...root.children.values()].find(clip => clip.id === (frame === title ? 47 : 54))
  if (frame === title || frame === results) {
    action.textContent = frame === title ? 'Start game' : 'Play again'

    action.focus({preventScroll: true})
  }
  if (frame === gameplay) {
    score = 0
    state = {
      health: 100, copterHealth: 125, kills: 0, dropType: 1 + random(6), playerTicks: 0,
      enemyTicks: 0, crashSpeed: 1, mode: 0, timer: 0, stats: weapon[0], depth: 0,
    }
    for (const clip of [root.bullet, root.badbullet, root.smoke, root.boom, root.infoClip]) clip._visible = false
    root.guy.stop()
    root.powerup.stop()
    placeDrop()
    resetCopter()
    canvas.focus({preventScroll: true})
  }
  root.score = score
  root.highscore = best
  root.health = state?.health ?? 100
  stage.dataset.scene = ({1: 'intro', 5: 'title', 10: 'results', 15: 'gameplay'})[frame]
}

function resetCopter() {
  root.copter.gotoAndPlay(random(8) * 200 || 1)
  state.copterHealth = 125
}

function placeDrop() {
  const drop = root.powerup
  drop.gotoAndStop(1)
  drop._x = drop._width + random(width - drop._width)
  if (state.dropType === 6) drop.guy.play()
  else drop.guy.gotoAndStop(state.dropType)
}

function duplicate(template, depth, x, y) {
  const clip = root.add(new Clip(data, template.id, root, `effect${state.depth}`, depth + state.depth++))
  clip.setPlacement({matrix: template.matrix})
  clip._x = x
  clip._y = y
  return clip
}

function effect(template, depth, x, y, end) {
  const clip = duplicate(template, depth, x, y)
  effects.push({clip, end})
  return clip
}

function award(amount) {
  score += amount
  if (score > best) {
    best = score
    saveSetting(scoreKey, best)
  }
}

function setMode(mode) {
  state.mode = mode
  state.timer = mode === 1 ? 1 : mode ? 320 : 0
  const stats = weapon[mode]
  if (stats.rate) state.stats = stats
  if (!mode) {
    root.guy.colorTransform = undefined
    if (root.bar._currentframe !== 1) root.bar.play()
    return
  }
  const info = effect(root.infoClip, 100, clamp(root.guy._x, 55, width - 55), root.guy._y - root.guy._height * 1.5, 24)
  info.children.get(1).title = stats.name
  if (mode === 1) state.health += 25
  else if (mode === 6) root.guy.colorTransform = {ga: 0, ba: 0}
  if (mode !== 1 && root.bar._currentframe === 1) root.bar.play()
}

function spawnShot(gun, heading, enemy) {
  const origin = {x: 0, y: 0}
  gun.barrel.localToGlobal(origin)
  const clip = duplicate(enemy ? root.badbullet : root.bullet, 10000, origin.x, origin.y)
  const radians = heading * Math.PI / 180
  const stats = state.stats
  clip._rotation = heading
  clip.gotoAndStop(enemy ? 1 : stats.shot)
  projectiles.push({clip, vx: projectileSpeed * Math.cos(radians), vy: projectileSpeed * Math.sin(radians), enemy, stats, ticks: 0})
}

function aim(gun, angle, tilt = 0) {
  gun._rotation = angle - tilt
  gun._yscale = Math.abs(angle) > 90 ? -100 : 100
}

const held = key => keys.has(key) || keys.has(movementAliases[key]) || controllerGame.controllerKeys.has(controls[key])

function movePlayer() {
  const player = root.guy
  const frame = player._currentframe
  if (held('ArrowUp') && frame < 14) player.gotoAndPlay(14)
  const right = held('ArrowRight')
  const left = held('ArrowLeft')
  let speed = 0
  if (right && player._x < width - playerEdgeInset) {
    player._x = Math.min(width - playerEdgeInset, player._x + runningSpeed)
    speed = -runningSpeed
  }
  if (left && player._x > playerEdgeInset) {
    player._x = Math.max(playerEdgeInset, player._x - runningSpeed)
    speed = runningSpeed
  }
  if (player._currentframe < 14) {
    if (left === right) {
      player.gotoAndStop(1)
      speed = 0
    } else player.play()
  }
  const gun = player.gun?.gun
  if (!gun) return speed
  const heading = angleTo(player._x + player.gun._x, player._y + player.gun._y, pointer)
  const pose = weapon[state.mode].pose
  if (gun._currentframe !== pose) gun.gotoAndStop(pose)
  aim(gun, heading)
  state.playerTicks++
  if ((shooting || controllerGame.controllerFire || controllerGame.controllerShot) && gun.barrel && state.playerTicks > state.stats.rate) {
    controllerGame.controllerShot = false
    if (state.mode === 5) {
      for (let pellet = 0; pellet < 4; pellet++) spawnShot(gun, heading + Math.max(0, random(30) - random(15)), false)
    }
    spawnShot(gun, heading, false)
    const soundIndex = Math.max(0, weapon.indexOf(state.stats) - 1)
    playSound(shotSounds.get(shotFiles[soundIndex]), .45)
    state.playerTicks = 0
  }
  return speed
}

function updateCopter() {
  const copter = root.copter.copter
  if (!copter?.gun?.barrel) return
  if (state.copterHealth <= 0) {
    award(1000)
    if (++state.kills % 3 === 0) root.powerup.gotoAndPlay(1)
    const crash = root.crash
    crash._x = root.copter._x + copter._x
    crash._y = root.copter._y + copter._y
    crash._rotation = copter._rotation
    crash.gotoAndPlay(copter.id === 112 ? 1 : 20)
    crash.play()
    state.crashSpeed = 1
    resetCopter()
    return
  }
  const heading = angleTo(root.copter._x + copter._x, root.copter._y + copter._y, {x: root.guy._x, y: root.guy._y})
  aim(copter.gun, heading, copter._rotation)
  if (state.enemyGun !== copter.gun) {
    state.enemyGun = copter.gun
    state.enemyTicks = 0
  }
  if (++state.enemyTicks > (copter.id === 112 ? 7 + random(5) : 5)) {
    spawnShot(copter.gun, heading - random(9) - random(18), true)
    playSound(shotSounds.get(shotFiles[1]), .22)
    state.enemyTicks = 0
  }
}

function hit(clip, x, y) {
  if (!clip.hitTest(x, y)) return false
  hitContext.resetTransform()
  hitContext.clearRect(0, 0, 1, 1)
  hitContext.translate(.5 - x, .5 - y)
  if (clip._parent) hitContext.transform(...clip._parent.globalMatrix)
  clip.render(hitContext, images)
  return hitContext.getImageData(0, 0, 1, 1).data[3] > 127
}

function moveShots() {
  projectiles = projectiles.filter(shot => {
    const {clip, enemy, stats} = shot
    clip._x += shot.vx
    clip._y += shot.vy
    const x = clip._x
    const y = clip._y
    const outside = x < 0 || x > width || y < 0 || y > 390
    const impact = hit(enemy ? root.guy : root.copter, x, y)
    if (impact && enemy && state.mode !== 6) state.health -= 5
    if (impact && !enemy) {
      state.copterHealth -= stats.damage
      award(stats.points)
    }
    if (!enemy && stats.shot === 2) {
      if (outside || impact) effect(root.boom, 1000000, x, y, 10)
      if (++shot.ticks % 2 === 0) effect(root.smoke, 1000000, x, y, 11)
    }
    if (outside || impact && (enemy || stats.shot !== 3)) {
      clip.removeMovieClip()
      return false
    }
    return true
  })
}

function parallax(speed) {
  for (const {depth, repeats, divisor, gap, gameplayScale = 1} of layers) {
    const clip = root.children.get(depth)
    const period = clip._width + gap
    const offset = clip.bounds().xMin
    const scroll = speed / divisor * (scene === gameplay ? gameplayScale : 1)
    const x = clip._x + scroll
    clip._x = ((x + offset) % period + period) % period - period - offset
    repeats.forEach((repeat, index) => {
      root.children.get(repeat)._x = clip._x + (index + 1) * period
    })
  }
}

function tick() {
  root.advance()
  if (scene === intro) {
    const frame = root.children.get(1)._currentframe
    if (frame === 19) void playIntroSound()
    if (frame >= 54) show(title)
    return
  }
  if (scene !== gameplay) {
    parallax(8)
    return
  }
  if (state.health <= 0) {
    show(results)
    return
  }
  const drop = root.powerup
  if (drop.guy?.hitTest(root.guy.guy)) {
    setMode(drop.guy._currentframe)
    state.playerTicks = 100
    const previous = state.dropType
    do state.dropType = random(6) + 1
    while (state.dropType === previous)
    placeDrop()
  } else if (state.timer) {
    if (--state.timer === 0) setMode(0)
    else root.bar.bar.juice._yscale = state.timer / 320 * 100
  }
  const crash = root.crash
  if (crash._currentframe === 5 || crash._currentframe === 22) {
    crash._y += state.crashSpeed++
    if (crash._y + 60 >= 390) crash.play()
  }
  parallax(movePlayer())
  updateCopter()
  moveShots()
  effects = effects.filter(({clip, end}) => {
    if (clip._currentframe !== end) return true
    clip.removeMovieClip()
    return false
  })
  root.score = score
  root.highscore = best
  root.health = state.health
}

function updatePointer(event) {
  controller.releaseAim()
  canvas.classList.remove('controller-aim')
  const bounds = canvas.getBoundingClientRect()
  pointer.x = (event.clientX - bounds.left) * width / bounds.width
  pointer.y = (event.clientY - bounds.top) * height / bounds.height
}

function activateAudio() {
  if (typeof AudioContext === 'function') {
    unlockAudio().catch(error => console.warn('Could not start Heli Attack audio.', error))
  }
}

window.addEventListener('pointerdown', activateAudio, {once: true})
window.addEventListener('keydown', activateAudio, {once: true})
for (const button of stage.querySelectorAll('button')) bindMenuHighlight(stage, button)
returnButton.addEventListener('click', returnToCollection)
action.addEventListener('click', () => {
  if (scene === title) show(gameplay)
  else if (scene === results) show(title)
})
for (const [event, frame] of [['pointerenter', 2], ['pointerleave', 1], ['pointerdown', 3], ['pointerup', 2]]) {
  action.addEventListener(event, () => menuButton?.gotoAndStop(frame))
}
canvas.addEventListener('pointermove', updatePointer)
canvas.addEventListener('pointerdown', event => {
  if (scene !== gameplay || paused || event.button !== 0) return
  updatePointer(event)
  canvas.focus({preventScroll: true})
  canvas.setPointerCapture(event.pointerId)
  shooting = true
})
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { shooting = false })
window.addEventListener('keydown', event => {
  const pauseShortcut = event.code === 'KeyP' && !event.ctrlKey && !event.altKey && !event.metaKey
  if (scene === gameplay && (pauseShortcut || event.code === 'Escape')) {
    if (event.code === 'Escape' && document.fullscreenElement && !paused) return
    event.preventDefault()
    if (!event.repeat) setPaused(!paused)
    return
  }
  if (paused) return
  if (scene !== gameplay || !(Object.hasOwn(controls, event.code) || Object.values(movementAliases).includes(event.code))) return
  keys.add(event.code)
  event.preventDefault()
})
window.addEventListener('keyup', event => keys.delete(event.code))
function clearInput() {
  keys.clear()
  shooting = false
  controller.clear()
}
window.addEventListener('blur', clearInput)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) setPaused(true)
})
pause.addEventListener('click', () => setPaused(!paused))
resume.addEventListener('click', () => setPaused(false))
document.querySelector('#ha1-back-to-title').addEventListener('click', () => {
  setPaused(false)
  show(title)
})
function toggleSound() {
  soundPreference.set(muted)
  if (!muted && audioContext) unlockAudio().catch(error => console.warn('Could not resume Heli Attack audio.', error))
}
sound.addEventListener('click', toggleSound)
pauseSound.addEventListener('click', toggleSound)
soundPreference.subscribe(enabled => {
  muted = !enabled
  syncSound()
})
syncSound()
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await stage.requestFullscreen()
  } catch {
    status.textContent = 'Fullscreen is unavailable.'
  }
})
document.addEventListener('fullscreenchange', () => {
  fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'
})

async function start() {
  const manifest = await (await fetchAsset('symbols.json')).json()
  // Widen only the helicopter's path. Its body and rotor retain their authored proportions.
  const flight = manifest.symbols[114]
  for (const frame of flight.frames) {
    for (const placement of frame) {
      keepFlightUpright(placement.matrix)
      placement.matrix[4] = (230 + placement.matrix[4]) * width / originalWidth - 230
    }
  }
  const masks = maskShapeIds(manifest)
  const shapes = Object.entries(manifest.symbols).filter(([, symbol]) => symbol.kind === 'shape')
  const font = new FontFace('HeliImpact', `url("${new URL('impact.ttf', assets)}")`)
  const maskPaths = new Map()
  const [loadedImages, loadedFont] = await Promise.all([
    Promise.all(shapes.map(async ([id, symbol]) => {
      const svg = await (await fetchAsset(`shapes/${id}.svg`)).text()
      const image = await decodeVector(enhancedArtwork(id, svg), {rasterize: true})
      if (masks.has(Number(id))) maskPaths.set(Number(id), svgMaskPaths(svg, symbol.bounds))
      return [Number(id), image]
    })),
    font.load(),
  ])
  images = new Map(loadedImages)
  prepareFlightRotors(manifest.symbols, images)
  images.maskPaths = maskPaths
  document.fonts.add(loadedFont)
  data = manifest
  status.textContent = controllerConnected ? controllerGuide : keyboardGuide
  action.disabled = false
  show(intro)
  if (navigator.userActivation?.hasBeenActive) activateAudio()
  fullscreen.disabled = !document.fullscreenEnabled
  const interval = 1000 / data.fps
  let last
  let accumulated = 0
  function paint() {
    const bounds = canvas.getBoundingClientRect()
    const {width: backingWidth, height: backingHeight} = displayCanvasSize(bounds.width, bounds.height, devicePixelRatio)
    if (canvas.width !== backingWidth) canvas.width = backingWidth
    if (canvas.height !== backingHeight) canvas.height = backingHeight
    context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
    context.clearRect(0, 0, width, height)
    root.render(context, images, undefined, motion)
    if (!action.hidden && action.dataset.highlighted === 'true') {
      const label = [...root.children.values()].find(clip => clip.id === (scene === title ? 44 : 52))
      if (label) {
        context.save()
        context.shadowColor = '#fff'
        context.shadowBlur = Math.max(2, canvas.width / width * 2)
        label.render(context, images)
        context.restore()
      }
    }
  }
  function draw(now) {
    updateFps(now)
    const elapsed = last === undefined ? 0 : now - last
    last = now
    if (!document.hidden) controller.poll(now)
    if (root) {
      if (paused || document.hidden) accumulated = 0
      else accumulated += Math.min(elapsed, 100)
      while (accumulated >= interval) {
        motion.captureScene(root)
        tick()
        accumulated -= interval
      }
      motion.setFraction(paused ? 1 : accumulated / interval)
      paint()
    }
  }

  function drawFrame(now) {
    try {
      draw(now)
      document.documentElement.dataset.collectionLoad ??= 'ready'
      requestAnimationFrame(drawFrame)
    } catch (error) {
      reportGameError(error)
    }
  }

  requestAnimationFrame(drawFrame)
}

function reportGameError(error) {
  console.error(error)
  status.textContent = 'Heli Attack 1 stopped. Reload to try again.'
  document.documentElement.dataset.collectionLoad = 'failed'
}

start().catch(reportGameError)
