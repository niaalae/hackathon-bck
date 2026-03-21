import { prisma } from "../seed";

// Constants for regions and cities
const REGIONS_DATA = [
  {
    name: "Morocco",
    country: "Morocco",
    slug: "morocco",
    description:
      "The Kingdom of Morocco - a vibrant destination with diverse landscapes, rich culture, and warm hospitality.",
    coverImage:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
  },
];

const MOROCCAN_CITIES = [
  {
    name: "Marrakech",
    slug: "marrakech",
    lat: 31.6295,
    lng: -8.0088,
    timezone: "Africa/Casablanca",
    description:
      "The Red City - famous for its medina, souks, temples, gardens and bustling Jemaa El-Fnaa square.",
    coverImage:
      "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800",
  },
  {
    name: "Fez",
    slug: "fez",
    lat: 34.0336,
    lng: -5.0044,
    timezone: "Africa/Casablanca",
    description:
      "Home to one of the world's oldest universities and a stunning medieval medina with intricate architecture.",
    coverImage:
      "https://images.unsplash.com/photo-1488741321169-ec41ee4ee4c3?w=800",
  },
  {
    name: "Tangier",
    slug: "tangier",
    lat: 35.7596,
    lng: -5.8336,
    timezone: "Africa/Casablanca",
    description:
      "Gateway to Africa - a vibrant port city where Europe meets Africa with cosmopolitan culture.",
    coverImage:
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800",
  },
  {
    name: "Essaouira",
    slug: "essaouira",
    lat: 31.5085,
    lng: -9.7673,
    timezone: "Africa/Casablanca",
    description:
      "Coastal gem known for its fresh seafood, artistic scene, and beautiful beaches.",
    coverImage:
      "https://images.unsplash.com/photo-1488747807830-63789f68bb65?w=800",
  },
  {
    name: "Casablanca",
    slug: "casablanca",
    lat: 33.5731,
    lng: -7.5898,
    timezone: "Africa/Casablanca",
    description:
      "Morocco's largest city and economic hub, home to the stunning Hassan II Mosque and Atlantic beaches.",
    coverImage:
      "https://images.unsplash.com/photo-1488747807830-63789f68bb65?w=800",
  },
  {
    name: "Chefchaouen",
    slug: "chefchaouen",
    lat: 35.1689,
    lng: -5.2694,
    timezone: "Africa/Casablanca",
    description:
      "The Blue City - a picturesque mountain town famous for its powder-blue painted buildings.",
    coverImage:
      "https://images.unsplash.com/photo-1488746253990-c89771167111?w=800",
  },
  {
    name: "Ouarzazate",
    slug: "ouarzazate",
    lat: 30.9273,
    lng: -6.8738,
    timezone: "Africa/Casablanca",
    description:
      "Gateway to the Sahara with stunning kasbahs, film studios, and desert landscape views.",
    coverImage:
      "https://images.unsplash.com/photo-1488747807830-63789f68bb65?w=800",
  },
];

// Helper functions
function createManyInBatches<T>(
  label: string,
  items: T[],
  callback: (batch: T[]) => Promise<any>,
  batchSize = 100,
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        console.log(
          `Creating ${label} (${i + 1}-${Math.min(i + batchSize, items.length)} of ${items.length})`,
        );
        await callback(batch);
      }
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export async function seedRegionsAndCities() {
  const regionData = REGIONS_DATA.map((region) => ({
    ...region,
  }));

  await createManyInBatches("regions", regionData, (data) =>
    prisma.region.createMany({ data }),
  );

  const regionIds = await prisma.region
    .findMany({ select: { id: true } })
    .then((r) => r.map((x) => x.id));

  const cityData = MOROCCAN_CITIES.map((city) => ({
    ...city,
    regionId: regionIds[0],
  }));

  await createManyInBatches("cities", cityData, (data) =>
    prisma.city.createMany({ data }),
  );

  const cityIds = await prisma.city
    .findMany({ select: { id: true } })
    .then((c) => c.map((x) => x.id));

  return { regionIds, cityIds };
}
