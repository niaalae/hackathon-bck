import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BookingService } from '@/services/booking.service';
import { CreateBookingDto } from '@/public/dto/booking/create-booking.dto';
import { UpdateBookingDto } from '@/public/dto/booking/update-booking.dto';
import { PaginationQueryDto } from '@/public/dto/common/pagination-query.dto';

/**
 * Booking Controller
 *
 * Manages booking CRUD operations with automatic commission calculation.
 * All monetary values are returned as decimals, rounded to 2 decimal places.
 *
 * Response Format:
 * - All booking objects include computed commissionValue field
 * - Dates are returned in ISO 8601 format
 * - Currency defaults to 'USD'
 */
@Controller('bookings')
export class BookingPublicController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * Create a new booking
   *
   * POST /bookings
   *
   * Request body:
   * {
   *   "tripId": "uuid (optional)",
   *   "userId": "uuid (required)",
   *   "itemName": "string (required)",
   *   "type": "FLIGHT|STAY|EXPERIENCE|RENTAL|GUIDE (required)",
   *   "basePrice": "number (required, > 0)",
   *   "commissionPct": "number (optional, default: 0.10)",
   *   "provider": "string (optional)",
   *   "externalRef": "string (optional)",
   *   "currency": "string (optional, default: USD)",
   *   "status": "PENDING|CONFIRMED|CANCELED (optional, default: PENDING)",
   *   "startDate": "ISO 8601 date (optional)",
   *   "endDate": "ISO 8601 date (optional)"
   * }
   *
   * Response:
   * {
   *   "id": "uuid",
   *   "tripId": "uuid | null",
   *   "userId": "uuid",
   *   "itemName": "string",
   *   "type": "BookingType enum",
   *   "basePrice": "Decimal as string",
   *   "commissionPct": "Decimal as string (0.1 for 10%)",
   *   "commissionValue": "Decimal as string (10% of basePrice)",
   *   "provider": "string | null",
   *   "externalRef": "string | null",
   *   "currency": "string",
   *   "status": "BookingStatus enum",
   *   "startDate": "ISO 8601 | null",
   *   "endDate": "ISO 8601 | null",
   *   "createdAt": "ISO 8601",
   *   "updatedAt": "ISO 8601",
   *   "trip": { trip object | null },
   *   "user": { user object }
   * }
   *
   * Example commission calculation:
   * - basePrice: 100, commissionPct: 0.10 → commissionValue: 10.00
   * - basePrice: 1000.99, commissionPct: 0.10 → commissionValue: 100.10 (rounded to 2 decimals)
   */
  @Post()
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingService.create(createBookingDto);
  }

  /**
   * Get all bookings
   *
   * GET /bookings
   *
   * Returns all bookings ordered by creation date (newest first)
   *
   * Response: Array of booking objects (see create response schema above)
   */
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.bookingService.findAll(query);
  }

  /**
   * Get a specific booking by ID
   *
   * GET /bookings/:id
   *
   * Parameters:
   * - id: UUID of the booking
   *
   * Response: Single booking object (see create response schema above)
   *
   * Error responses:
   * - 404: Booking not found
   */
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingService.findOne(id);
  }

  /**
   * Update a booking
   *
   * PATCH /bookings/:id
   *
   * Parameters:
   * - id: UUID of the booking
   *
   * Request body: Partial UpdateBookingDto (all fields optional)
   *
   * Response: Updated booking object (see create response schema above)
   *
   * Note: If basePrice or commissionPct is updated,
   * commissionValue will be recalculated automatically.
   */
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingService.update(id, updateBookingDto);
  }

  /**
   * Delete a booking
   *
   * DELETE /bookings/:id
   *
   * Parameters:
   * - id: UUID of the booking
   *
   * Response: Deleted booking object
   *
   * Error responses:
   * - 404: Booking not found
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.bookingService.remove(id);
  }
}
