/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { GamificationService } from "./gamification.service";

type MockUserSnapshot = {
  id: string;
  name: string;
  preferences: Record<string, unknown>;
  createdAt: Date;
  tripsOwned: Array<{
    id: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    city: { name: string } | null;
    items: Array<{ id: string; day: number | null }>;
  }>;
  bookings: Array<{ createdAt: Date }>;
  matches: Array<{ createdAt: Date }>;
  swipes: Array<{ createdAt: Date }>;
};

function buildUserSnapshot(
  overrides: Partial<MockUserSnapshot> = {},
): MockUserSnapshot {
  return {
    id: "user-1",
    name: "Mohamed",
    preferences: {
      accountSettings: {
        homeCity: "Fez",
        gamificationEnabled: true,
      },
      gamification: {
        eventCounters: {},
        activityDates: ["2026-03-21"],
      },
      likedAttractions: [],
    },
    createdAt: new Date("2026-03-20T08:00:00.000Z"),
    tripsOwned: [
      {
        id: "trip-1",
        startDate: new Date("2026-04-01T00:00:00.000Z"),
        endDate: new Date("2026-04-03T00:00:00.000Z"),
        createdAt: new Date("2026-03-20T09:00:00.000Z"),
        city: { name: "Fez" },
        items: [
          { id: "item-1", day: 1 },
          { id: "item-2", day: 2 },
        ],
      },
    ],
    bookings: [],
    matches: [],
    swipes: [],
    ...overrides,
  };
}

describe("GamificationService", () => {
  it("returns polished Day 4 copy with real in-progress quest states", async () => {
    const currentUser = buildUserSnapshot({
      preferences: {
        accountSettings: {
          homeCity: "Fez",
          gamificationEnabled: true,
        },
        gamification: {
          eventCounters: {
            ROUTE_BUILT: 1,
            LOCAL_SPOT_MATCHED: 2,
          },
          activityDates: ["2026-03-21"],
        },
        likedAttractions: ["riad-fes", "cafe-clock"],
      },
    });

    const prismaServiceMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(currentUser),
        findMany: jest.fn().mockResolvedValue([currentUser]),
        update: jest.fn(),
      },
    } as any;

    const service = new GamificationService(prismaServiceMock);
    const overview = await service.getOverview(currentUser.id);

    expect(overview.context).toEqual({
      city: "Fez",
      durationDays: 3,
    });

    expect(overview.quests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "route-board",
          title: "Lock in your 3-day Fez route",
          href: "/user/trip-plan",
          actionLabel: "Review route",
          status: "completed",
        }),
        expect.objectContaining({
          id: "ai-concierge",
          title: "Open your AI concierge",
          status: "in-progress",
          progress: 45,
          progressLabel: "Ready for your first prompt",
        }),
        expect.objectContaining({
          id: "local-match",
          title: "Shortlist 3 local spots",
          status: "in-progress",
          progress: 67,
          progressLabel: "2 / 3 spots shortlisted",
        }),
        expect.objectContaining({
          id: "travel-crew",
          title: "Preview one travel group",
          status: "in-progress",
          progress: 55,
          progressLabel: "Recommended groups are ready",
        }),
        expect.objectContaining({
          id: "map-preview",
          title: "View your route on the map",
          status: "in-progress",
          progress: 35,
          progressLabel: "Ready to unlock",
        }),
      ]),
    );

    expect(overview.summary.completedQuests).toBe(1);
    expect(overview.summary.liveQuests).toBe(4);
    expect(overview.summary.nextQuests).toBe(0);
    expect(overview.summary.nextUnlock).toBe("Open your AI concierge");
  });

  it("returns the completed state when all travel goals are finished", async () => {
    const currentUser = buildUserSnapshot({
      preferences: {
        accountSettings: {
          homeCity: "Fez",
          gamificationEnabled: true,
        },
        gamification: {
          eventCounters: {
            ROUTE_BUILT: 1,
            AI_PROMPT_SENT: 1,
            LOCAL_SPOT_MATCHED: 3,
            GROUP_SCOUTED: 1,
            MAP_PREVIEWED: 1,
          },
          activityDates: ["2026-03-21", "2026-03-22"],
        },
        likedAttractions: ["riad-fes", "cafe-clock", "dar-seffarine"],
      },
      matches: [{ createdAt: new Date("2026-03-21T11:00:00.000Z") }],
    });

    const prismaServiceMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(currentUser),
        findMany: jest.fn().mockResolvedValue([currentUser]),
        update: jest.fn(),
      },
    } as any;

    const service = new GamificationService(prismaServiceMock);
    const overview = await service.getOverview(currentUser.id);

    expect(overview.summary.totalXp).toBe(305);
    expect(overview.summary.completedQuests).toBe(5);
    expect(overview.summary.liveQuests).toBe(0);
    expect(overview.summary.nextQuests).toBe(0);
    expect(overview.summary.nextUnlock).toBe("All travel goals completed");
  });

  it("mirrors the settings toggle into both account settings and gamification state", async () => {
    const currentUser = {
      id: "user-1",
      preferences: {
        accountSettings: {
          homeCity: "Fez",
          gamificationEnabled: true,
        },
        gamification: {
          enabled: true,
          eventCounters: {
            AI_PROMPT_SENT: 1,
          },
        },
      },
    };

    const prismaServiceMock = {
      user: {
        findUnique: jest.fn().mockResolvedValue(currentUser),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const service = new GamificationService(prismaServiceMock);
    const result = await service.updateSettings(currentUser.id, {
      enabled: false,
    });

    expect(result).toEqual({
      gamificationEnabled: false,
      updated: true,
    });

    expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
      where: { id: currentUser.id },
      data: {
        preferences: expect.objectContaining({
          accountSettings: expect.objectContaining({
            gamificationEnabled: false,
          }),
          gamification: expect.objectContaining({
            enabled: false,
            eventCounters: expect.objectContaining({
              AI_PROMPT_SENT: 1,
            }),
          }),
        }),
      },
    });
  });
});
