import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

// Constants
const COUNTS = {
  trips: 20,
  tripItems: 5,
};

const TRIP_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "CANCELED"] as const;

// Helper functions
function rand(): number {
  return Math.random();
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
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

interface TravelerUser {
  id: string;
}

export async function seedTrips(
  travelerUsers: TravelerUser[],
  cityIds: string[],
) {
  const tripBaseDate = new Date("2026-01-01T09:00:00Z");

  const tripData = travelerUsers.slice(0, COUNTS.trips).map((user) => {
    const startDate = addDays(tripBaseDate, randInt(1, 330));
    const endDate = addDays(startDate, randInt(3, 12));
    return {
      ownerUserId: user.id,
      title: faker.lorem.sentence(),
      status: pick(TRIP_STATUSES),
      startDate,
      endDate,
      budgetTotal: randInt(500, 4500),
      currency: "USD",
      description: faker.lorem.sentences(2),
      cityId: faker.helpers.arrayElement(cityIds),
    };
  });

  await createManyInBatches("trips", tripData, (data) =>
    prisma.trip.createMany({ data }),
  );

  const createdTrips = await prisma.trip.findMany();
  const tripIds = createdTrips.map((trip) => trip.id);

  const tripItemsData = createdTrips.flatMap((trip) =>
    Array.from({ length: COUNTS.tripItems }, (_, itemIndex) => {
      const day = itemIndex + 1;
      const time = addHours(
        addDays(trip.startDate || tripBaseDate, day - 1),
        randInt(8, 20),
      );
      return {
        tripId: trip.id,
        day,
        title: faker.lorem.sentence(),
        location: faker.location.city(),
        time,
        notes: faker.lorem.sentences(1),
        type: pick(["arrival", "sightseeing", "excursion", "food", "relax"]),
      };
    }),
  );

  await createManyInBatches("trip items", tripItemsData, (data) =>
    prisma.tripItem.createMany({ data }),
  );

  return { tripIds };
}
