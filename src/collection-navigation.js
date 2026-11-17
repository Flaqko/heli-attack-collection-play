export function returnToCollection() {
  if (window.frameElement?.hasAttribute('data-collection-player')) {
    window.parent.location.hash = ''
  } else {
    window.location.assign(new URL('../collection/', import.meta.url))
  }
}
