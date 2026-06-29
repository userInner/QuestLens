import { Router, Request, Response } from 'express'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IDOLS_DIR = join(__dirname, '..', '..', '..', 'frontend', 'public', 'idols')

export const uploadRouter = Router()

/**
 * POST /api/upload/avatar
 * Body: { symbol: string, imageBase64: string }
 * Saves image to frontend/public/idols/{symbol}/avatar.png
 */
uploadRouter.post('/avatar', async (req: Request, res: Response) => {
  try {
    const { symbol, imageBase64 } = req.body

    if (!symbol || !imageBase64) {
      res.status(400).json({ error: 'Missing symbol or imageBase64' })
      return
    }

    // Validate symbol (prevent path traversal)
    const safeSymbol = symbol.toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (!safeSymbol) {
      res.status(400).json({ error: 'Invalid symbol' })
      return
    }

    // Extract base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')

    // Validate size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'Image too large (max 10MB)' })
      return
    }

    // Save to public/idols/{symbol}/avatar.png
    const dir = join(IDOLS_DIR, safeSymbol)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const filePath = join(dir, 'avatar.png')
    writeFileSync(filePath, buffer)

    const publicPath = `/idols/${safeSymbol}/avatar.png`
    console.log(`[Upload] Saved: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`)

    res.json({
      success: true,
      path: publicPath,
      size: buffer.length,
    })
  } catch (err) {
    console.error('[Upload] Error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})
