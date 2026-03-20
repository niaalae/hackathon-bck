import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateBookingDto } from '@/public/dto/booking/create-booking.dto';
import { UpdateBookingDto } from '@/public/dto/booking/update-booking.dto';
import { getPrismaErrorCode } from '@/prisma/prisma-error.util';

@Injectable()
export class BookingService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Calculate commission value based on base price and commission percentage
   * @param basePrice The base price as a number
   * @param commissionPct The commission percentage (e.g., 0.10 for 10%)
   * @returns The calculated commission value, rounded to 2 decimals
   */
  private calculateCommission(basePrice: number, commissionPct: number): number {
    const commission = basePrice * commissionPct;
    // Use decimal string rounding to avoid floating-point edge cases.
    return Number(commission.toFixed(2));
  }

  /**
   * Validate booking dates if both are provided
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

  async create(createBookingDto: CreateBookingDto) {
    // Validate dates
    this.validateDates(createBookingDto.startDate, createBookingDto.endDate);

    // Validate user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: createBookingDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${createBookingDto.userId} not found`);
    }

    // Validate trip exists if tripId is provided
    if (createBookingDto.tripId) {
      const trip = await this.prismaService.trip.findUnique({
        where: { id: createBookingDto.tripId },
      });
      if (!trip) {
        throw new NotFoundException(`Trip with ID ${createBookingDto.tripId} not found`);
      }
    }

    // Calculate commission
    const basePrice = createBookingDto.basePrice;
    const commissionPct = createBookingDto.commissionPct ?? 0.1;
    const commissionValue = this.calculateCommission(basePrice, commissionPct);

    try {
      return await this.prismaService.booking.create({
        data: {
          tripId: createBookingDto.tripId,
          userId: createBookingDto.userId,
          itemName: createBookingDto.itemName,
          type: createBookingDto.type,
          provider: createBookingDto.provider,
          externalRef: createBookingDto.externalRef,
          basePrice,
          commissionPct,
          commissionValue,
          currency: createBookingDto.currency ?? 'USD',
          status: createBookingDto.status ?? 'PENDING',
          startDate: createBookingDto.startDate
            ? new Date(createBookingDto.startDate)
            : undefined,
          endDate: createBookingDto.endDate
            ? new Date(createBookingDto.endDate)
            : undefined,
        },
        include: { trip: true, user: true },
      });
    } catch (e) {
      if (getPrismaErrorCode(e) === 'P2002') {
        throw new ConflictException('Booking already exists');
      }
      throw e;
    }
  }

  async findAll(params?: { offset?: number; limit?: number }) {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 20;
    return await this.prismaService.booking.findMany({
      skip: offset,
      take: limit,
      include: { trip: true, user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
      include: { trip: true, user: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    // Validate dates if provided
    this.validateDates(updateBookingDto.startDate, updateBookingDto.endDate);

    // Verify booking exists
    const existingBooking = await this.prismaService.booking.findUnique({
      where: { id },
    });

    if (!existingBooking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Calculate new commission if basePrice or commissionPct changed
    let commissionValue: number | undefined;
    if (
      updateBookingDto.basePrice !== undefined ||
      updateBookingDto.commissionPct !== undefined
    ) {
      const basePriceNum = Number(
        updateBookingDto.basePrice ?? existingBooking.basePrice,
      );
      const commissionPctNum = Number(
        updateBookingDto.commissionPct ?? existingBooking.commissionPct,
      );
      commissionValue = this.calculateCommission(basePriceNum, commissionPctNum);
    }

    try {
      return await this.prismaService.booking.update({
        where: { id },
        data: {
          itemName: updateBookingDto.itemName,
          type: updateBookingDto.type,
          provider: updateBookingDto.provider,
          externalRef: updateBookingDto.externalRef,
          basePrice: updateBookingDto.basePrice,
          commissionPct: updateBookingDto.commissionPct,
          commissionValue,
          currency: updateBookingDto.currency,
          status: updateBookingDto.status,
          startDate: updateBookingDto.startDate
            ? new Date(updateBookingDto.startDate)
            : undefined,
          endDate: updateBookingDto.endDate
            ? new Date(updateBookingDto.endDate)
            : undefined,
        },
        include: { trip: true, user: true },
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    const booking = await this.prismaService.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    return await this.prismaService.booking.delete({
      where: { id },
    });
  }
}
