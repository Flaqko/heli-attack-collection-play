export function createCollectionPreferences(window, storage) {
  function read(key) {
    try { return storage.getItem(key) } catch { return null }
  }

  function preference(name, fallback) {
    const key = 'heli-attack-collection.' + name
    const listeners = new Set()
    let value = readValue()

    function readValue() {
      const saved = read(key)
      return saved === 'on' ? true : saved === 'off' ? false : fallback()
    }

    function update(next) {
      if (value === next) return
      value = next
      for (const listener of listeners) listener(value)
    }

    window.addEventListener('storage', event => {
      if (event.storageArea === storage && (event.key === key || event.key === null)) update(readValue())
    })

    return {
      get: () => value,
      set(next) {
        try { storage.setItem(key, next ? 'on' : 'off') } catch {}
        update(next)
      },
      subscribe(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
  }

  return {
    sound: preference('sound', () => ['heli-attack-1.sound', 'heli-attack-2.sound'].every(key => read(key) !== 'off')),
    fps: preference('fps', () => false),
  }
}

let settings

export function collectionPreferences() {
  if (!settings) {
    let storage
    try { storage = window.localStorage } catch {}
    settings = createCollectionPreferences(window, storage)
  }
  return settings
}
