import { prisma } from '../seed'
import { CURATED_TRIPS } from './agenda-data'

type TravelerUser = { id: string }

function parseDate(value: string) {
  return new Date(value)
}

function cityLookup(cityRows: Array<{ id: string; name: string }>) {
  const lookup = new Map<string, string>()
  cityRows.forEach((city) => {
    lookup.set(city.name, city.id)
  })
  return lookup
}

export async function seedTrips(travelerUsers: TravelerUser[], _cityIds: string[]) {
  const cityRows = await prisma.city.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } })
  const cityIdByName = cityLookup(cityRows)

  const seededTrips = CURATED_TRIPS.filter((trip) => cityIdByName.has(trip.city)).map((trip, index) => ({
    ownerUserId: travelerUsers[index % travelerUsers.length].id,
    title: trip.title,
    description: trip.description,
    cityId: cityIdByName.get(trip.city),
    status: trip.status,
    startDate: parseDate(trip.startDate),
    endDate: parseDate(trip.endDate),
    budgetTotal: trip.budgetTotal,
    currency: trip.currency,
  }))

  await prisma.trip.createMany({ data: seededTrips })

  const createdTrips = await prisma.trip.findMany({
    where: { title: { in: seededTrips.map((trip) => trip.title) } },
    orderBy: { startDate: 'asc' },
  })

  const tripItemsData = createdTrips.flatMap((trip) => {
    const source = CURATED_TRIPS.find((entry) => entry.title === trip.title)
    if (!source) return []
    return source.items.map((item) => ({
      tripId: trip.id,
      day: item.day,
      title: item.title,
      location: item.location,
      time: parseDate(item.time),
      notes: item.notes,
      type: item.type,
    }))
  })

  await prisma.tripItem.createMany({ data: tripItemsData })

  return { tripIds: createdTrips.map((trip) => trip.id) }
}
