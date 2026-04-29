import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())

const BASE = 'https://gameinfo-ams.albiononline.com/api/gameinfo'

app.get('/search', async (req, res) => {
  const q = req.query.q

  const response = await fetch(`${BASE}/search?q=${q}`)
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

  const response = await fetch(`${BASE}/players/${id}/kills`)
  const data = await response.json()

  res.json(data)
})

app.get('/deaths/:id', async (req, res) => {
  const id = req.params.id

  const response = await fetch(`${BASE}/players/${id}/deaths`)
  const data = await response.json()

  res.json(data)
})

app.listen(3001, () => {
  console.log('API proxy running on http://localhost:3001')
})