# Trip API Documentation

## Overview

The Trip API provides comprehensive CRUD operations for managing travel trips with advanced filtering capabilities. The API includes city-based filtering, date range filtering with overlap detection, and full validation for all operations.

**Base URL:** `http://localhost:3000/api`  
**API Prefix:** `/trips`

---

## Data Models

### Trip Model

```typescript
{
  id: string;                    // UUID
  ownerUserId: string;           // UUID - User who created the trip
  title: string;                 // Trip title
  description?: string;          // Multi-paragraph trip description
  cityId?: string;               // UUID - Link to City
  status: TripStatus;            // DRAFT | ACTIVE | COMPLETED | CANCELED
  startDate?: DateTime;          // Trip start date/time
  endDate?: DateTime;            // Trip end date/time
  budgetTotal?: Decimal;         // Total budget in decimal(12,2)
  currency: string;              // Currency code (default: USD)
  createdAt: DateTime;           // Auto-generated creation timestamp
  updatedAt: DateTime;           // Auto-updated modification timestamp
  
  // Relations (included in responses)
  owner: User;
  city?: City;
  collaborators: Collaborator[];
  items: TripItem[];
  bookings: Booking[];
  ratings: Rating[];
  messages: Message[];
}
```

### Trip Status Enum

- `DRAFT` - Trip is being planned
- `ACTIVE` - Trip is currently active/ongoing
- `COMPLETED` - Trip has finished
- `CANCELED` - Trip was canceled

---

## Endpoints

### 1. Create Trip

**Endpoint:** `POST /trips`

**Description:** Create a new trip with city and user validation.

**Request Body:**

```typescript
{
  title: string;                    // Required: Trip name (1-255 chars)
  description?: string;             // Optional: Trip description
  cityId?: string;                  // Optional: UUID of city
  ownerUserId: string;              // Required: UUID of trip owner
  status?: TripStatus;              // Optional: default DRAFT
  startDate?: string;               // Optional: ISO 8601 date string
  endDate?: string;                 // Optional: ISO 8601 date string
  budgetTotal?: number;             // Optional: min 0
  currency?: string;                // Optional: default USD
}
```

**Response:** `201 Created`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ownerUserId": "user-123",
  "title": "European Adventure",
  "description": "A 2-week trip exploring Paris, Rome, and Barcelona.",
  "cityId": "city-456",
  "status": "ACTIVE",
  "startDate": "2026-04-05T09:00:00Z",
  "endDate": "2026-04-10T20:00:00Z",
  "budgetTotal": "3200.00",
  "currency": "USD",
  "createdAt": "2026-03-18T10:30:45Z",
  "updatedAt": "2026-03-18T10:30:45Z",
  "owner": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "city": {
    "id": "city-456",
    "name": "Paris",
    "slug": "paris-demo",
    "lat": 48.8566,
    "lng": 2.3522
  },
  "collaborators": [],
  "items": [],
  "bookings": [],
  "ratings": [],
  "messages": []
}
```

**Error Responses:**

- `400 Bad Request` - Validation failed (invalid format, missing required fields)
- `404 Not Found` - User or city not found

**Example cURL:**

```bash
curl -X POST http://localhost:3000/api/trips \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Paris Spring Escape",
    "description": "Discover the magic of Paris in spring.",
    "cityId": "city-paris-123",
    "ownerUserId": "user-789",
    "status": "ACTIVE",
    "startDate": "2026-04-05T09:00:00Z",
    "endDate": "2026-04-10T20:00:00Z",
    "budgetTotal": 3200,
    "currency": "USD"
  }'
```

---

### 2. Get All Trips (with Filtering)

**Endpoint:** `GET /trips`

**Description:** Retrieve trips with optional filters for city, date range, and status.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `cityId` | UUID | Filter trips by city | `?cityId=city-paris-123` |
| `startDate` | ISO 8601 | Filter trips starting on/after this date | `?startDate=2026-04-01T00:00:00Z` |
| `endDate` | ISO 8601 | Filter trips ending on/before this date | `?endDate=2026-04-30T23:59:59Z` |
| `status` | Enum | Filter trips by status (DRAFT/ACTIVE/COMPLETED/CANCELED) | `?status=ACTIVE` |

**Date Range Filtering Logic:**

The API uses **overlap detection** for date filtering. A trip is included in results if its date range overlaps with the filter range:

- Trip overlaps if: `trip.startDate < filterEnd AND trip.endDate > filterStart`
- Trips with NULL dates are always included in date-filtered queries
- Filters are composable (all provided filters must match)

**Response:** `200 OK`

```json
{
  "trips": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "ownerUserId": "user-123",
      "title": "Paris Spring Escape",
      "description": "Discover the magic of Paris in spring.",
      "cityId": "city-paris-123",
      "status": "ACTIVE",
      "startDate": "2026-04-05T09:00:00Z",
      "endDate": "2026-04-10T20:00:00Z",
      "budgetTotal": "3200.00",
      "currency": "USD",
      "createdAt": "2026-03-18T10:30:45Z",
      "updatedAt": "2026-03-18T10:30:45Z",
      "owner": { /* User object */ },
      "city": { /* City object */ },
      "collaborators": [],
      "items": [],
      "bookings": [],
      "ratings": [],
      "messages": []
    },
    // ... more trips
  ]
}
```

**Error Responses:**

- `400 Bad Request` - Invalid date format

**Example cURL:**

```bash
# Get all active trips
curl "http://localhost:3000/api/trips?status=ACTIVE"

# Get trips in Paris from April 2026
curl "http://localhost:3000/api/trips?cityId=city-paris-123&startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z"

# Get trips with date overlap (April 5-10)
curl "http://localhost:3000/api/trips?startDate=2026-04-05T09:00:00Z&endDate=2026-04-10T20:00:00Z"

# Combine filters: Paris + April 2026 + ACTIVE
curl "http://localhost:3000/api/trips?cityId=city-paris-123&startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z&status=ACTIVE"
```

---

### 3. Get Single Trip

**Endpoint:** `GET /trips/:id`

**Description:** Retrieve a single trip by UUID with all related data.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Trip ID |

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ownerUserId": "user-123",
  "title": "Paris Spring Escape",
  "description": "Discover the magic of Paris in spring.",
  "cityId": "city-paris-123",
  "status": "ACTIVE",
  "startDate": "2026-04-05T09:00:00Z",
  "endDate": "2026-04-10T20:00:00Z",
  "budgetTotal": "3200.00",
  "currency": "USD",
  "createdAt": "2026-03-18T10:30:45Z",
  "updatedAt": "2026-03-18T10:30:45Z",
  "owner": { /* Full User object */ },
  "city": { /* Full City object */ },
  "collaborators": [ /* Collaborator array with nested users */ ],
  "items": [ /* TripItem array */ ],
  "bookings": [ /* Booking array */ ],
  "ratings": [ /* Rating array */ ],
  "messages": [ /* Message array */ ]
}
```

**Error Responses:**

- `404 Not Found` - Trip with given ID does not exist

**Example cURL:**

```bash
curl "http://localhost:3000/api/trips/550e8400-e29b-41d4-a716-446655440000"
```

---

### 4. Update Trip

**Endpoint:** `PUT /trips/:id`

**Description:** Update an existing trip. All fields are optional (partial updates supported).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Trip ID |

**Request Body:** (All fields optional)

```typescript
{
  title?: string;                   // Trip title
  description?: string;             // Trip description
  cityId?: string;                  // UUID of city
  status?: TripStatus;              // Trip status
  startDate?: string;               // ISO 8601 date string
  endDate?: string;                 // ISO 8601 date string
  budgetTotal?: number;             // Budget (min 0)
  currency?: string;                // Currency code
}
```

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ownerUserId": "user-123",
  "title": "Updated Paris Spring Escape",
  "description": "Updated description...",
  "cityId": "city-paris-123",
  "status": "COMPLETED",
  "startDate": "2026-04-05T09:00:00Z",
  "endDate": "2026-04-15T20:00:00Z",
  "budgetTotal": "3500.00",
  "currency": "USD",
  "createdAt": "2026-03-18T10:30:45Z",
  "updatedAt": "2026-03-18T14:22:15Z",
  "owner": { /* User object */ },
  "city": { /* City object */ },
  "collaborators": [],
  "items": [],
  "bookings": [],
  "ratings": [],
  "messages": []
}
```

**Error Responses:**

- `400 Bad Request` - Validation failed, invalid date format, endDate < startDate
- `404 Not Found` - Trip or referenced city not found

**Example cURL:**

```bash
# Update trip status
curl -X PUT http://localhost:3000/api/trips/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "COMPLETED",
    "budgetTotal": 3500
  }'

# Update city reference
curl -X PUT http://localhost:3000/api/trips/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "city-tokyo-456"
  }'
```

---

### 5. Delete Trip

**Endpoint:** `DELETE /trips/:id`

**Description:** Delete a trip (hard delete - removes trip and all related data via CASCADE).

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Trip ID |

**Response:** `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ownerUserId": "user-123",
  "title": "Deleted Trip",
  "description": null,
  "cityId": "city-paris-123",
  "status": "ACTIVE",
  "startDate": "2026-04-05T09:00:00Z",
  "endDate": "2026-04-10T20:00:00Z",
  "budgetTotal": "3200.00",
  "currency": "USD",
  "createdAt": "2026-03-18T10:30:45Z",
  "updatedAt": "2026-03-18T10:30:45Z"
}
```

**Error Responses:**

- `404 Not Found` - Trip with given ID does not exist

**Warning:** Deleting a trip will cascade and remove:
- All trip items (TripItem)
- All bookings for this trip (Booking)
-All trip collaborators (TripCollaborator)
- All messages related to this trip (Message)
- All ratings for this trip (Rating)

**Example cURL:**

```bash
curl -X DELETE http://localhost:3000/api/trips/550e8400-e29b-41d4-a716-446655440000
```

---

## Date Range Filtering Details

### Overlap Detection Algorithm

The Trip API implements date range overlap detection to find trips that intersect with your filter date range:

```
Trip overlaps with filter if:
  (trip.startDate == null OR trip.startDate < filterEnd) AND
  (trip.endDate == null OR trip.endDate > filterStart)
```

### Examples

Given filter range: **April 5 - April 10, 2026**

| Trip Range | Overlaps? | Reason |
|-----------|-----------|--------|
| March 30 - April 8 | ✅ Yes | Ends during filter range |
| April 1 - April 20 | ✅ Yes | Fully contains filter range |
| April 6 - April 9 | ✅ Yes | Within filter range |
| April 10 - April 15 | ✅ Yes | Starts during filter range |
| April 11 - April 20 | ❌ No | Starts after filter ends |
| March 20 - April 4 | ❌ No | Ends before filter starts |
| null - null | ✅ Yes | No dates specified (always included) |

---

## Status Codes Reference

| Code | Status | Meaning |
|------|--------|---------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Trip successfully created |
| 400 | Bad Request | Validation error, invalid format, date error |
| 404 | Not Found | Trip/User/City not found |
| 500 | Internal Server Error | Server error |

---

## Common Request Patterns

### Fetch all trips for a specific city

```bash
curl "http://localhost:3000/api/trips?cityId=city-paris-123"
```

### Find trips happening in a specific month

```bash
curl "http://localhost:3000/api/trips?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z"
```

### Find active trips in Paris in April

```bash
curl "http://localhost:3000/api/trips?cityId=city-paris-123&startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z&status=ACTIVE"
```

### Pagination (manual offset-based)

```bash
# First 10 results
curl "http://localhost:3000/api/trips"

# Note: Current API returns all results. For large datasets, 
# implement pagination with skip/take parameters
```

---

## Validation Rules

### Required Fields (Create)

- `title` - Non-empty string (1-255 characters)
- `ownerUserId` - Valid UUID format

### Optional Fields (Create)

- `description` - Text (recommended: multi-paragraph description)
- `cityId` - Valid UUID (must exist in database)
- `status` - One of: DRAFT, ACTIVE, COMPLETED, CANCELED (default: DRAFT)
- `startDate` - ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- `endDate` - ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- `budgetTotal` - Non-negative number (recommended: decimal with 2 places)
- `currency` - ISO 4217 code (default: USD)

### Date Validation Rules

- If both `startDate` and `endDate` provided: `endDate` must be greater than `startDate`
- Dates should be in ISO 8601 format: `YYYY-MM-DDTHH:mm:ssZ`
- Times are stored in UTC (Z timezone)

### User/City Validation

- `ownerUserId` - Must exist in users table
- `cityId` - Must exist in cities table

---

## Response Format

All responses follow a consistent JSON structure with full relation includes:

```json
{
  "id": "uuid",
  "ownerUserId": "uuid",
  "title": "string",
  "description": "string | null",
  "cityId": "uuid | null",
  "status": "enum",
  "startDate": "ISO8601 | null",
  "endDate": "ISO8601 | null",
  "budgetTotal": "decimal | null",
  "currency": "string",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "owner": { /* Full User object */ },
  "city": { /* Full City object or null */ },
  "collaborators": [ /* Array of Collaborator objects with nested User */ ],
  "items": [ /* Array of TripItem objects */ ],
  "bookings": [ /* Array of Booking objects */ ],
  "ratings": [ /* Array of Rating objects */ ],
  "messages": [ /* Array of Message objects */ ]
}
```

---

## Demo Data

The database seed includes 3 demo trips with all relations:

1. **Paris Spring Escape**
   - City: Paris
   - Duration: April 5-10, 2026
   - Budget: $3,200 USD
   - Includes: 2 bookings (flight + hotel), 2 trip items

2. **Tokyo Food Adventure**
   - City: Tokyo
   - Duration: June 12-18, 2026
   - Budget: $4,100 USD
   - Includes: 2 bookings (guide + food experience), 2 trip items

3. **Lisbon Coastal Retreat**
   - City: Lisbon
   - Duration: September 1-7, 2026
   - Budget: $2,700 USD
   - Includes: 1 booking (car rental), 2 trip items

Access demo trips:
```bash
curl "http://localhost:3000/api/trips"
```

---

## Error Handling

### Validation Errors (400)

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    "title must be a string",
    "ownerUserId must be a UUID",
    "endDate must be greater than startDate"
  ]
}
```

### Not Found Errors (404)

```json
{
  "statusCode": 404,
  "message": "Trip with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

### Date Format Errors (400)

```json
{
  "statusCode": 400,
  "message": "Invalid date format. Use ISO 8601: YYYY-MM-DDTHH:mm:ssZ",
  "error": "Bad Request"
}
```

---

## Implementation Details

### Service Layer

**File:** `src/services/trip-public.service.ts`

The service implements:
- `create(dto)` - Creates trip with validation
- `findAll(filters)` - Advanced filtering with overlap detection
- `findOne(id)` - Fetches single trip with relations
- `update(id, dto)` - Updates with validation
- `remove(id)` - Hard delete with CASCADE

### Controller

**File:** `src/public/controllers/trip-public.controller.ts`

- 5 HTTP endpoints with full JSDoc documentation
- Proper status code handling (201, 200, 404, 400)
- Comprehensive error handling

### DTO Validation

**Files:** 
- `src/public/dto/trip/create-trip.dto.ts`
- `src/public/dto/trip/update-trip.dto.ts`

Uses class-validator decorators for:
- Type validation (string, UUID, enum, datetime)
- Constraints (Min for budgetTotal)
- Optional fields

### Database Schema

**File:** `prisma/schema.prisma`

Trip model includes:
- id, ownerUserId, title, description, cityId
- status, startDate, endDate, budgetTotal, currency
- createdAt, updatedAt (auto-managed)
- Relations: owner (User), city (City), collaborators, items, bookings, ratings, messages
- Indices on ownerUserId, cityId for query performance

---

## Changes from Previous Versions

### v2.0 - Enhanced with City Support

**Added:**
- `cityId` field - Link trips to specific cities
- `description` field - Multi-paragraph trip descriptions
- `createdAt`, `updatedAt` fields - Timestamp tracking
- Advanced date range overlap filtering
- City relation with full City object in responses
- Migration 20260318000001_add_trip_city_description

**Breaking Changes:**
- Trip creation now includes `description` and `cityId` fields
- Responses now include full City relation (if cityId is set)

**Database Migration:**
```sql
ALTER TABLE "trips" ADD COLUMN "description" TEXT;
ALTER TABLE "trips" ADD COLUMN "city_id" TEXT;
ALTER TABLE "trips" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "trips" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "trips_city_id_idx" ON "trips"("city_id");
ALTER TABLE "trips" ADD CONSTRAINT "trips_city_id_fkey" 
  FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL;
```

---

## Postman Collection

Import this collection in Postman:

```json
{
  "info": {
    "name": "Trip API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Trip",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/trips",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"title\": \"Paris Spring Escape\",\n  \"cityId\": \"city-paris-123\",\n  \"ownerUserId\": \"user-789\",\n  \"status\": \"ACTIVE\"\n}"
        }
      }
    },
    {
      "name": "Get Trips (All)",
      "request": {"method": "GET", "url": "{{baseUrl}}/trips"}
    },
    {
      "name": "Get Trips (by City)",
      "request": {"method": "GET", "url": "{{baseUrl}}/trips?cityId=city-paris-123"}
    },
    {
      "name": "Get Trips (by Date Range)",
      "request": {"method": "GET", "url": "{{baseUrl}}/trips?startDate=2026-04-01T00:00:00Z&endDate=2026-04-30T23:59:59Z"}
    },
    {
      "name": "Get Single Trip",
      "request": {"method": "GET", "url": "{{baseUrl}}/trips/550e8400-e29b-41d4-a716-446655440000"}
    },
    {
      "name": "Update Trip",
      "request": {
        "method": "PUT",
        "url": "{{baseUrl}}/trips/550e8400-e29b-41d4-a716-446655440000",
        "body": {"mode": "raw", "raw": "{\"status\": \"COMPLETED\"}"}
      }
    },
    {
      "name": "Delete Trip",
      "request": {"method": "DELETE", "url": "{{baseUrl}}/trips/550e8400-e29b-41d4-a716-446655440000"}
    }
  ]
}
```

---

## Related APIs

- **Booking API** - Manage trip bookings with commission calculation ([see BOOKING_API.md](./BOOKING_API.md))
- **City API** - Browse available cities for trips
- **User API** - Manage trip owners and collaborators

---

**Last Updated:** 2026-03-18
**API Version:** 2.0
**Status:** Production Ready
