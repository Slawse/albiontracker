export function getItemImage(itemId) {
  if (!itemId) return ''
  return `https://render.albiononline.com/v1/item/${itemId}.png`
}

export function cleanItemName(itemId) {
  if (!itemId) return 'Inconnu'

  return itemId
    .replace(/^T\d_/, '')
    .replace(/@.*/, '')
    .replaceAll('_', ' ')
    .toLowerCase()
}