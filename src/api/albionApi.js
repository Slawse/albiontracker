const BASE_URL = 'http://localhost:3001'

export async function searchPlayerByName(name) {
  const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(name)}`)

  if (!res.ok) {
    throw new Error('Erreur search proxy')
  }

  const data = await res.json()

  return data.players?.[0] || null
}

export async function getPlayerProfile(id) {
  const res = await fetch(`${BASE_URL}/player/${id}`)

  if (!res.ok) {
    throw new Error('Erreur profile proxy')
  }

  return res.json()
}

export async function getPlayerKills(id) {
  const res = await fetch(`${BASE_URL}/kills/${id}`)

  if (!res.ok) {
    throw new Error('Erreur kills proxy')
  }

  return res.json()
}

export async function getPlayerDeaths(id) {
  const res = await fetch(`${BASE_URL}/deaths/${id}`)

  if (!res.ok) {
    throw new Error('Erreur deaths proxy')
  }

  return res.json()
}