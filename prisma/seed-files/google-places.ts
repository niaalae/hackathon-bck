import fs from 'node:fs'
import path from 'node:path'

type GooglePlacesPhoto = { name?: string }
type GooglePlacesMatch = {
  id?: string
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  photos?: GooglePlacesPhoto[]
}

function readEnvValue(filePath: string, key: string) {
  if (!fs.existsSync(filePath)) return undefined
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const prefix = `${key}=`
    if (!trimmed.startsWith(prefix)) continue
    const raw = trimmed.slice(prefix.length).trim()
    return raw.replace(/^['"]|['"]$/g, '')
  }
  return undefined
}

function resolveGooglePlacesKey() {
  const candidates = [
    process.env.GOOGLE_PLACES_SEARCH_KEY,
    process.env.GOOGLE_PLACES_API_KEY,
    process.env.VITE_GOOGLE_PLACES_SEARCH_KEY,
    process.env.VITE_GOOGLE_PLACES_API_KEY,
  ]

  const fromEnv = candidates.find((value) => typeof value === 'string' && value.trim())
  if (fromEnv) return fromEnv.trim()

  const frontendEnv = path.resolve(process.cwd(), '../frontend/.env')
  const frontendLocalEnv = path.resolve(process.cwd(), '../frontend/.env.local')
  return (
    readEnvValue(frontendEnv, 'VITE_GOOGLE_PLACES_SEARCH_KEY') ||
    readEnvValue(frontendEnv, 'VITE_GOOGLE_PLACES_API_KEY') ||
    readEnvValue(frontendLocalEnv, 'VITE_GOOGLE_PLACES_SEARCH_KEY') ||
    readEnvValue(frontendLocalEnv, 'VITE_GOOGLE_PLACES_API_KEY') ||
    null
  )
}

const GOOGLE_PLACES_KEY = resolveGooglePlacesKey()

export function buildGrayPlaceholder(label: string) {
  const safe = label
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e5e7eb"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><g opacity="0.55"><rect x="120" y="140" width="960" height="520" rx="36" fill="none" stroke="#94a3b8" stroke-width="8" stroke-dasharray="18 16"/></g><text x="600" y="392" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#64748b">${safe}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function buildPhotoUrl(photoName?: string | null) {
  if (!photoName || !GOOGLE_PLACES_KEY) return null
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1200&maxWidthPx=1600&key=${encodeURIComponent(GOOGLE_PLACES_KEY)}`
}

export async function searchGooglePlace(query: string): Promise<GooglePlacesMatch | null> {
  if (!GOOGLE_PLACES_KEY || !query.trim()) return null

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask': 'places.id,places.formattedAddress,places.location,places.photos',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'en',
        regionCode: 'MA',
        maxResultCount: 1,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()
    return data?.places?.[0] ?? null
  } catch {
    return null
  }
}

export async function resolvePhotoForQuery(query: string, fallbackLabel: string) {
  const match = await searchGooglePlace(query)
  const photoName = match?.photos?.[0]?.name
  return buildPhotoUrl(photoName) || buildGrayPlaceholder(fallbackLabel)
}
