import { prisma } from "../seed";

const COLLAB_ROLES = ["EDITOR", "VIEWER"] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickManyUnique<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
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
}

interface TravelerUser {
  id: string;
}

export async function seedTripCollaborators(
  tripData: Trip[],
  travelerUsers: TravelerUser[],
) {
  const tripCollaboratorData = tripData.flatMap((trip) => {
    const collaborators = pickManyUnique(travelerUsers, randInt(1, 3)).filter(
      (user) => user.id !== trip.ownerUserId,
    );
    return collaborators.map((user) => ({
      tripId: trip.id,
      userId: user.id,
      role: pick(COLLAB_ROLES),
    }));
  });

  await createManyInBatches(
    "trip collaborators",
    tripCollaboratorData,
    (data) => prisma.tripCollaborator.createMany({ data }),
  );
}
