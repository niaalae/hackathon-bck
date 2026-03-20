import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { TripPublicService } from '@/services/trip-public.service';
import { CreateTripDto } from '@/public/dto/trip/create-trip.dto';
import { UpdateTripDto } from '@/public/dto/trip/update-trip.dto';
import { SearchTripQueryDto } from '@/public/dto/trip/search-trip.query.dto';

/**
 * Trip Controller
 *
 * Provides comprehensive trip management with CRUD operations,
 * filtering by city and date range, and validation.
 */
@Controller('trips')
export class TripPublicController {
  constructor(private readonly tripPublicService: TripPublicService) {}

  /**
   * Create a new trip
   *
   * POST /trips
   *
   * Request body:
   * {
   *   "title": "string (required)",
   *   "description": "string (optional)",
   *   "ownerUserId": "uuid (required)",
   *   "cityId": "uuid (optional)",
   *   "status": "DRAFT|ACTIVE|COMPLETED|CANCELED (optional, default: DRAFT)",
   *   "startDate": "ISO 8601 date (optional)",
   *   "endDate": "ISO 8601 date (optional)",
   *   "budgetTotal": "number (optional, >= 0)",
   *   "currency": "string (optional, default: USD)"
   * }
   *
   * Response (201 Created):
   * {
   *   "id": "uuid",
   *   "title": "string",
   *   "description": "string | null",
   *   "cityId": "uuid | null",
   *   "ownerUserId": "uuid",
   *   "status": "DRAFT|ACTIVE|COMPLETED|CANCELED",
   *   "startDate": "ISO 8601 DateTime | null",
   *   "endDate": "ISO 8601 DateTime | null",
   *   "budgetTotal": "Decimal",
   *   "currency": "string",
   *   "createdAt": "ISO 8601 DateTime",
   *   "updatedAt": "ISO 8601 DateTime",
   *   "owner": { user object },
   *   "city": { city object | null },
   *   "collaborators": [ { tripCollaborator object with user } ],
   *   "items": [ { tripItem object } ],
   *   "bookings": [ { booking object } ]
   * }
   *
   * Error responses:
   * - 400: Invalid data format or date validation error
   * - 404: User or city not found
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTripDto: CreateTripDto) {
    return this.tripPublicService.create(createTripDto);
  }

  /**
   * List all trips with optional filters
   *
   * GET /trips
   * GET /trips?cityId=uuid
   * GET /trips?startDate=2026-04-01&endDate=2026-04-30
   * GET /trips?status=ACTIVE
   * GET /trips?cityId=uuid&status=ACTIVE&startDate=2026-04-01
   *
   * Query Parameters:
   * ?cityId=uuid - Filter by city UUID
   * ?startDate=ISO8601 - Filter trips starting on or after this date
   * ?endDate=ISO8601 - Filter trips ending on or before this date
   * ?status=DRAFT|ACTIVE|COMPLETED|CANCELED - Filter by trip status
   *
   * Date filtering: Returns trips that overlap with the provided date range.
   * If only startDate is provided, returns trips that start on or after that date.
   * If only endDate is provided, returns trips that end on or before that date.
   * If both dates provided, returns trips that overlap with the range.
   *
   * Response (200 OK):
   * [
   *   {
   *     "id": "uuid",
   *     "title": "string",
   *     "description": "string | null",
   *     "cityId": "uuid | null",
   *     "ownerUserId": "uuid",
   *     "status": "DRAFT|ACTIVE|COMPLETED|CANCELED",
   *     "startDate": "ISO 8601 DateTime | null",
   *     "endDate": "ISO 8601 DateTime | null",
   *     "budgetTotal": "Decimal",
   *     "currency": "string",
   *     "createdAt": "ISO 8601 DateTime",
   *     "updatedAt": "ISO 8601 DateTime",
   *     "owner": { user object },
   *     "city": { city object | null },
   *     "collaborators": [ { tripCollaborator object with user } ],
   *     "items": [ { tripItem object } ],
   *     "bookings": [ { booking object } ]
   *   },
   *   ...
   * ]
   *
   * Error responses:
   * - 400: Invalid date format in query parameters
   */
  @Get()
  findAll(@Query() query: SearchTripQueryDto) {
    return this.tripPublicService.findAll(query);
  }

  /**
   * Get a specific trip by ID
   *
   * GET /trips/:id
   *
   * Parameters:
   * :id - UUID of the trip
   *
   * Response (200 OK):
   * {
   *   "id": "uuid",
   *   "title": "string",
   *   "description": "string | null",
   *   "cityId": "uuid | null",
   *   "ownerUserId": "uuid",
   *   "status": "DRAFT|ACTIVE|COMPLETED|CANCELED",
   *   "startDate": "ISO 8601 DateTime | null",
   *   "endDate": "ISO 8601 DateTime | null",
   *   "budgetTotal": "Decimal",
   *   "currency": "string",
   *   "createdAt": "ISO 8601 DateTime",
   *   "updatedAt": "ISO 8601 DateTime",
   *   "owner": { user object },
   *   "city": { city object | null },
   *   "collaborators": [ { tripCollaborator object with user } ],
   *   "items": [ { tripItem object } ],
   *   "bookings": [ { booking object } ]
   * }
   *
   * Error responses:
   * - 404: Trip not found
   */
  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tripPublicService.findOne(id);
  }

  /**
   * Update a trip
   *
   * PUT /trips/:id
   *
   * Parameters:
   * :id - UUID of the trip
   *
   * Request body: Partial UpdateTripDto (all fields optional)
   * {
   *   "title": "string",
   *   "description": "string",
   *   "cityId": "uuid",
   *   "status": "DRAFT|ACTIVE|COMPLETED|CANCELED",
   *   "startDate": "ISO 8601 date",
   *   "endDate": "ISO 8601 date",
   *   "budgetTotal": "number (>= 0)",
   *   "currency": "string"
   * }
   *
   * Response (200 OK):
   * Updated trip object (same schema as GET /trips/:id)
   *
   * Error responses:
   * - 400: Invalid data format or date validation error
   * - 404: Trip, user, or city not found
   */
  @Put(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() updateTripDto: UpdateTripDto) {
    return this.tripPublicService.update(id, updateTripDto);
  }

  /**
   * Delete a trip
   *
   * DELETE /trips/:id
   *
   * Parameters:
   * :id - UUID of the trip
   *
   * Response (200 OK):
   * Deleted trip object (same schema as GET /trips/:id, but without relations)
   *
   * Error responses:
   * - 404: Trip not found
   *
   * Note: This performs a hard delete. All related records
   * (collaborators, items, etc.) are cascade deleted.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tripPublicService.remove(id);
  }
}
