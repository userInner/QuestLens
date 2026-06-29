import { Router, Request, Response } from 'express'
import { existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IDOLS_DIR = join(__dirname, '..', '..', '..', 'frontend', 'public', 'idols')

export const idolRouter = Router()

/**
 * GET /api/idol/:symbol
 * Returns metadata for an idol including avatar path
 */
idolRouter.get('/:symbol', (req: Request, res: Response) => {
  const symbol = req.params.symbol.toLowerCase()
  const dir = join(IDOLS_DIR, symbol)

  if (!existsSync(dir)) {
    res.status(404).json({ error: 'Idol not found' })
    return
  }

  const hasAvatar = existsSync(join(dir, 'avatar.png'))

  res.json({
    symbol,
    avatar: hasAvatar ? `/idols/${symbol}/avatar.png` : null,
    directory: dir,
  })
})

/**
 * GET /api/idol
 * List all idols that have local images
 */
idolRouter.get('/', (req: Request, res: Response) => {
  if (!existsSync(IDOLS_DIR)) {
    res.json({ idols: [] })
    return
  }

  const dirs = readdirSync(IDOLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => ({
      symbol: d.name,
      avatar: existsSync(join(IDOLS_DIR, d.name, 'avatar.png'))
        ? `/idols/${d.name}/avatar.png`
        : null,
    }))

  res.json({ idols: dirs })
})
