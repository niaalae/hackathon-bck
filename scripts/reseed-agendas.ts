import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { CITY_META, CURATED_TRIPS } from '../prisma/seed-files/agenda-data'
import { resolvePhotoForQuery } from '../prisma/seed-files/google-places'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Missing DATABASE_URL')

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
})

async function ensureCities() {
  let region = await prisma.region.findFirst({ where: { OR: [{ slug: 'morocco' }, { name: 'Morocco' }] } })
  if (!region) {
    region = await prisma.region.create({
      data: {
        name: 'Morocco',
        country: 'Morocco',
        slug: 'morocco',
        description: 'The Kingdom of Morocco - a vibrant destination with diverse landscapes, rich culture, and warm hospitality.',
        coverImage: await resolvePhotoForQuery('Morocco travel landscape', 'Morocco'),
      },
    })
  }

  for (const [name, meta] of Object.entries(CITY_META)) {
    await prisma.city.upsert({
      where: { slug: meta.slug },
      update: {
        name,
        lat: meta.lat,
        lng: meta.lng,
        timezone: meta.timezone,
        description: meta.description,
        coverImage: await resolvePhotoForQuery(meta.photoQuery, name),
        regionId: region.id,
      },
      create: {
        name,
        slug: meta.slug,
        lat: meta.lat,
        lng: meta.lng,
        timezone: meta.timezone,
        description: meta.description,
        coverImage: await resolvePhotoForQuery(meta.photoQuery, name),
        regionId: region.id,
      },
    })
  }
}

async function reseedAgendas() {
  await ensureCities()

  await prisma.booking.deleteMany({ where: { tripId: { not: null } } })
  await prisma.tripItem.deleteMany()
  await prisma.tripCollaborator.deleteMany()
  await prisma.trip.deleteMany()

  const travelers = await prisma.user.findMany({ where: { role: 'TRAVELER' }, orderBy: { createdAt: 'asc' } })
  if (!travelers.length) throw new Error('No traveler users found')

  const cities = await prisma.city.findMany({ where: { name: { in: CURATED_TRIPS.map((trip) => trip.city) } } })
  const cityIdByName = new Map(cities.map((city) => [city.name, city.id]))

  for (const [index, trip] of CURATED_TRIPS.entries()) {
    const cityId = cityIdByName.get(trip.city)
    if (!cityId) continue

    const createdTrip = await prisma.trip.create({
      data: {
        ownerUserId: travelers[index % travelers.length].id,
        title: trip.title,
        description: trip.description,
        cityId,
        status: trip.status,
        startDate: new Date(trip.startDate),
        endDate: new Date(trip.endDate),
        budgetTotal: trip.budgetTotal,
        currency: trip.currency,
      },
    })

    await prisma.tripItem.createMany({
      data: trip.items.map((item) => ({
        tripId: createdTrip.id,
        day: item.day,
        title: item.title,
        location: item.location,
        time: new Date(item.time),
        notes: item.notes,
        type: item.type,
      })),
    })
  }

  const trips = await prisma.trip.findMany({ include: { city: true, items: true }, orderBy: { startDate: 'asc' } })
  console.log('Agenda reseed completed', trips.map((trip) => ({ title: trip.title, city: trip.city?.name, items: trip.items.length, cover: trip.city?.coverImage?.slice(0, 60) })))
}

reseedAgendas()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
