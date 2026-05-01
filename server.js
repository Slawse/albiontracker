import express from 'express'
import cors from 'cors'
import fs from 'fs'

const app = express()
app.use(cors())
app.use(express.json())

const BASE = 'https://gameinfo-ams.albiononline.com/api/gameinfo'
const PORT = 3001

const DATA_PATH = './server-data'
const EVENTS_FILE = `${DATA_PATH}/events.json`

const PRICE_BASE = 'https://europe.albion-online-data.com/api/v2/stats/prices'
const PRICE_LOCATIONS = [
  'Caerleon',
  'Bridgewatch',
  'Martlock',
  'Fort Sterling',
  'Lymhurst',
  'Thetford',
  'Brecilien',
]

const PRICE_CACHE_TTL = 1000 * 60 * 10
const priceCache = new Map()

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

function getSafeQuality(value) {
  const quality = Number(value || 1)

  if (quality >= 1 && quality <= 5) {
    return quality
  }

  return 1
}

function getBestPrice(prices = []) {
  const validSellPrices = prices
    .map((price) => {
      const best =
        price.sell_price_min > 0
          ? price.sell_price_min
          : price.sell_price_max > 0
            ? price.sell_price_max
            : price.buy_price_max > 0
              ? price.buy_price_max
              : 0

      const updatedAt =
        price.sell_price_min_date !== '0001-01-01T00:00:00'
          ? price.sell_price_min_date
          : price.sell_price_max_date !== '0001-01-01T00:00:00'
            ? price.sell_price_max_date
            : price.buy_price_max_date

      return {
        city: price.city,
        quality: price.quality,
        price: best,
        updatedAt,
      }
    })
    .filter((price) => price.price && price.price > 0)

  if (validSellPrices.length === 0) {
    return null
  }

  validSellPrices.sort((a, b) => a.price - b.price)

  return validSellPrices[0]
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

async function fetchAlbionPrices(itemIds = [], quality = 1) {
  const cleanItemIds = itemIds.filter(Boolean)

  if (cleanItemIds.length === 0) return []

  const locations = PRICE_LOCATIONS.join(',')
  const encodedItems = cleanItemIds.map((id) => encodeURIComponent(id)).join(',')

  const url = `${PRICE_BASE}/${encodedItems}.json?locations=${encodeURIComponent(locations)}&qualities=${quality}`

  const response = await fetch(url)

  if (!response.ok) {
    return []
  }

  return response.json()
}

async function getItemPrice(itemId, quality = 1) {
  const safeQuality = getSafeQuality(quality)
  const cacheKey = `${itemId}:${safeQuality}`
  const cached = priceCache.get(cacheKey)

  if (cached && Date.now() - cached.createdAt < PRICE_CACHE_TTL) {
    return cached.data
  }

  const prices = await fetchAlbionPrices([itemId], safeQuality)
  const bestPrice = getBestPrice(prices)

  const data = {
    itemId,
    requestedQuality: safeQuality,
    usedQuality: safeQuality,
    fallback: false,
    bestPrice,
    prices,
  }

  if (bestPrice) {
    priceCache.set(cacheKey, {
      createdAt: Date.now(),
      data,
    })
  }

  return data
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

app.get('/item-price/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params
    const quality = getSafeQuality(req.query.quality)

    if (!itemId) {
      return res.status(400).json({ error: 'itemId manquant' })
    }

    const data = await getItemPrice(itemId, quality)

    res.json(data)
  } catch (error) {
    console.error('Erreur /item-price:', error)
    res.status(500).json({ error: 'Erreur serveur item-price' })
  }
})

app.post('/gear-value', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : []

    if (items.length === 0) {
      return res.json({
        total: 0,
        pricedCount: 0,
        itemCount: 0,
        items: [],
      })
    }

    const cleanItems = items
      .filter((item) => item?.type)
      .map((item) => ({
        type: String(item.type),
        quality: getSafeQuality(item.quality),
        count: Number(item.count || 1),
      }))

    const pricedItems = await Promise.all(
      cleanItems.map(async (item) => {
        const priceData = await getItemPrice(item.type, item.quality)
        const price = Number(priceData?.bestPrice?.price || 0)

        return {
          ...item,
          price,
          total: price * item.count,
          found: price > 0,
          city: priceData?.bestPrice?.city || '',
          fallback: priceData?.fallback || false,
          usedQuality: priceData?.usedQuality || item.quality,
        }
      })
    )

    const total = pricedItems.reduce((sum, item) => sum + item.total, 0)
    const pricedCount = pricedItems.filter((item) => item.found).length

    res.json({
      total,
      pricedCount,
      itemCount: cleanItems.length,
      items: pricedItems,
    })
  } catch (error) {
    console.error('Erreur /gear-value:', error)
    res.status(500).json({ error: 'Erreur serveur gear-value' })
  }
})

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`)
})