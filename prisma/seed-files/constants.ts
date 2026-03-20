export const DEFAULT_SCALE = 10

export const SCALE =
  Math.max(1, Number.parseInt(process.env.SEED_SCALE ?? `${DEFAULT_SCALE}`, 10) || DEFAULT_SCALE)

export const CHUNK_SIZE = 500
export const COMMISSION_RATE = 0.1

export const COUNTS = {
  regions: 6 * SCALE,
  cities: 18 * SCALE,
  attractions: 120 * SCALE,
  tags: 30 * SCALE,
  users: 120 * SCALE,
  guides: 18 * SCALE,
  trips: 60 * SCALE,
  tripItems: 300 * SCALE,
  bookings: 120 * SCALE,
  ratings: 120 * SCALE,
  messages: 120 * SCALE,
  swipes: 240 * SCALE,
  matches: 90 * SCALE,
  infoBlocks: 150 * SCALE,
  translations: 120 * SCALE,
  guideMediaPerGuide: 2,
  guidePastTripsPerGuide: 1,
  attractionMediaPerAttraction: 1,
}

export const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1528909514045-2fa4ac7a08ba?w=1200&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&auto=format&fit=crop&q=60',
]

export const COUNTRIES = ['Portugal', 'Spain', 'Italy', 'France', 'Greece', 'Turkey', 'USA', 'Mexico', 'Japan', 'Thailand']

export const TIMEZONES = ['Europe/Lisbon', 'Europe/Madrid', 'Europe/Paris', 'America/New_York', 'Asia/Tokyo', 'Africa/Casablanca']

export const ATTRACTION_TYPES = ['Landmark', 'Museum', 'Beach', 'Market', 'Trail', 'Gallery', 'Fort', 'Park', 'Viewpoint', 'Palace']

export const BOOKING_TYPES = ['FLIGHT', 'STAY', 'EXPERIENCE', 'RENTAL', 'GUIDE'] as const

export const BOOKING_STATUS = ['PENDING', 'CONFIRMED', 'CANCELED'] as const

export const TRIP_STATUS = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED'] as const

export const COLLAB_ROLES = ['EDITOR', 'VIEWER'] as const

export const MEDIA_TYPES = ['PHOTO', 'VIDEO'] as const

export const SWIPE_DIRECTIONS = ['LIKE', 'PASS'] as const

export const MATCH_STATUS = ['ACTIVE', 'BLOCKED'] as const

export const INFO_CATEGORIES = ['tips', 'transport', 'budget', 'food', 'safety', 'weather', 'events']
