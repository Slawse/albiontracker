import express from 'express'
import cors from 'cors'
import fs from 'fs'

const app = express()
app.use(cors())

const BASE = 'https://gameinfo-ams.albiononline.com/api/gameinfo'
const PORT = 3001

const DATA_PATH = './server-data'
const EVENTS_FILE = `${DATA_PATH}/events.json`

if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH)
}

if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([]))
}

function loadEvents() {
  return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'))
}

function saveEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2))
}

async function fetchAndStoreEvents() {
  try {
    const response = await fetch(`${BASE}/events?limit=51`)
    const newEvents = await response.json()

    let stored = loadEvents()
    const existingIds = new Set(stored.map((event) => event.EventId))

    const fresh = newEvents.filter((event) => !existingIds.has(event.EventId))

    if (fresh.length > 0) {
      stored = [...fresh, ...stored].slice(0, 5000)
      saveEvents(stored)

      console.log(`+${fresh.length} nouveaux events ajoutés`)
    }
  } catch (error) {
    console.error('Erreur fetch events:', error)
  }
}

setInterval(fetchAndStoreEvents, 60000)
fetchAndStoreEvents()

app.get('/search', async (req, res) => {
  const q = req.query.q || ''

  const response = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`)
  const data = await response.json()

  res.json(data)
})

app.get('/player/:id', async (req, res) => {
  const id = req.params.id

  const response = await fetch(`${BASE}/players/${id}`)
  const data = await response.json()

  res.json(data)
})

app.get('/kills/:id', async (req, res) => {
  const id = req.params.id
  const limit = req.query.limit || 50

  const response = await fetch(`${BASE}/players/${id}/kills?limit=${limit}`)
  const data = await response.json()

  res.json(data)
})

app.get('/deaths/:id', async (req, res) => {
  const id = req.params.id
  const limit = req.query.limit || 50

  const response = await fetch(`${BASE}/players/${id}/deaths?limit=${limit}`)
  const data = await response.json()

  res.json(data)
})

app.get('/events', async (req, res) => {
  const limit = req.query.limit || 51
  const offset = req.query.offset || 0

  const response = await fetch(`${BASE}/events?limit=${limit}&offset=${offset}`)
  const data = await response.json()

  res.json(data)
})

app.get('/force-player', async (req, res) => {
  const { id } = req.query

  if (!id) {
    return res.json({ added: 0 })
  }

  try {
    const killsRes = await fetch(`${BASE}/players/${id}/kills`)
    const deathsRes = await fetch(`${BASE}/players/${id}/deaths`)

    const kills = await killsRes.json()
    const deaths = await deathsRes.json()

    let stored = loadEvents()
    const existingIds = new Set(stored.map((event) => event.EventId))

    const fresh = [...kills, ...deaths].filter(
      (event) => !existingIds.has(event.EventId)
    )

    if (fresh.length > 0) {
      stored = [...fresh, ...stored].slice(0, 5000)
      saveEvents(stored)
    }

    res.json({ added: fresh.length })
  } catch (error) {
    console.error('Erreur force-player:', error)
    res.status(500).json({ error: true })
  }
})

app.get('/player-events', (req, res) => {
  const { id, name, limit = 50 } = req.query

  if (!id && !name) {
    return res.json([])
  }

  const events = loadEvents()
  const searchName = name?.toLowerCase()

  const filtered = events.filter((event) => {
    const killerId = event.Killer?.Id
    const victimId = event.Victim?.Id

    const killerName = event.Killer?.Name?.toLowerCase()
    const victimName = event.Victim?.Name?.toLowerCase()

    return (
      killerId === id ||
      victimId === id ||
      killerName === searchName ||
      victimName === searchName
    )
  })

  const sorted = filtered
    .sort((a, b) => new Date(b.TimeStamp) - new Date(a.TimeStamp))
    .slice(0, Number(limit))

  res.json(sorted)
})

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})