export type SeedStop = {
  day: number
  title: string
  location: string
  time: string
  notes: string
  type: string
}

export type SeedTrip = {
  city: string
  title: string
  description: string
  startDate: string
  endDate: string
  budgetTotal: number
  currency: string
  status: 'ACTIVE' | 'DRAFT'
  items: SeedStop[]
}

export const CITY_META: Record<string, { slug: string; lat: number; lng: number; timezone: string; description: string; photoQuery: string }> = {
  Marrakech: { slug: 'marrakech', lat: 31.6295, lng: -8.0088, timezone: 'Africa/Casablanca', description: 'The Red City - medina courtyards, rooftop dining, gardens, and one of Morocco’s strongest city rhythms.', photoQuery: 'Marrakech medina Morocco' },
  Fez: { slug: 'fez', lat: 34.0336, lng: -5.0044, timezone: 'Africa/Casablanca', description: 'Historic imperial city with a dense medieval medina, craftsmanship, scholarly landmarks, and deep cultural texture.', photoQuery: 'Fez medina Morocco' },
  Tangier: { slug: 'tangier', lat: 35.7596, lng: -5.8336, timezone: 'Africa/Casablanca', description: 'Port city where Atlantic and Mediterranean energy meet with kasbah views, cafés, and coastal routes.', photoQuery: 'Tangier Morocco coast' },
  Essaouira: { slug: 'essaouira', lat: 31.5085, lng: -9.7673, timezone: 'Africa/Casablanca', description: 'Atlantic city of ramparts, seafood, sea breeze, and an easier coastal travel pace.', photoQuery: 'Essaouira Morocco medina' },
  Casablanca: { slug: 'casablanca', lat: 33.5731, lng: -7.5898, timezone: 'Africa/Casablanca', description: 'Morocco’s economic capital with oceanfront routes, architecture, and polished city energy.', photoQuery: 'Casablanca Morocco Hassan II Mosque' },
  Chefchaouen: { slug: 'chefchaouen', lat: 35.1689, lng: -5.2694, timezone: 'Africa/Casablanca', description: 'Blue mountain medina with calm lanes, scenic steps, and a slower visual travel experience.', photoQuery: 'Chefchaouen Morocco blue medina' },
  Ouarzazate: { slug: 'ouarzazate', lat: 30.9273, lng: -6.8738, timezone: 'Africa/Casablanca', description: 'Gateway to desert landscapes, kasbah architecture, and cinematic routes south of the Atlas.', photoQuery: 'Ouarzazate Morocco kasbah' },
  Meknes: { slug: 'meknes', lat: 33.8935, lng: -5.5473, timezone: 'Africa/Casablanca', description: 'Imperial city of monumental gates, granaries, calmer streets, and easy historic pacing.', photoQuery: 'Meknes Morocco Bab Mansour' },
  Rabat: { slug: 'rabat', lat: 34.0209, lng: -6.8416, timezone: 'Africa/Casablanca', description: 'Capital city blending kasbah views, broad boulevards, museums, and an Atlantic urban edge.', photoQuery: 'Rabat Morocco kasbah oudayas' },
}

export const CURATED_TRIPS: SeedTrip[] = [
  {
    city: 'Fez',
    title: 'Fez Medina Discovery',
    description: 'A polished medina agenda mixing landmark courtyards, traditional craftsmanship, and slower food stops.',
    startDate: '2026-04-04T09:00:00Z',
    endDate: '2026-04-06T20:00:00Z',
    budgetTotal: 335,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Bab Bou Jeloud arrival walk', location: 'Bab Bou Jeloud, Fez, Morocco', time: '2026-04-04T09:30:00Z', notes: 'Start at the blue gate and enter the medina on foot while the streets are still calmer.', type: 'arrival' },
      { day: 1, title: 'Bou Inania Madrasa', location: 'Bou Inania Madrasa, Fez, Morocco', time: '2026-04-04T10:30:00Z', notes: 'Architecture stop for carved cedar, zellige, and a compact cultural anchor.', type: 'sightseeing' },
      { day: 1, title: 'Lunch at The Ruined Garden', location: 'The Ruined Garden, Fez, Morocco', time: '2026-04-04T13:00:00Z', notes: 'Garden lunch break with a quieter tone before the afternoon route.', type: 'food' },
      { day: 2, title: 'Al Attarine Madrasa', location: 'Al Attarine Madrasa, Fez, Morocco', time: '2026-04-05T10:00:00Z', notes: 'One of the sharper medina highlights for detail and craftsmanship.', type: 'sightseeing' },
      { day: 2, title: 'Chouara Tannery terraces', location: 'Chouara Tannery, Fez, Morocco', time: '2026-04-05T12:00:00Z', notes: 'Terrace stop over the tanneries with a strong visual finish to the route.', type: 'sightseeing' },
    ],
  },
  {
    city: 'Marrakech',
    title: 'Marrakech Medina Circuit',
    description: 'A premium city break built around courtyards, rooftop meals, and high-energy medina movement.',
    startDate: '2026-04-17T09:00:00Z',
    endDate: '2026-04-19T20:00:00Z',
    budgetTotal: 420,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Jemaa el-Fnaa opening pass', location: 'Jemaa el-Fnaa, Marrakech, Morocco', time: '2026-04-17T09:30:00Z', notes: 'Orientation pass through the square before diving into the inner lanes.', type: 'arrival' },
      { day: 1, title: 'Bahia Palace', location: 'Bahia Palace, Marrakech, Morocco', time: '2026-04-17T11:00:00Z', notes: 'Classic palace route with courtyards and decorative interiors.', type: 'sightseeing' },
      { day: 1, title: 'Lunch at Le Jardin', location: 'Le Jardin Secret, Marrakech, Morocco', time: '2026-04-17T13:30:00Z', notes: 'Polished lunch and reset in a courtyard-heavy setting.', type: 'food' },
      { day: 2, title: 'Jardin Majorelle', location: 'Jardin Majorelle, Marrakech, Morocco', time: '2026-04-18T10:00:00Z', notes: 'Morning garden stop before traffic and midday heat build up.', type: 'sightseeing' },
      { day: 2, title: 'Sunset at Kabana', location: 'Kabana Rooftop, Marrakech, Morocco', time: '2026-04-18T19:00:00Z', notes: 'Rooftop dinner slot for a stronger evening close.', type: 'food' },
    ],
  },
  {
    city: 'Meknes',
    title: 'Meknes Imperial Escape',
    description: 'A calmer imperial-city route focused on monumental gates, granaries, and easier pacing.',
    startDate: '2026-05-09T09:00:00Z',
    endDate: '2026-05-11T20:00:00Z',
    budgetTotal: 295,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Bab Mansour', location: 'Bab Mansour, Meknes, Morocco', time: '2026-05-09T09:30:00Z', notes: 'Imperial gate opener and visual anchor for the city.', type: 'arrival' },
      { day: 1, title: 'Place El Hedim walk', location: 'Place El Hedim, Meknes, Morocco', time: '2026-05-09T10:15:00Z', notes: 'Slow pass through the plaza and nearby medina edges.', type: 'sightseeing' },
      { day: 2, title: 'Heri es-Souani', location: 'Heri es-Souani, Meknes, Morocco', time: '2026-05-10T11:00:00Z', notes: 'Granaries and stables for the strongest historical stop in the route.', type: 'sightseeing' },
      { day: 2, title: 'Collier de la Colombe dinner', location: 'Collier de la Colombe, Meknes, Morocco', time: '2026-05-10T19:30:00Z', notes: 'Refined dinner to close a more relaxed imperial day.', type: 'food' },
    ],
  },
  {
    city: 'Chefchaouen',
    title: 'Chefchaouen Blue Medina Reset',
    description: 'A visual slow route through blue lanes, scenic viewpoints, and soft mountain pacing.',
    startDate: '2026-05-22T09:00:00Z',
    endDate: '2026-05-24T20:00:00Z',
    budgetTotal: 260,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Place Outa el Hammam', location: 'Place Outa el Hammam, Chefchaouen, Morocco', time: '2026-05-22T10:00:00Z', notes: 'Start in the square before drifting into the quieter lanes.', type: 'arrival' },
      { day: 1, title: 'Kasbah Museum', location: 'Kasbah Museum, Chefchaouen, Morocco', time: '2026-05-22T11:00:00Z', notes: 'Compact museum and garden stop inside the medina core.', type: 'sightseeing' },
      { day: 2, title: 'Spanish Mosque viewpoint', location: 'Spanish Mosque, Chefchaouen, Morocco', time: '2026-05-23T17:30:00Z', notes: 'Sunset walk with a broad lookout over the blue town.', type: 'sightseeing' },
      { day: 2, title: 'Café Clock Chefchaouen', location: 'Cafe Clock Chefchaouen, Chefchaouen, Morocco', time: '2026-05-23T19:30:00Z', notes: 'Easy evening finish with a softer social vibe.', type: 'food' },
    ],
  },
  {
    city: 'Essaouira',
    title: 'Essaouira Atlantic Reset',
    description: 'Sea air, ramparts, seafood, and a light route rhythm across the Atlantic medina.',
    startDate: '2026-06-05T09:00:00Z',
    endDate: '2026-06-07T20:00:00Z',
    budgetTotal: 320,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Skala de la Ville', location: 'Skala de la Ville, Essaouira, Morocco', time: '2026-06-05T09:45:00Z', notes: 'Ocean-wall opener with strong views and photos.', type: 'arrival' },
      { day: 1, title: 'Essaouira port pass', location: 'Essaouira Fishing Port, Essaouira, Morocco', time: '2026-06-05T11:15:00Z', notes: 'Port atmosphere and seafood energy before lunch.', type: 'sightseeing' },
      { day: 1, title: 'Lunch at La Table by Madada', location: 'La Table by Madada, Essaouira, Morocco', time: '2026-06-05T13:00:00Z', notes: 'Seafood lunch in a more polished setting.', type: 'food' },
      { day: 2, title: 'Essaouira Beach walk', location: 'Essaouira Beach, Essaouira, Morocco', time: '2026-06-06T10:30:00Z', notes: 'Long oceanfront walk with room to keep the day light.', type: 'sightseeing' },
      { day: 2, title: 'Taros rooftop dinner', location: 'Taros, Essaouira, Morocco', time: '2026-06-06T19:00:00Z', notes: 'Sunset rooftop close with a more social finish.', type: 'food' },
    ],
  },
  {
    city: 'Casablanca',
    title: 'Casablanca Ocean & Design',
    description: 'Modern city energy with Hassan II, boulevard pacing, and sharper restaurant stops.',
    startDate: '2026-06-19T09:00:00Z',
    endDate: '2026-06-21T20:00:00Z',
    budgetTotal: 390,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Hassan II Mosque', location: 'Hassan II Mosque, Casablanca, Morocco', time: '2026-06-19T10:00:00Z', notes: 'Architectural anchor and strongest visual stop in the city.', type: 'arrival' },
      { day: 1, title: 'Corniche route', location: 'La Corniche, Casablanca, Morocco', time: '2026-06-19T16:30:00Z', notes: 'Atlantic edge for a softer afternoon route.', type: 'sightseeing' },
      { day: 2, title: 'Art Deco centre', location: 'Place Mohammed V, Casablanca, Morocco', time: '2026-06-20T10:30:00Z', notes: 'Core city pass focused on architecture and downtown rhythm.', type: 'sightseeing' },
      { day: 2, title: 'Dinner at Rick’s Café', location: 'Rick’s Café, Casablanca, Morocco', time: '2026-06-20T20:00:00Z', notes: 'Well-known dinner stop with a more polished finish.', type: 'food' },
    ],
  },
  {
    city: 'Tangier',
    title: 'Tangier Coast & Kasbah',
    description: 'Kasbah lanes, cafés, sea views, and a route shaped by the city’s edge-of-continent energy.',
    startDate: '2026-07-03T09:00:00Z',
    endDate: '2026-07-05T20:00:00Z',
    budgetTotal: 330,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Kasbah Museum', location: 'Kasbah Museum, Tangier, Morocco', time: '2026-07-03T10:00:00Z', notes: 'A strong opening stop inside the historic core.', type: 'arrival' },
      { day: 1, title: 'Café Hafa', location: 'Cafe Hafa, Tangier, Morocco', time: '2026-07-03T17:30:00Z', notes: 'Classic sea-facing tea stop with layered terraces.', type: 'cafe' },
      { day: 2, title: 'Cap Spartel', location: 'Cap Spartel, Tangier, Morocco', time: '2026-07-04T11:30:00Z', notes: 'Coastal viewpoint giving the route a broader Atlantic frame.', type: 'sightseeing' },
      { day: 2, title: 'Dinner at El Morocco Club', location: 'El Morocco Club, Tangier, Morocco', time: '2026-07-04T20:00:00Z', notes: 'A dressier final dinner inside the kasbah zone.', type: 'food' },
    ],
  },
  {
    city: 'Rabat',
    title: 'Rabat Heritage & Sea',
    description: 'A cleaner capital-city route built around kasbah walls, museums, and Atlantic breathing room.',
    startDate: '2026-07-17T09:00:00Z',
    endDate: '2026-07-19T20:00:00Z',
    budgetTotal: 340,
    currency: 'USD',
    status: 'ACTIVE',
    items: [
      { day: 1, title: 'Kasbah des Oudayas', location: 'Kasbah of the Udayas, Rabat, Morocco', time: '2026-07-17T10:00:00Z', notes: 'Historic kasbah opener with sea edge views and clean walking flow.', type: 'arrival' },
      { day: 1, title: 'Andalusian Gardens', location: 'Andalusian Gardens, Rabat, Morocco', time: '2026-07-17T11:30:00Z', notes: 'Garden reset inside the kasbah route.', type: 'sightseeing' },
      { day: 2, title: 'Hassan Tower', location: 'Hassan Tower, Rabat, Morocco', time: '2026-07-18T10:00:00Z', notes: 'Monumental anchor and a clear capital-city landmark.', type: 'sightseeing' },
      { day: 2, title: 'Dinner at Dinarjat', location: 'Dinarjat, Rabat, Morocco', time: '2026-07-18T20:00:00Z', notes: 'Warm final dinner with a more traditional interior atmosphere.', type: 'food' },
    ],
  },
]
