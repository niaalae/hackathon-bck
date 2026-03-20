import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTripDto } from '@/admin/dto/trip/create-trip.dto';
import { UpdateTripDto } from '@/admin/dto/trip/update-trip.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class TripService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createTripDto: CreateTripDto) {
    const { collaborators, items, ...tripData } = createTripDto;

    try {
      return await this.prismaService.trip.create({
        data: {
          ...tripData,
          startDate: tripData.startDate ? new Date(tripData.startDate) : undefined,
          endDate: tripData.endDate ? new Date(tripData.endDate) : undefined,
          collaborators: collaborators?.length
            ? {
                createMany: {
                  data: collaborators.map((collab) => ({
                    userId: collab.userId,
                    role: collab.role ?? 'VIEWER',
                  })),
                },
              }
            : undefined,
          items: items?.length
            ? {
                createMany: {
                  data: items.map((item) => ({
                    day: item.day,
                    title: item.title,
                    location: item.location,
                    time: item.time ? new Date(item.time) : undefined,
                    notes: item.notes,
                    type: item.type,
                  })),
                },
              }
            : undefined,
        },
        include: { collaborators: true, items: true, bookings: true },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Trip already exists');
      throw e;
    }
  }

  findAll() {
    return this.prismaService.trip.findMany({
      include: { collaborators: true, items: true, bookings: true },
    });
  }

  findOne(id: string) {
    return this.prismaService.trip.findUnique({
      where: { id },
      include: { collaborators: true, items: true, bookings: true },
    });
  }

  async update(id: string, updateTripDto: UpdateTripDto) {
    const { collaborators, items, ...tripData } = updateTripDto;

    try {
      return await this.prismaService.$transaction(async (tx) => {
        if (collaborators) {
          await tx.tripCollaborator.deleteMany({ where: { tripId: id } });
          if (collaborators.length) {
            await tx.tripCollaborator.createMany({
              data: collaborators.map((collab) => ({
                tripId: id,
                userId: collab.userId,
                role: collab.role ?? 'VIEWER',
              })),
            });
          }
        }

        if (items) {
          await tx.tripItem.deleteMany({ where: { tripId: id } });
          if (items.length) {
            await tx.tripItem.createMany({
              data: items.map((item) => ({
                tripId: id,
                day: item.day,
                title: item.title,
                location: item.location,
                time: item.time ? new Date(item.time) : undefined,
                notes: item.notes,
                type: item.type,
              })),
            });
          }
        }

        return tx.trip.update({
          where: { id },
          data: {
            ...tripData,
            startDate: tripData.startDate ? new Date(tripData.startDate) : undefined,
            endDate: tripData.endDate ? new Date(tripData.endDate) : undefined,
          },
          include: { collaborators: true, items: true, bookings: true },
        });
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002')
        throw new ConflictException('Trip already exists');
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Trip not found');
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.trip.delete({ where: { id } });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025')
        throw new NotFoundException('Trip not found');
      throw e;
    }
  }

  async addUser(tripId: string, userId: string) {
    return this.prismaService.tripCollaborator.create({
      data: { tripId, userId, role: 'VIEWER' },
    });
  }

  async removeUser(tripId: string, userId: string) {
    return this.prismaService.tripCollaborator.delete({
      where: { tripId_userId: { tripId, userId } },
    });
  }
}
