import { randomUUID } from 'node:crypto'
import * as bcrypt from 'bcrypt'
import { prisma } from './seed-files/client'
import {
  ATTRACTION_TYPES,
  BOOKING_STATUS,
  BOOKING_TYPES,
  COLLAB_ROLES,
  COMMISSION_RATE,
  COUNTRIES,
  COUNTS,
  INFO_CATEGORIES,
  MATCH_STATUS,
  MEDIA_TYPES,
  SCALE,
  SWIPE_DIRECTIONS,
  TIMEZONES,
  TRIP_STATUS,
} from './seed-files/constants'
import {
  addDays,
  addHours,
  createManyInBatches,
  imageFor,
  pick,
  pickManyUnique,
  rand,
  randInt,
  toMoney,
} from './seed-files/helpers'

async function clearData() {
  await prisma.match.deleteMany()
  await prisma.swipe.deleteMany()
  await prisma.message.deleteMany()
  await prisma.rating.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.tripItem.deleteMany()
  await prisma.tripCollaborator.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.group.deleteMany()
  await prisma.guidePastTrip.deleteMany()
  await prisma.guideMedia.deleteMany()
  await prisma.guide.deleteMany()
  await prisma.attractionTagMap.deleteMany()
  await prisma.attractionMedia.deleteMany()
  await prisma.infoBlock.deleteMany()
  await prisma.translation.deleteMany()
  await prisma.attraction.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.city.deleteMany()
  await prisma.region.deleteMany()
  await prisma.user.deleteMany()
}

export async function runSeed() {
  await clearData()

  const regionData = Array.from({ length: COUNTS.regions }, (_, index) => ({
    id: randomUUID(),
    name: `Region ${index + 1}`,
    country: pick(COUNTRIES),
    slug: `region-${String(index + 1).padStart(4, '0')}`,
    description: `Region ${index + 1} travel highlights and local culture.`,
    coverImage: imageFor(index),
  }))

  await createManyInBatches('regions', regionData, (data) => prisma.region.createMany({ data }))

  const regionIds = regionData.map((region) => region.id)

  const cityData = Array.from({ length: COUNTS.cities }, (_, index) => {
    const regionId = regionIds[index % regionIds.length]
    return {
      id: randomUUID(),
      regionId,
      name: `City ${index + 1}`,
      slug: `city-${String(index + 1).padStart(5, '0')}`,
      lat: Number((rand() * 140 - 70).toFixed(6)),
      lng: Number((rand() * 360 - 180).toFixed(6)),
      timezone: pick(TIMEZONES),
      description: `City ${index + 1} is known for food, views, and neighborhoods.`,
      coverImage: imageFor(index + 1),
    }
  })

  await createManyInBatches('cities', cityData, (data) => prisma.city.createMany({ data }))

  const cityIds = cityData.map((city) => city.id)

  // Create demo cities for demo trips
  const demoCities = [
    {
      id: randomUUID(),
      regionId: regionIds[0],
      name: 'Paris',
      slug: 'paris-demo',
      lat: 48.8566,
      lng: 2.3522,
      timezone: 'Europe/Paris',
      description: 'The City of Light. Experience iconic landmarks, world-class museums, and charming cafés.',
      coverImage: imageFor(0),
    },
    {
      id: randomUUID(),
      regionId: regionIds[1 % regionIds.length],
      name: 'Tokyo',
      slug: 'tokyo-demo',
      lat: 35.6762,
      lng: 139.6503,
      timezone: 'Asia/Tokyo',
      description: 'The bustling capital of Japan. Discover vibrant neighborhoods, cutting-edge technology, and amazing food.',
      coverImage: imageFor(1),
    },
    {
      id: randomUUID(),
      regionId: regionIds[2 % regionIds.length],
      name: 'Lisbon',
      slug: 'lisbon-demo',
      lat: 38.7223,
      lng: -9.1393,
      timezone: 'Europe/Lisbon',
      description: 'Portugal\'s charming capital. Enjoy coastal views, historic neighborhoods, and delicious pastéis de nata.',
      coverImage: imageFor(2),
    },
  ]

  await prisma.city.createMany({ data: demoCities })

  const demoGroups = [
    {
      id: randomUUID(),
      cityId: demoCities[0].id,
      startDate: new Date('2026-04-03T08:00:00Z'),
      endDate: new Date('2026-04-11T20:00:00Z'),
      capacity: 6,
      budgetMin: 1800,
      budgetMax: 3600,
    },
    {
      id: randomUUID(),
      cityId: demoCities[0].id,
      startDate: new Date('2026-04-20T08:00:00Z'),
      endDate: new Date('2026-04-28T20:00:00Z'),
      capacity: 4,
      budgetMin: 1200,
      budgetMax: 2200,
    },
    {
      id: randomUUID(),
      cityId: demoCities[1].id,
      startDate: new Date('2026-06-10T08:00:00Z'),
      endDate: new Date('2026-06-19T20:00:00Z'),
      capacity: 8,
      budgetMin: 2600,
      budgetMax: 4800,
    },
    {
      id: randomUUID(),
      cityId: demoCities[2].id,
      startDate: new Date('2026-08-31T08:00:00Z'),
      endDate: new Date('2026-09-08T20:00:00Z'),
      capacity: 5,
      budgetMin: 1600,
      budgetMax: 3000,
    },
    {
      id: randomUUID(),
      cityId: demoCities[2].id,
      startDate: new Date('2026-10-05T08:00:00Z'),
      endDate: new Date('2026-10-13T20:00:00Z'),
      capacity: 10,
      budgetMin: 2000,
      budgetMax: 5200,
    },
  ]

  await prisma.group.createMany({ data: demoGroups })

  const tagData = Array.from({ length: COUNTS.tags }, (_, index) => ({
    id: randomUUID(),
    name: `tag-${String(index + 1).padStart(4, '0')}`,
  }))

  await createManyInBatches('tags', tagData, (data) => prisma.tag.createMany({ data }))

  const tagIds = tagData.map((tag) => tag.id)

  const attractionData = Array.from({ length: COUNTS.attractions }, (_, index) => {
    const cityId = cityIds[index % cityIds.length]
    return {
      id: randomUUID(),
      cityId,
      name: `Attraction ${index + 1}`,
      slug: `attraction-${String(index + 1).padStart(6, '0')}`,
      type: pick(ATTRACTION_TYPES),
      lat: Number((rand() * 140 - 70).toFixed(6)),
      lng: Number((rand() * 360 - 180).toFixed(6)),
      description: `Attraction ${index + 1} is a popular stop for visitors.`,
      avgPrice: Number((rand() * 45 + 5).toFixed(2)),
      durationMinutes: randInt(30, 240),
      coverImage: imageFor(index + 2),
    }
  })

  await createManyInBatches('attractions', attractionData, (data) => prisma.attraction.createMany({ data }))

  const attractionIds = attractionData.map((attraction) => attraction.id)

  const attractionMediaData = attractionData.flatMap((attraction, index) =>
    Array.from({ length: COUNTS.attractionMediaPerAttraction }, (_, mediaIndex) => ({
      id: randomUUID(),
      attractionId: attraction.id,
      type: pick(MEDIA_TYPES),
      url: imageFor(index + mediaIndex),
      caption: `Attraction ${index + 1} media ${mediaIndex + 1}`,
      position: mediaIndex,
    })),
  )

  await createManyInBatches('attraction media', attractionMediaData, (data) => prisma.attractionMedia.createMany({ data }))

  const attractionTagData = attractionData.flatMap((attraction) => {
    const tags = pickManyUnique(tagIds, randInt(2, 4))
    return tags.map((tagId) => ({
      attractionId: attraction.id,
      tagId,
    }))
  })

  await createManyInBatches('attraction tags', attractionTagData, (data) => prisma.attractionTagMap.createMany({ data }))

  const adminCount = Math.min(2, COUNTS.users)
  const guideCount = Math.min(COUNTS.guides, Math.max(0, COUNTS.users - adminCount))
  const travelerCount = Math.max(0, COUNTS.users - adminCount - guideCount)

  const adminUsers = Array.from({ length: adminCount }, (_, index) => ({
    id: randomUUID(),
    email: `admin${index + 1}@example.com`,
    passwordHash: bcrypt.hashSync('demo_hash_admin', 12),
    name: `Admin ${index + 1}`,
    role: 'ADMIN' as const,
  }))

  const guideUsers = Array.from({ length: guideCount }, (_, index) => ({
    id: randomUUID(),
    email: `guide${String(index + 1).padStart(5, '0')}@example.com`,
    passwordHash: 'demo_hash_guide',
    name: `Guide User ${index + 1}`,
    avatarUrl: imageFor(index),
    role: 'GUIDE' as const,
    preferences: {
      focus: pick(['history', 'food', 'nature', 'nightlife', 'culture']),
      pace: pick(['slow', 'moderate', 'fast']),
      languages: ['en'],
    },
  }))

  const travelerUsers = Array.from({ length: travelerCount }, (_, index) => ({
    id: randomUUID(),
    email: `traveler${String(index + 1).padStart(6, '0')}@example.com`,
    passwordHash: 'demo_hash_traveler',
    name: `Traveler ${index + 1}`,
    avatarUrl: imageFor(index + 3),
    role: 'TRAVELER' as const,
    preferences: {
      travelStyle: pickManyUnique(['food', 'history', 'nature', 'art', 'beach', 'nightlife'], randInt(1, 3)),
      pace: pick(['slow', 'moderate', 'fast']),
      budget: pick(['low', 'mid', 'high']),
      currency: 'USD',
    },
  }))

  const userData = [...adminUsers, ...guideUsers, ...travelerUsers]
  await createManyInBatches('users', userData, (data) => prisma.user.createMany({ data }))

  const guideData = guideUsers.map((user, index) => ({
    id: randomUUID(),
    userId: user.id,
    headline: `Expert guide ${index + 1}`,
    bio: `Guide ${index + 1} specializes in custom itineraries and local tips.`,
    rateHourly: Number((rand() * 60 + 20).toFixed(2)),
    rateDaily: Number((rand() * 350 + 120).toFixed(2)),
    locationCityId: cityIds[index % cityIds.length],
    contactEmail: user.email,
    contactPhone: `+100000${String(index + 1).padStart(4, '0')}`,
    verified: rand() > 0.4,
    ratingAvg: Number((rand() * 1.5 + 3.5).toFixed(2)),
    ratingCount: randInt(3, 150),
  }))

  await createManyInBatches('guides', guideData, (data) => prisma.guide.createMany({ data }))

  const guideIds = guideData.map((guide) => guide.id)

  const guideMediaData = guideData.flatMap((guide, index) =>
    Array.from({ length: COUNTS.guideMediaPerGuide }, (_, mediaIndex) => ({
      id: randomUUID(),
      guideId: guide.id,
      type: pick(MEDIA_TYPES),
      url: imageFor(index + mediaIndex),
      caption: `Guide ${index + 1} media ${mediaIndex + 1}`,
      position: mediaIndex,
    })),
  )

  await createManyInBatches('guide media', guideMediaData, (data) => prisma.guideMedia.createMany({ data }))

  const guidePastTripData = guideData.flatMap((guide, index) =>
    Array.from({ length: COUNTS.guidePastTripsPerGuide }, (_, tripIndex) => ({
      id: randomUUID(),
      guideId: guide.id,
      title: `Past trip ${index + 1}-${tripIndex + 1}`,
      location: `Region ${randInt(1, COUNTS.regions)}`,
      startDate: addDays(new Date('2025-01-01T08:00:00Z'), randInt(1, 250)),
      endDate: addDays(new Date('2025-01-01T08:00:00Z'), randInt(251, 350)),
      summary: `Highlights from past trip ${index + 1}-${tripIndex + 1}.`,
      mediaUrl: imageFor(index + 1),
    })),
  )

  await createManyInBatches('guide past trips', guidePastTripData, (data) => prisma.guidePastTrip.createMany({ data }))

  const travelerIds = travelerUsers.map((user) => user.id)
  const tripBaseDate = new Date('2026-01-01T09:00:00Z')

  const tripData = Array.from({ length: COUNTS.trips }, (_, index) => {
    const ownerUserId = travelerIds[index % travelerIds.length]
    const startDate = addDays(tripBaseDate, randInt(1, 330))
    const endDate = addDays(startDate, randInt(3, 12))
    return {
      id: randomUUID(),
      ownerUserId,
      title: `Trip ${index + 1}`,
      status: pick(TRIP_STATUS),
      startDate,
      endDate,
      budgetTotal: Number((rand() * 4000 + 500).toFixed(2)),
      currency: 'USD',
    }
  })

  await createManyInBatches('trips', tripData, (data) => prisma.trip.createMany({ data }))

  const tripIds = tripData.map((trip) => trip.id)

  const demoTrips = [
    {
      id: randomUUID(),
      ownerUserId: travelerIds[0],
      title: 'Paris Spring Escape',
      description: 'Discover the magic of Paris in spring. Visit the Eiffel Tower, stroll through Montmartre, and enjoy world-class dining.',
      cityId: demoCities[0].id,
      status: 'ACTIVE' as const,
      startDate: new Date('2026-04-05T09:00:00Z'),
      endDate: new Date('2026-04-10T20:00:00Z'),
      budgetTotal: 3200,
      currency: 'USD',
    },
    {
      id: randomUUID(),
      ownerUserId: travelerIds[1 % travelerIds.length],
      title: 'Tokyo Food Adventure',
      description: 'A culinary journey through Tokyo. Experience Michelin-starred restaurants, street food markets, and traditional tea ceremonies.',
      cityId: demoCities[1].id,
      status: 'ACTIVE' as const,
      startDate: new Date('2026-06-12T09:00:00Z'),
      endDate: new Date('2026-06-18T20:00:00Z'),
      budgetTotal: 4100,
      currency: 'USD',
    },
    {
      id: randomUUID(),
      ownerUserId: travelerIds[2 % travelerIds.length],
      title: 'Lisbon Coastal Retreat',
      description: 'Relax on Lisbon\'s beautiful beaches and explore historic neighborhoods. Perfect for a Portuguese seafood feast.',
      cityId: demoCities[2].id,
      status: 'ACTIVE' as const,
      startDate: new Date('2026-09-01T09:00:00Z'),
      endDate: new Date('2026-09-07T20:00:00Z'),
      budgetTotal: 2700,
      currency: 'USD',
    },
  ]

  await prisma.trip.createMany({
    data: demoTrips,
  })

  const demoTripItems = demoTrips.flatMap((trip, index) => {
    const cityName = demoCities[index].name
    return [
      {
        id: randomUUID(),
        tripId: trip.id,
        day: 1,
        title: `${cityName} arrival and neighborhood walk`,
        location: `${cityName} City Center`,
        time: addHours(trip.startDate, 3),
        notes: `Kickoff day in ${cityName}.`,
        type: 'arrival',
      },
      {
        id: randomUUID(),
        tripId: trip.id,
        day: 2,
        title: `${cityName} highlights`,
        location: `${cityName} Main District`,
        time: addHours(addDays(trip.startDate, 1), 4),
        notes: `Guided highlights for ${cityName}.`,
        type: index % 2 === 0 ? 'sightseeing' : 'food',
      },
    ]
  })

  await prisma.tripItem.createMany({ data: demoTripItems })

  const demoBookings = [
    {
      id: randomUUID(),
      tripId: demoTrips[0].id,
      userId: demoTrips[0].ownerUserId,
      itemName: 'Flight to Paris',
      type: 'FLIGHT' as const,
      provider: 'Air Demo',
      externalRef: 'DEMO-PARIS-FLT-001',
      basePrice: 820,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(820 * COMMISSION_RATE),
      currency: 'USD',
      status: 'CONFIRMED' as const,
      startDate: new Date('2026-04-05T07:00:00Z'),
      endDate: new Date('2026-04-05T11:00:00Z'),
    },
    {
      id: randomUUID(),
      tripId: demoTrips[0].id,
      userId: demoTrips[0].ownerUserId,
      itemName: 'Hotel Stay in Paris',
      type: 'STAY' as const,
      provider: 'Hotel Demo Paris',
      externalRef: 'DEMO-PARIS-STY-002',
      basePrice: 640,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(640 * COMMISSION_RATE),
      currency: 'USD',
      status: 'CONFIRMED' as const,
      startDate: new Date('2026-04-05T14:00:00Z'),
      endDate: new Date('2026-04-10T10:00:00Z'),
    },
    {
      id: randomUUID(),
      tripId: demoTrips[1].id,
      userId: demoTrips[1].ownerUserId,
      itemName: 'Tokyo Local Guide Tour',
      type: 'GUIDE' as const,
      provider: 'Tokyo Local Guide',
      externalRef: 'DEMO-TOKYO-GUI-003',
      basePrice: 300,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(300 * COMMISSION_RATE),
      currency: 'USD',
      status: 'CONFIRMED' as const,
      startDate: new Date('2026-06-13T09:00:00Z'),
      endDate: new Date('2026-06-13T17:00:00Z'),
    },
    {
      id: randomUUID(),
      tripId: demoTrips[1].id,
      userId: demoTrips[1].ownerUserId,
      itemName: 'Tokyo Food Experience',
      type: 'EXPERIENCE' as const,
      provider: 'Tokyo Food Tour',
      externalRef: 'DEMO-TOKYO-EXP-004',
      basePrice: 180,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(180 * COMMISSION_RATE),
      currency: 'USD',
      status: 'CONFIRMED' as const,
      startDate: new Date('2026-06-14T12:00:00Z'),
      endDate: new Date('2026-06-14T16:00:00Z'),
    },
    {
      id: randomUUID(),
      tripId: demoTrips[2].id,
      userId: demoTrips[2].ownerUserId,
      itemName: 'Car Rental in Lisbon',
      type: 'RENTAL' as const,
      provider: 'Lisbon Mobility Demo',
      externalRef: 'DEMO-LISBON-RNT-005',
      basePrice: 220,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(220 * COMMISSION_RATE),
      currency: 'USD',
      status: 'CONFIRMED' as const,
      startDate: new Date('2026-09-02T08:00:00Z'),
      endDate: new Date('2026-09-06T20:00:00Z'),
    },
  ]

  await prisma.booking.createMany({ data: demoBookings })

  const demoCommissionChecks = demoBookings.map((booking) => {
    const price = toMoney(booking.basePrice)
    const expectedCommission = toMoney(price * COMMISSION_RATE)
    const computedCommission = toMoney(booking.commissionValue)
    if (computedCommission !== expectedCommission) {
      throw new Error(
        `Commission mismatch for booking ${booking.id}: expected ${expectedCommission}, got ${computedCommission}`,
      )
    }
    return {
      bookingId: booking.id,
      itemName: booking.itemName,
      tripId: booking.tripId,
      basePrice: price,
      commissionRate: COMMISSION_RATE,
      commission: computedCommission,
    }
  })

  const tripCollaboratorData = tripData.flatMap((trip) => {
    const collaborators = pickManyUnique(travelerIds, randInt(1, 3)).filter((id) => id !== trip.ownerUserId)
    return collaborators.map((userId) => ({
      tripId: trip.id,
      userId,
      role: pick(COLLAB_ROLES),
    }))
  })

  await createManyInBatches('trip collaborators', tripCollaboratorData, (data) => prisma.tripCollaborator.createMany({ data }))

  const tripItemsData = Array.from({ length: COUNTS.tripItems }, (_, index) => {
    const trip = tripData[index % tripData.length]
    const day = randInt(1, 8)
    const time = addHours(addDays(trip.startDate ?? tripBaseDate, day - 1), randInt(8, 20))
    return {
      id: randomUUID(),
      tripId: trip.id,
      day,
      title: `Activity ${index + 1}`,
      location: `Area ${randInt(1, 50)}`,
      time,
      notes: `Notes for activity ${index + 1}.`,
      type: pick(['arrival', 'sightseeing', 'excursion', 'food', 'relax']),
    }
  })

  await createManyInBatches('trip items', tripItemsData, (data) => prisma.tripItem.createMany({ data }))

  const bookingsData = Array.from({ length: COUNTS.bookings }, (_, index) => {
    const trip = tripData[index % tripData.length]
    const startDate = addDays(trip.startDate ?? tripBaseDate, randInt(0, 5))
    const endDate = addDays(startDate, randInt(1, 6))
    const basePrice = Number((rand() * 900 + 50).toFixed(2))
    const commissionValue = toMoney(basePrice * COMMISSION_RATE)
    return {
      id: randomUUID(),
      tripId: trip.id,
      userId: trip.ownerUserId,
      itemName: `Booking ${index + 1}`,
      type: pick(BOOKING_TYPES),
      provider: `Provider ${randInt(1, 30)}`,
      externalRef: `REF-${randInt(100000, 999999)}`,
      basePrice,
      commissionPct: COMMISSION_RATE,
      commissionValue,
      currency: 'USD',
      status: pick(BOOKING_STATUS),
      startDate,
      endDate,
    }
  })

  await createManyInBatches('bookings', bookingsData, (data) => prisma.booking.createMany({ data }))

  const frontendTripPayload = await prisma.trip.findMany({
    where: { id: { in: demoTrips.map((trip) => trip.id) } },
    include: { collaborators: true, items: true, bookings: true },
    orderBy: { startDate: 'asc' },
  })

  const ratingsData = Array.from({ length: COUNTS.ratings }, (_, index) => ({
    id: randomUUID(),
    fromUserId: travelerIds[index % travelerIds.length],
    guideId: guideIds[index % guideIds.length],
    tripId: tripIds[index % tripIds.length],
    score: randInt(3, 5),
    comment: `Review ${index + 1} from traveler feedback.`,
  }))

  await createManyInBatches('ratings', ratingsData, (data) => prisma.rating.createMany({ data }))

  const messagesData = Array.from({ length: COUNTS.messages }, (_, index) => ({
    id: randomUUID(),
    fromUserId: travelerIds[index % travelerIds.length],
    toGuideId: guideIds[index % guideIds.length],
    tripId: tripIds[index % tripIds.length],
    message: `Message ${index + 1} about trip details.`,
    status: pick(['sent', 'read', 'archived']),
  }))

  await createManyInBatches('messages', messagesData, (data) => prisma.message.createMany({ data }))

  const swipesData = Array.from({ length: COUNTS.swipes }, (_, index) => ({
    id: randomUUID(),
    fromUserId: travelerIds[index % travelerIds.length],
    targetGuideId: guideIds[index % guideIds.length],
    direction: pick(SWIPE_DIRECTIONS),
  }))

  await createManyInBatches('swipes', swipesData, (data) => prisma.swipe.createMany({ data }))

  const matchesData = Array.from({ length: COUNTS.matches }, (_, index) => ({
    id: randomUUID(),
    userId: travelerIds[index % travelerIds.length],
    guideId: guideIds[index % guideIds.length],
    status: pick(MATCH_STATUS),
  }))

  await createManyInBatches('matches', matchesData, (data) => prisma.match.createMany({ data }))

  const infoBlocks: Array<{
    id: string
    scope: 'REGION' | 'CITY' | 'ATTRACTION'
    regionId?: string
    cityId?: string
    attractionId?: string
    title: string
    content: string
    category: string
    language: string
  }> = []

  const perScope = Math.floor(COUNTS.infoBlocks / 3)
  for (let i = 0; i < perScope; i += 1) {
    infoBlocks.push({
      id: randomUUID(),
      scope: 'REGION',
      regionId: regionIds[i % regionIds.length],
      title: `Region tip ${i + 1}`,
      content: `Helpful region tip ${i + 1} for visitors.`,
      category: pick(INFO_CATEGORIES),
      language: 'en',
    })
  }

  for (let i = 0; i < perScope; i += 1) {
    infoBlocks.push({
      id: randomUUID(),
      scope: 'CITY',
      cityId: cityIds[i % cityIds.length],
      title: `City tip ${i + 1}`,
      content: `Helpful city tip ${i + 1} for visitors.`,
      category: pick(INFO_CATEGORIES),
      language: 'en',
    })
  }

  for (let i = 0; i < COUNTS.infoBlocks - perScope * 2; i += 1) {
    infoBlocks.push({
      id: randomUUID(),
      scope: 'ATTRACTION',
      attractionId: attractionIds[i % attractionIds.length],
      title: `Attraction tip ${i + 1}`,
      content: `Helpful attraction tip ${i + 1} for visitors.`,
      category: pick(INFO_CATEGORIES),
      language: 'en',
    })
  }

  await createManyInBatches('info blocks', infoBlocks, (data) => prisma.infoBlock.createMany({ data }))

  const translations = Array.from({ length: COUNTS.translations }, (_, index) => {
    const type = pick(['region', 'city', 'attraction'] as const)
    const entityId =
      type === 'region'
        ? regionIds[index % regionIds.length]
        : type === 'city'
          ? cityIds[index % cityIds.length]
          : attractionIds[index % attractionIds.length]

    return {
      id: randomUUID(),
      entityType: type,
      entityId,
      language: pick(['es', 'fr', 'pt']),
      field: pick(['name', 'description']),
      value: `Translated ${type} ${index + 1}`,
    }
  })

  await createManyInBatches('translations', translations, (data) => prisma.translation.createMany({ data }))

  console.log('Seed completed', {
    scale: SCALE,
    users: userData.length,
    guides: guideData.length,
    regions: regionData.length,
    cities: cityData.length,
    attractions: attractionData.length,
    trips: tripData.length,
    demoGroupCount: demoGroups.length,
    demoTripCount: demoTrips.length,
    demoBookingCount: demoBookings.length,
    commissionRate: COMMISSION_RATE,
  })

  console.log('Demo trip ids', demoTrips.map((trip) => trip.id))
  console.log('Demo group ids', demoGroups.map((group) => group.id))
  console.log('Demo booking ids', demoBookings.map((booking) => booking.id))
  console.log('Commission checks (10%)', demoCommissionChecks)
  console.log(
    'Frontend readiness: /trips payload includes demo trips and bookings',
    frontendTripPayload.map((trip) => ({
      tripId: trip.id,
      bookings: trip.bookings.length,
      items: trip.items.length,
      collaborators: trip.collaborators.length,
    })),
  )
}

runSeed()
  .catch(error => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
