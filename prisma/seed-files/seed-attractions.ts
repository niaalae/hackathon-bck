import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

// Constants
const MOROCCAN_ATTRACTIONS = [
  {
    cityId: "", // Will be set
    name: "Jemaa El-Fnaa",
    slug: "jemaa-el-fnaa",
    type: "Historic Square",
    lat: 31.6295,
    lng: -8.0088,
    description:
      "The iconic center of Marrakech with performers, food stalls, and vibrant atmosphere.",
    avgPrice: 0,
    durationMinutes: 120,
    coverImage:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
  },
  {
    cityId: "",
    name: "Koutoubia Mosque",
    slug: "koutoubia-mosque",
    type: "Religious Site",
    lat: 31.6295,
    lng: -8.0088,
    description:
      "Marrakech's most iconic mosque with a stunning minaret visible across the city.",
    avgPrice: 0,
    durationMinutes: 90,
    coverImage:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
  },
  {
    cityId: "",
    name: "Medina of Fez",
    slug: "medina-of-fez",
    type: "Historic District",
    lat: 34.0336,
    lng: -5.0044,
    description:
      "One of the world's oldest medinas with winding streets and traditional architecture.",
    avgPrice: 0,
    durationMinutes: 240,
    coverImage:
      "https://images.unsplash.com/photo-1488741321169-ec41ee4ee4c3?w=800",
  },
  {
    cityId: "",
    name: "Blue City Streets",
    slug: "blue-city-streets",
    type: "Scenic Walk",
    lat: 35.1689,
    lng: -5.2694,
    description: "Explore the charming blue-painted streets of Chefchaouen.",
    avgPrice: 0,
    durationMinutes: 180,
    coverImage:
      "https://images.unsplash.com/photo-1488746253990-c89771167111?w=800",
  },
  {
    cityId: "",
    name: "Hassan II Mosque",
    slug: "hassan-ii-mosque",
    type: "Religious Site",
    lat: 33.5731,
    lng: -7.5898,
    description:
      "Casablanca's stunning mosque featuring intricate Islamic architecture and ocean views.",
    avgPrice: 100,
    durationMinutes: 120,
    coverImage:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800",
  },
  {
    cityId: "",
    name: "Essaouira Beach",
    slug: "essaouira-beach",
    type: "Beach",
    lat: 31.5085,
    lng: -9.7673,
    description:
      "Beautiful Atlantic beach with fresh seafood restaurants and artistic vibe.",
    avgPrice: 0,
    durationMinutes: 240,
    coverImage:
      "https://images.unsplash.com/photo-1488747807830-63789f68bb65?w=800",
  },
  {
    cityId: "",
    name: "Ait Benhaddou Kasbah",
    slug: "ait-benhaddou-kasbah",
    type: "Historic Site",
    lat: 30.9273,
    lng: -6.8738,
    description:
      "UNESCO-listed ancient kasbah with stunning clay architecture near Ouarzazate.",
    avgPrice: 50,
    durationMinutes: 180,
    coverImage:
      "https://images.unsplash.com/photo-1488747807830-63789f68bb65?w=800",
  },
];

const ATTRACTION_TYPES = [
  "Museum",
  "Historic Site",
  "Beach",
  "Park",
  "Religious Site",
  "Scenic Walk",
  "Food Market",
  "Gallery",
];

// Helper functions
function rand(): number {
  return Math.random();
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

export async function seedAttractionsAndTags(cityIds: string[]) {
  const COUNTS = {
    tags: 25,
    attractionMediaPerAttraction: 3,
  };

  // Create tags
  const tagData = Array.from({ length: COUNTS.tags }, (_, index) => ({
    name: `tag-${String(index + 1).padStart(4, "0")}`,
  }));

  await createManyInBatches("tags", tagData, (data) =>
    prisma.tag.createMany({ data }),
  );

  const allTags = await prisma.tag.findMany();
  const tagIds = allTags.map((tag) => tag.id);

  // Create attractions
  const baseMoroccanAttractions = MOROCCAN_ATTRACTIONS.map((attr, idx) => ({
    ...attr,
    cityId: cityIds[idx % cityIds.length],
  }));

  // Add more random attractions
  const additionalAttractions = Array.from(
    { length: Math.max(0, 20 - baseMoroccanAttractions.length) },
    (_, index) => {
      const generatedName = `${faker.word.adjective()} ${faker.word.noun()} ${faker.helpers.arrayElement(["Spot", "Garden", "Square", "Museum"])}`;
      return {
        cityId: cityIds[index % cityIds.length],
        name: generatedName,
        slug: faker.helpers.slugify(generatedName).toLowerCase(),
        type: faker.helpers.arrayElement(ATTRACTION_TYPES),
        lat: Number(faker.location.latitude({ min: 27, max: 36 }).toFixed(4)),
        lng: Number(faker.location.longitude({ min: -14, max: -1 }).toFixed(4)),
        description: faker.lorem.sentences(2),
        avgPrice: randInt(0, 100),
        durationMinutes: randInt(30, 240),
        coverImage: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
      };
    },
  );

  const attractionData = [...baseMoroccanAttractions, ...additionalAttractions];

  await createManyInBatches("attractions", attractionData, (data) =>
    prisma.attraction.createMany({ data }),
  );

  const allAttractions = await prisma.attraction.findMany();
  const attractionIds = allAttractions.map((a) => a.id);

  // Create attraction media
  const attractionMediaData = allAttractions.flatMap((attraction, index) =>
    Array.from(
      { length: COUNTS.attractionMediaPerAttraction },
      (_, mediaIndex) => ({
        attractionId: attraction.id,
        type: faker.helpers.arrayElement(["PHOTO", "VIDEO"]),
        url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
        caption: `${attraction.name} - Image ${mediaIndex + 1}`,
        position: mediaIndex,
      }),
    ),
  );

  await createManyInBatches("attraction media", attractionMediaData, (data) =>
    prisma.attractionMedia.createMany({ data }),
  );

  // Create attraction tags
  const attractionTagData = allAttractions.flatMap((attraction) => {
    const tagsCount = randInt(2, 4);
    const selectedTags = faker.helpers.arrayElements(tagIds, tagsCount);
    return selectedTags.map((tagId) => ({
      attractionId: attraction.id,
      tagId,
    }));
  });

  await createManyInBatches("attraction tags", attractionTagData, (data) =>
    prisma.attractionTagMap.createMany({ data }),
  );

  return { attractionIds, tagIds };
}
