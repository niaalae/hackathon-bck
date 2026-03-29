import { prisma } from '../seed'
import { CITY_META } from './agenda-data'
import { resolvePhotoForQuery } from './google-places'

const REGIONS_DATA = [
  {
    name: 'Morocco',
    country: 'Morocco',
    slug: 'morocco',
    description:
      'The Kingdom of Morocco - a vibrant destination with diverse landscapes, rich culture, and warm hospitality.',
    coverImageQuery: 'Morocco travel landscape',
  },
]

const MOROCCAN_CITIES = Object.entries(CITY_META).map(([name, city]) => ({
  name,
  slug: city.slug,
  lat: city.lat,
  lng: city.lng,
  timezone: city.timezone,
  description: city.description,
  coverImageQuery: city.photoQuery,
}))

function createManyInBatches<T>(
  label: string,
  items: T[],
  callback: (batch: T[]) => Promise<any>,
  batchSize = 100,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize)
        console.log(
          `Creating ${label} (${i + 1}-${Math.min(i + batchSize, items.length)} of ${items.length})`,
        )
        await callback(batch)
      }
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

export async function seedRegionsAndCities() {
  const regionData = await Promise.all(
    REGIONS_DATA.map(async (region) => ({
      name: region.name,
      country: region.country,
      slug: region.slug,
      description: region.description,
      coverImage: await resolvePhotoForQuery(region.coverImageQuery, region.name),
    })),
  )

  await createManyInBatches('regions', regionData, (data) => prisma.region.createMany({ data }))

  const regionIds = await prisma.region.findMany({ select: { id: true } }).then((r) => r.map((x) => x.id))

  const cityData = await Promise.all(
    MOROCCAN_CITIES.map(async (city) => ({
      name: city.name,
      slug: city.slug,
      lat: city.lat,
      lng: city.lng,
      timezone: city.timezone,
      description: city.description,
      coverImage: await resolvePhotoForQuery(city.coverImageQuery, city.name),
      regionId: regionIds[0],
    })),
  )

  await createManyInBatches('cities', cityData, (data) => prisma.city.createMany({ data }))

  const cityIds = await prisma.city.findMany({ select: { id: true } }).then((c) => c.map((x) => x.id))

  return { regionIds, cityIds }
}
