import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

// Constants
const COUNTS = {
  guideMediaPerGuide: 3,
  guidePastTripsPerGuide: 3,
};

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

interface GuideUser {
  id: string;
  email: string;
}

export async function seedGuides(guideUsers: GuideUser[], cityIds: string[]) {
  const guideData = guideUsers.map((user) => ({
    userId: user.id,
    headline: faker.lorem.sentence(),
    bio: faker.lorem.sentences(2),
    rateHourly: randInt(30, 100),
    rateDaily: randInt(150, 400),
    locationCityId: faker.helpers.arrayElement(cityIds),
    contactEmail: user.email,
    contactPhone: faker.phone.number(),
    verified: rand() > 0.3,
    ratingAvg: Number((rand() * 1.5 + 3.5).toFixed(2)),
    ratingCount: randInt(3, 150),
  }));

  await createManyInBatches("guides", guideData, (data) =>
    prisma.guide.createMany({ data }),
  );

  const createdGuides = await prisma.guide.findMany();
  const guideIds = createdGuides.map((guide) => guide.id);

  const guideMediaData = createdGuides.flatMap((guide) =>
    Array.from({ length: COUNTS.guideMediaPerGuide }, (_, mediaIndex) => ({
      guideId: guide.id,
      type: faker.helpers.arrayElement(["PHOTO", "VIDEO"]),
      url: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
      caption: faker.lorem.sentence(),
      position: mediaIndex,
    })),
  );

  await createManyInBatches("guide media", guideMediaData, (data) =>
    prisma.guideMedia.createMany({ data }),
  );

  const guidePastTripData = createdGuides.flatMap((guide) =>
    Array.from({ length: COUNTS.guidePastTripsPerGuide }, (_, tripIndex) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - randInt(30, 365));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + randInt(3, 14));

      return {
        guideId: guide.id,
        title: `${faker.location.city()} Trip - ${faker.lorem.words(2)}`,
        location: faker.location.city(),
        startDate,
        endDate,
        summary: faker.lorem.sentences(2),
        mediaUrl: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
      };
    }),
  );

  await createManyInBatches("guide past trips", guidePastTripData, (data) =>
    prisma.guidePastTrip.createMany({ data }),
  );

  return { guideIds };
}
