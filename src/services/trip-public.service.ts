import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTripDto } from '@/public/dto/trip/create-trip.dto';
import { UpdateTripDto } from '@/public/dto/trip/update-trip.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';
import { SearchTripQueryDto } from '@/public/dto/trip/search-trip.query.dto';

@Injectable()
export class TripPublicService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Validate trip dates if both are provided
   * @throws BadRequestException if endDate is before startDate
   */
  private validateDates(startDate?: string | Date, endDate?: string | Date): void {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    if (end < start) {
      throw new BadRequestException('endDate must be after startDate');
    }
  }

  async create(createTripDto: CreateTripDto) {
    // Validate dates
    this.validateDates(createTripDto.startDate, createTripDto.endDate);

    // Validate owner user exists
    const owner = await this.prismaService.user.findUnique({
      where: { id: createTripDto.ownerUserId },
    });
    if (!owner) {
      throw new NotFoundException(`User with ID ${createTripDto.ownerUserId} not found`);
    }

    // Validate city exists if provided
    if (createTripDto.cityId) {
      const city = await this.prismaService.city.findUnique({
        where: { id: createTripDto.cityId },
      });
      if (!city) {
        throw new NotFoundException(`City with ID ${createTripDto.cityId} not found`);
      }
    }

    try {
      return await this.prismaService.trip.create({
        data: {
          title: createTripDto.title,
          description: createTripDto.description,
          cityId: createTripDto.cityId,
          ownerUserId: createTripDto.ownerUserId,
          status: createTripDto.status ?? 'DRAFT',
          startDate: createTripDto.startDate
            ? new Date(createTripDto.startDate)
            : undefined,
          endDate: createTripDto.endDate ? new Date(createTripDto.endDate) : undefined,
          budgetTotal: createTripDto.budgetTotal,
          currency: createTripDto.currency ?? 'USD',
        },
        include: {
          owner: true,
          city: true,
          collaborators: { include: { user: true } },
          items: true,
          bookings: true,
        },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025') {
        throw new NotFoundException('User or City not found');
      }
      throw e;
    }
  }

  async findAll(filters?: SearchTripQueryDto) {
    const where: any = {};

    if (filters?.cityId) {
      where.cityId = filters.cityId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    // If filtering by date range, find trips that overlap with the provided dates
    if (filters?.startDate || filters?.endDate) {
      const filterStart = filters?.startDate ? new Date(filters.startDate) : undefined;
      const filterEnd = filters?.endDate ? new Date(filters.endDate) : undefined;

      // Validate the filter dates
      if (filterStart && isNaN(filterStart.getTime())) {
        throw new BadRequestException('Invalid startDate format');
      }
      if (filterEnd && isNaN(filterEnd.getTime())) {
        throw new BadRequestException('Invalid endDate format');
      }
      if (filterStart && filterEnd && filterEnd < filterStart) {
        throw new BadRequestException('endDate must be after startDate');
      }

      // Find trips that overlap with the date range
      // Trip overlaps if: trip.startDate < filterEnd AND trip.endDate > filterStart
      if (filterStart && filterEnd) {
        where.AND = [
          { OR: [{ startDate: null }, { startDate: { lt: filterEnd } }] },
          { OR: [{ endDate: null }, { endDate: { gt: filterStart } }] },
        ];
      } else if (filterStart) {
        where.OR = [{ startDate: null }, { startDate: { gte: filterStart } }];
      } else if (filterEnd) {
        where.OR = [{ endDate: null }, { endDate: { lte: filterEnd } }];
      }
    }

    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 20;

    return await this.prismaService.trip.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        owner: true,
        city: true,
        collaborators: { include: { user: true } },
        items: true,
        bookings: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const trip = await this.prismaService.trip.findUnique({
      where: { id },
      include: {
        owner: true,
        city: true,
        collaborators: { include: { user: true } },
        items: true,
        bookings: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto) {
    // Validate dates
    this.validateDates(updateTripDto.startDate, updateTripDto.endDate);

    // Verify trip exists
    const existingTrip = await this.prismaService.trip.findUnique({
      where: { id },
    });

    if (!existingTrip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    // Validate city exists if provided
    if (updateTripDto.cityId) {
      const city = await this.prismaService.city.findUnique({
        where: { id: updateTripDto.cityId },
      });
      if (!city) {
        throw new NotFoundException(`City with ID ${updateTripDto.cityId} not found`);
      }
    }

    try {
      return await this.prismaService.trip.update({
        where: { id },
        data: {
          title: updateTripDto.title,
          description: updateTripDto.description,
          cityId: updateTripDto.cityId,
          status: updateTripDto.status,
          startDate: updateTripDto.startDate
            ? new Date(updateTripDto.startDate)
            : undefined,
          endDate: updateTripDto.endDate ? new Date(updateTripDto.endDate) : undefined,
          budgetTotal: updateTripDto.budgetTotal,
          currency: updateTripDto.currency,
        },
        include: {
          owner: true,
          city: true,
          collaborators: { include: { user: true } },
          items: true,
          bookings: true,
        },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2025') {
        throw new NotFoundException('Trip not found');
      }
      throw e;
    }
  }

  async remove(id: string) {
    const trip = await this.prismaService.trip.findUnique({
      where: { id },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return await this.prismaService.trip.delete({
      where: { id },
    });
  }
}
