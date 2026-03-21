import * as bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { prisma } from "../seed";

// Constants
const COUNTS = {
  guides: 15,
  travelers: 25,
};

export async function seedUsers() {
  const hashedPassword = bcrypt.hashSync("secret", 12);

  // Admin user
  const adminUser = {
    email: "admin@example.com",
    passwordHash: hashedPassword,
    name: "Admin",
    role: "ADMIN" as const,
  };

  // Demo users
  const demoGuide = {
    email: "guide@example.com",
    passwordHash: hashedPassword,
    name: "Demo Guide",
    avatarUrl: faker.image.avatar(),
    role: "GUIDE" as const,
    preferences: {
      focus: "culture",
      pace: "moderate",
      languages: ["en", "fr"],
    },
  };

  const demoTraveler = {
    email: "traveler@example.com",
    passwordHash: hashedPassword,
    name: "Demo Traveler",
    avatarUrl: faker.image.avatar(),
    role: "TRAVELER" as const,
    preferences: {
      travelStyle: ["food", "history", "culture"],
      pace: "moderate",
      budget: "mid",
      currency: "USD",
    },
  };

  // Faker-generated guides
  const fakerGuides = Array.from({ length: COUNTS.guides }, () => ({
    email: faker.internet.email(),
    passwordHash: hashedPassword,
    name: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    role: "GUIDE" as const,
    preferences: {
      focus: faker.helpers.arrayElement([
        "history",
        "food",
        "nature",
        "nightlife",
        "culture",
      ]),
      pace: faker.helpers.arrayElement(["slow", "moderate", "fast"]),
      languages: ["en", "fr"],
    },
  }));

  // Faker-generated travelers
  const fakerTravelers = Array.from({ length: COUNTS.travelers }, () => ({
    email: faker.internet.email(),
    passwordHash: hashedPassword,
    name: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    role: "TRAVELER" as const,
    preferences: {
      travelStyle: faker.helpers.arrayElements(
        ["food", "history", "nature", "art", "beach", "nightlife"],
        { min: 1, max: 3 },
      ),
      pace: faker.helpers.arrayElement(["slow", "moderate", "fast"]),
      budget: faker.helpers.arrayElement(["low", "mid", "high"]),
      currency: "USD",
    },
  }));

  const allUsers = [
    adminUser,
    demoGuide,
    demoTraveler,
    ...fakerGuides,
    ...fakerTravelers,
  ];

  await prisma.user.createMany({ data: allUsers });

  const createdUsers = await prisma.user.findMany();
  const guideUsers = createdUsers.filter((u) => u.role === "GUIDE");
  const travelerUsers = createdUsers.filter((u) => u.role === "TRAVELER");

  return {
    adminUser: createdUsers.find((u) => u.email === "admin@example.com")!,
    demoGuide: createdUsers.find((u) => u.email === "guide@example.com")!,
    demoTraveler: createdUsers.find((u) => u.email === "traveler@example.com")!,
    guideUsers,
    travelerUsers,
    allUsers: createdUsers,
  };
}
