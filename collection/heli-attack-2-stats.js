const scoreLimit = 10

export function freshStats() {
  return {launches:0, games:0, score:0, shots:0, hits:0, time:0, kills:0, bestKills:0,
    bestTime:0, worstTime:null, hyperjumps:0, bulletTime:0, topScores:[], weaponUse:Array(14).fill(0)}
}

const count = value => Number.isFinite(value) && value >= 0 ? value : 0

export function readLifetimeStats(raw) {
  const stats = freshStats()
  try {
    const saved = JSON.parse(raw)
    if (!saved) return stats
    for (const key of Object.keys(stats)) {
      if (typeof stats[key] === 'number') stats[key] = count(saved[key])
    }
    stats.worstTime = Number.isFinite(saved.worstTime) && saved.worstTime >= 0 ? saved.worstTime : null
    if (Array.isArray(saved.topScores)) stats.topScores = rankScores(saved.topScores)
    stats.weaponUse = stats.weaponUse.map((_, i) => count(saved.weaponUse?.[i]))
  } catch {}
  return stats
}

function rankScores(scores) {
  return scores.map(value => Math.floor(count(value))).filter(score => score > 0)
    .sort((a, b) => b - a).slice(0, scoreLimit)
}

export function includeLegacyScore(stats, best) {
  if (best > (stats.topScores[0] ?? 0)) stats.topScores = rankScores([...stats.topScores, best])
}

export function recordRun(stats, run) {
  stats.games++
  stats.score += run.score
  stats.topScores = rankScores([...stats.topScores, run.score])
  stats.shots += run.fired
  stats.hits += run.hits
  stats.time += run.survival
  stats.kills += run.kills
  stats.hyperjumps += run.hyperjumps ?? 0
  stats.bulletTime += run.bulletTimeTicks ?? 0
  stats.bestKills = Math.max(stats.bestKills, run.kills)
  stats.bestTime = Math.max(stats.bestTime, run.survival)
  if (!run.endedByPlayer) stats.worstTime = Math.min(stats.worstTime ?? Infinity, run.survival)
  stats.weaponUse = stats.weaponUse.map((total,i) => total + (run.weaponUse[i] ?? 0))
}
