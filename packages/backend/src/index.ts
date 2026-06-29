import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { uploadRouter } from './routes/upload.js'
import { idolRouter } from './routes/idol.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3456

// Middleware
app.use(cors())
app.use(express.json({ limit: '20mb' }))

// Routes
app.use('/api/upload', uploadRouter)
app.use('/api/idol', idolRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'novaidol-backend', timestamp: Date.now() })
})

app.listen(PORT, () => {
  console.log(`[NovaIdol Backend] Running on http://localhost:${PORT}`)
  console.log(`  POST /api/upload/avatar  — Upload idol avatar image`)
  console.log(`  GET  /api/idol/:symbol   — Get idol metadata`)
  console.log(`  GET  /health             — Health check`)
})
