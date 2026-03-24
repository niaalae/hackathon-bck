import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedRegionsAndCities } from './seed-files/seed-regions-cities'
import { seedAttractionsAndTags } from './seed-files/seed-attractions'
import { seedUsers } from './seed-files/seed-users'
import { seedGuides } from './seed-files/seed-guides'
import { seedTrips } from './seed-files/seed-trips'
import { seedDemoData } from './seed-files/seed-demo'
import { seedSocialData } from './seed-files/seed-social'
import { seedInfoBlocksAndTranslations } from './seed-files/seed-infoblocks'
import { seedTripCollaborators } from './seed-files/seed-collaborators'
import { seedBookings } from './seed-files/seed-bookings'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl || typeof databaseUrl !== 'string') {
	throw new Error('Missing DATABASE_URL in environment.')
}

export const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: databaseUrl }),
})

async function clearData() {
	await prisma.notification.deleteMany()
	await prisma.groupMessage.deleteMany()
	await prisma.groupMembership.deleteMany()
	await prisma.match.deleteMany()
	await prisma.swipe.deleteMany()
	await prisma.message.deleteMany()
	await prisma.rating.deleteMany()
	await prisma.booking.deleteMany()
	await prisma.tripItem.deleteMany()
	await prisma.tripCollaborator.deleteMany()
	await prisma.trip.deleteMany()
	await prisma.group.deleteMany()
	await prisma.guidePastTrip.deleteMany()
	await prisma.guideMedia.deleteMany()
	await prisma.guide.deleteMany()
	await prisma.attractionTagMap.deleteMany()
	await prisma.attractionMedia.deleteMany()
	await prisma.infoBlock.deleteMany()
	await prisma.translation.deleteMany()
	await prisma.attraction.deleteMany()
	await prisma.tag.deleteMany()
	await prisma.city.deleteMany()
	await prisma.region.deleteMany()
	await prisma.user.deleteMany()
}

export async function runSeed() {
	await clearData()

	const { regionIds, cityIds } = await seedRegionsAndCities()
	const { attractionIds } = await seedAttractionsAndTags(cityIds)

	const { guideUsers, travelerUsers, allUsers } = await seedUsers()
	const { guideIds } = await seedGuides(guideUsers, cityIds)
	const { tripIds } = await seedTrips(travelerUsers, cityIds)

	const allTrips = await prisma.trip.findMany({
		select: { id: true, ownerUserId: true, startDate: true },
	})

	await seedBookings(allTrips)
	await seedTripCollaborators(allTrips, travelerUsers)

	const { demoTrips, demoGroups, demoBookings } = await seedDemoData(travelerUsers)

	await seedSocialData(travelerUsers, { guideIds }, { tripIds })
	await seedInfoBlocksAndTranslations(regionIds, cityIds, attractionIds)

	const frontendTripPayload = await prisma.trip.findMany({
		where: { id: { in: demoTrips.map((trip) => trip.id) } },
		include: { collaborators: true, items: true, bookings: true },
		orderBy: { startDate: 'asc' },
	})

	console.log('Seed completed', {
		users: allUsers.length,
		guides: guideUsers.length,
		regions: regionIds.length,
		cities: cityIds.length,
		attractions: attractionIds.length,
		trips: tripIds.length,
		demoGroupCount: demoGroups.length,
		demoTripCount: demoTrips.length,
		demoBookingCount: demoBookings.length,
	})

	console.log(
		'Demo trip ids',
		demoTrips.map((trip) => trip.id),
	)
	console.log(
		'Demo booking ids',
		demoBookings.map((booking) => booking.id),
	)
	console.log(
		'Frontend readiness: /trips payload includes demo trips and bookings',
		frontendTripPayload.map((trip) => ({
			tripId: trip.id,
			bookings: trip.bookings.length,
			items: trip.items.length,
			collaborators: trip.collaborators.length,
		})),
	)
}

runSeed()
	.catch((error) => {
		console.error('Seed failed:', error)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
