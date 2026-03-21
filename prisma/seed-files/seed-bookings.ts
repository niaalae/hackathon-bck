import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

const BOOKING_STATUS = ["PENDING", "CONFIRMED", "CANCELED"] as const;
const BOOKING_TYPES = [
  "FLIGHT",
  "STAY",
  "EXPERIENCE",
  "RENTAL",
  "GUIDE",
] as const;
const COMMISSION_RATE = 0.15;
const COUNTS = {
  bookings: 30,
};

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

function toMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
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

interface Trip {
  id: string;
  ownerUserId: string;
  startDate: Date | null;
}

export async function seedBookings(tripData: Trip[]) {
  const tripBaseDate = new Date("2026-01-01T09:00:00Z");

  const bookingsData = tripData.slice(0, COUNTS.bookings).map((trip) => {
    const startDate = addDays(trip.startDate ?? tripBaseDate, randInt(0, 5));
    const endDate = addDays(startDate, randInt(1, 6));
    const basePrice = toMoney(rand() * 900 + 50);
    const commissionValue = toMoney(basePrice * COMMISSION_RATE);

    return {
      tripId: trip.id,
      userId: trip.ownerUserId,
      itemName: faker.lorem.words({ min: 2, max: 4 }),
      type: pick(BOOKING_TYPES),
      provider: faker.company.name(),
      externalRef: `REF-${randInt(100000, 999999)}`,
      basePrice,
      commissionPct: COMMISSION_RATE,
      commissionValue,
      currency: "USD",
      status: pick(BOOKING_STATUS),
      startDate,
      endDate,
    };
  });

  await createManyInBatches("bookings", bookingsData, (data) =>
    prisma.booking.createMany({ data }),
  );
}
