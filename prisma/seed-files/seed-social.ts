import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

const COUNTS = {
  ratings: 50,
  messages: 30,
  swipes: 80,
  matches: 20,
};

const SWIPE_DIRECTIONS = ["LIKE", "PASS"] as const;
const MATCH_STATUSES = ["ACTIVE", "BLOCKED"] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createManyInBatches<T>(
  label: string,
  items: T[],
  callback: (batch: T[]) => Promise<unknown>,
  batchSize = 100,
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(
      `Creating ${label} (${i + 1}-${Math.min(i + batchSize, items.length)} of ${items.length})`,
    );
    await callback(batch);
  }
}

interface TravelerUser {
  id: string;
}

interface GuideData {
  guideIds: string[];
}

interface TripData {
  tripIds: string[];
}

export async function seedSocialData(
  travelerUsers: TravelerUser[],
  { guideIds }: GuideData,
  { tripIds }: TripData,
) {
  const ratingsData = Array.from({ length: COUNTS.ratings }, (_, index) => ({
    fromUserId: travelerUsers[index % travelerUsers.length].id,
    guideId: guideIds[index % guideIds.length],
    tripId: tripIds[index % tripIds.length],
    score: randInt(3, 5),
    comment: faker.lorem.sentence(),
  }));

  await createManyInBatches("ratings", ratingsData, (data) =>
    prisma.rating.createMany({ data }),
  );

  const messagesData = Array.from({ length: COUNTS.messages }, (_, index) => ({
    fromUserId: travelerUsers[index % travelerUsers.length].id,
    toGuideId: guideIds[index % guideIds.length],
    tripId: tripIds[index % tripIds.length],
    message: faker.lorem.sentence(),
    status: pick(["sent", "read", "archived"] as const),
  }));

  await createManyInBatches("messages", messagesData, (data) =>
    prisma.message.createMany({ data }),
  );

  const swipesData = Array.from({ length: COUNTS.swipes }, (_, index) => ({
    fromUserId: travelerUsers[index % travelerUsers.length].id,
    targetGuideId: guideIds[index % guideIds.length],
    direction: pick(SWIPE_DIRECTIONS),
  }));

  await createManyInBatches("swipes", swipesData, (data) =>
    prisma.swipe.createMany({ data }),
  );

  const matchesData = Array.from({ length: COUNTS.matches }, (_, index) => ({
    userId: travelerUsers[index % travelerUsers.length].id,
    guideId: guideIds[index % guideIds.length],
    status: pick(MATCH_STATUSES),
  }));

  await createManyInBatches("matches", matchesData, (data) =>
    prisma.match.createMany({ data }),
  );
}
