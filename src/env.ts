import { config } from 'dotenv'
import { existsSync } from 'fs'
import { join } from 'path'

let loaded = false

export const loadEnv = () => {
  if (loaded) return

  const candidates = [
    join(process.cwd(), '.env'),
    join(process.cwd(), 'backend', '.env'),
    join(__dirname, '..', '.env'),
    join(__dirname, '..', '..', '.env'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      config({ path: candidate, override: true })
      loaded = true
      if (process.env.NODE_ENV !== 'production') {
        const len = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0
        // eslint-disable-next-line no-console
        console.log(`Loaded env from ${candidate}. GROQ_API_KEY length: ${len}`)
      }
      return
    }
  }
}

loadEnv()
