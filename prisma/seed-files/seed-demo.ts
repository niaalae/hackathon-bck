import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

// Constants
const COMMISSION_RATE = 0.15;

// Helper function
function toMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

interface TravelerUser {
  id: string;
  name?: string;
}

export async function seedDemoData(travelerUsers: TravelerUser[]) {
  // Get existing Moroccan cities
  const cities = await prisma.city.findMany({
    where: {
      region: {
        name: "Morocco",
      },
    },
  });

  if (cities.length < 3) {
    console.log(
      "Warning: Not enough Moroccan cities found for demo data. Skipping demo data creation.",
    );
    return { demoTrips: [], demoGroups: [], demoBookings: [] };
  }

  // Create demo groups using actual cities
  const demoGroups = [
    {
      ownerUserId: travelerUsers[0 % travelerUsers.length].id,
      title: "Marrakech Spring Escape",
      description: "Shared trip for travelers who want culture, food, and easy planning together.",
      coverImage: "https://images.unsplash.com/photo-1597212720350-95c43c6a1a79?w=1200",
      cityId: cities[0].id,
      startDate: new Date("2026-04-03T08:00:00Z"),
      endDate: new Date("2026-04-11T20:00:00Z"),
      capacity: 6,
      budgetMin: 1800,
      budgetMax: 3600,
    },
    {
      ownerUserId: travelerUsers[1 % travelerUsers.length].id,
      title: "Marrakech Rooftops and Souks",
      description: "Small group focused on city energy, rooftop dinners, and old medina spots.",
      coverImage: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200",
      cityId: cities[0].id,
      startDate: new Date("2026-04-20T08:00:00Z"),
      endDate: new Date("2026-04-28T20:00:00Z"),
      capacity: 4,
      budgetMin: 1200,
      budgetMax: 2200,
    },
    {
      ownerUserId: travelerUsers[2 % travelerUsers.length].id,
      title: "Fez Deep Culture Week",
      description: "Travelers exploring Fez with a slower pace and shared planning.",
      coverImage: "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200",
      cityId: cities[1].id,
      startDate: new Date("2026-06-10T08:00:00Z"),
      endDate: new Date("2026-06-19T20:00:00Z"),
      capacity: 8,
      budgetMin: 2600,
      budgetMax: 4800,
    },
    {
      ownerUserId: travelerUsers[3 % travelerUsers.length].id,
      title: "Tangier Coast Circle",
      description: "Coastal stays, photography, and laid-back travel with shared decision making.",
      coverImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
      cityId: cities[2].id,
      startDate: new Date("2026-08-31T08:00:00Z"),
      endDate: new Date("2026-09-08T20:00:00Z"),
      capacity: 5,
      budgetMin: 1600,
      budgetMax: 3000,
    },
    {
      ownerUserId: travelerUsers[4 % travelerUsers.length].id,
      title: "Tangier Autumn Adventure",
      description: "Open group for travelers planning autumn days together in Tangier.",
      coverImage: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200",
      cityId: cities[2].id,
      startDate: new Date("2026-10-05T08:00:00Z"),
      endDate: new Date("2026-10-13T20:00:00Z"),
      capacity: 10,
      budgetMin: 2000,
      budgetMax: 5200,
    },
  ];

  await prisma.group.createMany({ data: demoGroups });

  const createdGroups = await prisma.group.findMany({
    where: {
      title: { in: demoGroups.map((group) => group.title) },
    },
    orderBy: { startDate: 'asc' },
  });

  await prisma.groupMembership.createMany({
    data: createdGroups.map((group) => ({
      groupId: group.id,
      userId: group.ownerUserId,
      status: "MEMBER" as const,
      role: "OWNER" as const,
      requestedAt: group.createdAt,
      respondedAt: group.createdAt,
      reviewedByUserId: group.ownerUserId,
    })),
  });

  await prisma.groupMembership.createMany({
    data: createdGroups.slice(0, 3).map((group, index) => ({
      groupId: group.id,
      userId: travelerUsers[(index + 5) % travelerUsers.length].id,
      status: "MEMBER" as const,
      role: "ADMIN" as const,
      reviewedByUserId: group.ownerUserId,
      respondedAt: new Date(group.createdAt.getTime() + 10 * 60 * 1000),
    })),
  });

  // Create demo trips
  const demoTrips = cities.slice(0, 3).map((city, index) => ({
    ownerUserId: travelerUsers[index % travelerUsers.length].id,
    title: faker.lorem.sentence(),
    description: faker.lorem.sentences(2),
    cityId: city.id,
    status: "ACTIVE" as const,
    startDate: new Date("2026-04-05T09:00:00Z"),
    endDate: new Date("2026-04-10T20:00:00Z"),
    budgetTotal: 2700 + index * 500,
    currency: "USD",
  }));

  await prisma.trip.createMany({ data: demoTrips });

  // Get created trips to get their IDs
  const createdTrips = await prisma.trip.findMany({
    where: {
      cityId: { in: cities.slice(0, 3).map((c) => c.id) },
      status: "ACTIVE",
    },
  });

  // Create demo trip items
  const demoTripItems = createdTrips.flatMap((trip) => {
    const city = cities.find((c) => c.id === trip.cityId);
    return [
      {
        tripId: trip.id,
        day: 1,
        title: `${city?.name} arrival and city orientation`,
        location: `${city?.name} City Center`,
        time: new Date(trip.startDate!.getTime() + 3 * 60 * 60 * 1000),
        notes: `Arrive in ${city?.name} and explore the neighborhood.`,
        type: "arrival",
      },
      {
        tripId: trip.id,
        day: 2,
        title: `${city?.name} cultural highlights and local exploration`,
        location: `${city?.name} Historic District`,
        time: new Date(trip.startDate!.getTime() + (24 + 4) * 60 * 60 * 1000),
        notes: `Discover the rich culture and landmarks of ${city?.name}.`,
        type: Math.random() > 0.5 ? "sightseeing" : "food",
      },
    ];
  });

  await prisma.tripItem.createMany({ data: demoTripItems });

  // Create demo bookings
  const demoBookings = createdTrips.flatMap((trip, tripIndex) => [
    {
      tripId: trip.id,
      userId: trip.ownerUserId,
      itemName: `Flight to ${cities[tripIndex]?.name || "Destination"}`,
      type: "FLIGHT" as const,
      provider: faker.company.name(),
      externalRef: `DEMO-${tripIndex + 1}-FLT-001`,
      basePrice: 820,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(820 * COMMISSION_RATE),
      currency: "USD",
      status: "CONFIRMED" as const,
      startDate: trip.startDate!,
      endDate: new Date(trip.startDate!.getTime() + 4 * 60 * 60 * 1000),
    },
    {
      tripId: trip.id,
      userId: trip.ownerUserId,
      itemName: `Hotel Stay in ${cities[tripIndex]?.name || "Destination"}`,
      type: "STAY" as const,
      provider: faker.company.name(),
      externalRef: `DEMO-${tripIndex + 1}-STY-002`,
      basePrice: 640,
      commissionPct: COMMISSION_RATE,
      commissionValue: toMoney(640 * COMMISSION_RATE),
      currency: "USD",
      status: "CONFIRMED" as const,
      startDate: trip.startDate!,
      endDate: trip.endDate!,
    },
  ]);

  await prisma.booking.createMany({ data: demoBookings });

  const createdDemoBookings = await prisma.booking.findMany({
    where: {
      tripId: { in: createdTrips.map((trip) => trip.id) },
      externalRef: { startsWith: "DEMO-" },
    },
  });

  // Verify commissions
  demoBookings.forEach((booking) => {
    const price = toMoney(booking.basePrice);
    const expectedCommission = toMoney(price * COMMISSION_RATE);
    const computedCommission = toMoney(booking.commissionValue);
    if (computedCommission !== expectedCommission) {
      throw new Error(
        `Commission mismatch for booking ${booking.externalRef}: expected ${expectedCommission}, got ${computedCommission}`,
      );
    }
  });

  return {
    demoTrips: createdTrips,
    demoGroups: createdGroups,
    demoBookings: createdDemoBookings,
  };
}
