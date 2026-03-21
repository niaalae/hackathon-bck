import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

const INFO_CATEGORIES = [
  "TIPS",
  "HISTORY",
  "CULTURE",
  "FOOD",
  "ACTIVITIES",
  "TRANSPORTATION",
  "ACCOMMODATION",
];
const COUNTS = {
  infoBlocks: 60,
  translations: 30,
};

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

export async function seedInfoBlocksAndTranslations(
  regionIds: string[],
  cityIds: string[],
  attractionIds: string[],
) {
  const infoBlocks: Array<{
    scope: "REGION" | "CITY" | "ATTRACTION";
    regionId?: string;
    cityId?: string;
    attractionId?: string;
    title: string;
    content: string;
    category: string;
    language: string;
  }> = [];

  const perScope = Math.floor(COUNTS.infoBlocks / 3);

  for (let i = 0; i < perScope; i += 1) {
    infoBlocks.push({
      scope: "REGION",
      regionId: regionIds[i % regionIds.length],
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      category: pick(INFO_CATEGORIES),
      language: "en",
    });
  }

  for (let i = 0; i < perScope; i += 1) {
    infoBlocks.push({
      scope: "CITY",
      cityId: cityIds[i % cityIds.length],
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      category: pick(INFO_CATEGORIES),
      language: "en",
    });
  }

  for (let i = 0; i < COUNTS.infoBlocks - perScope * 2; i += 1) {
    infoBlocks.push({
      scope: "ATTRACTION",
      attractionId: attractionIds[i % attractionIds.length],
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      category: pick(INFO_CATEGORIES),
      language: "en",
    });
  }

  await createManyInBatches("info blocks", infoBlocks, (data) =>
    prisma.infoBlock.createMany({ data }),
  );

  const translations = Array.from(
    { length: COUNTS.translations },
    (_, index) => {
      const type = pick(["region", "city", "attraction"] as const);
      const entityId =
        type === "region"
          ? regionIds[index % regionIds.length]
          : type === "city"
            ? cityIds[index % cityIds.length]
            : attractionIds[index % attractionIds.length];

      return {
        entityType: type,
        entityId,
        language: pick(["es", "fr", "pt"] as const),
        field: pick(["name", "description"] as const),
        value: faker.lorem.sentence(),
      };
    },
  );

  await createManyInBatches("translations", translations, (data) =>
    prisma.translation.createMany({ data }),
  );
}
