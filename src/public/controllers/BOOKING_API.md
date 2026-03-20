# Booking API Documentation

## Overview

The Booking API provides comprehensive booking management with automatic commission calculation. All bookings store a base price and automatically compute a commission value based on a configurable commission percentage (default: 10%).

## Features

- **Automatic Commission Calculation**: Commission value is computed server-side whenever a booking is created or updated
- **Decimal Precision**: All monetary values are stored and returned as decimals with 2-decimal precision
- **Flexible Trip Association**: Bookings can optionally be linked to a trip
- **Date Validation**: Automatically validates that end dates are after start dates
- **User Validation**: Ensures booking references valid users and optional trips

## Data Model

### Booking Object

```json
{
  "id": "string (UUID)",
  "tripId": "string (UUID) | null",
  "userId": "string (UUID)",
  "itemName": "string",
  "type": "FLIGHT | STAY | EXPERIENCE | RENTAL | GUIDE",
  "basePrice": "Decimal (returns as number)",
  "commissionPct": "Decimal (returns as number, e.g., 0.1 for 10%)",
  "commissionValue": "Decimal (returns as number)",
  "provider": "string | null",
  "externalRef": "string | null",
  "currency": "string (default: USD)",
  "status": "PENDING | CONFIRMED | CANCELED (default: PENDING)",
  "startDate": "ISO 8601 DateTime | null",
  "endDate": "ISO 8601 DateTime | null",
  "createdAt": "ISO 8601 DateTime",
  "updatedAt": "ISO 8601 DateTime",
  "trip": "Trip object | null",
  "user": "User object"
}
```

## Commission Calculation

### Formula

```
commissionValue = basePrice × commissionPct
```

### Examples

| Base Price | Commission % | Commission Value |
|------------|-------------|-----------------|
| 100.00    | 0.10 (10%)  | 10.00          |
| 1000.99   | 0.10 (10%)  | 100.10         |
| 250.50    | 0.10 (10%)  | 25.05          |
| 333.33    | 0.10 (10%)  | 33.33          |

### Rounding

All commission values are rounded to 2 decimal places using standard rounding (0.5 rounds up):

```typescript
Math.round(commission * 100) / 100
```

## Endpoints

### 1. Create Booking

**POST** `/bookings`

Creates a new booking and automatically calculates the commission value.

#### Request Body

```json
{
  "userId": "uuid (required)",
  "tripId": "uuid (optional)",
  "itemName": "string (required) - Descriptive name for the booking",
  "type": "FLIGHT|STAY|EXPERIENCE|RENTAL|GUIDE (required)",
  "basePrice": "number (required, > 0) - Price in cents or major currency units",
  "commissionPct": "number (optional, default: 0.10) - Commission percentage as decimal",
  "provider": "string (optional) - Service provider name",
  "externalRef": "string (optional) - External reference ID",
  "currency": "string (optional, default: USD)",
  "status": "PENDING|CONFIRMED|CANCELED (optional, default: PENDING)",
  "startDate": "ISO 8601 DateTime (optional)",
  "endDate": "ISO 8601 DateTime (optional)"
}
```

#### Request Example

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "tripId": "550e8400-e29b-41d4-a716-446655440001",
    "itemName": "Round-trip flight to Paris",
    "type": "FLIGHT",
    "basePrice": 820.50,
    "commissionPct": 0.10,
    "provider": "Air France",
    "externalRef": "AF-123456",
    "currency": "USD",
    "status": "CONFIRMED",
    "startDate": "2026-04-05T07:00:00Z",
    "endDate": "2026-04-05T11:00:00Z"
  }'
```

#### Response (201 Created)

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "tripId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "itemName": "Round-trip flight to Paris",
  "type": "FLIGHT",
  "basePrice": 820.5,
  "commissionPct": 0.1,
  "commissionValue": 82.05,
  "provider": "Air France",
  "externalRef": "AF-123456",
  "currency": "USD",
  "status": "CONFIRMED",
  "startDate": "2026-04-05T07:00:00Z",
  "endDate": "2026-04-05T11:00:00Z",
  "createdAt": "2026-03-18T10:30:00.000Z",
  "updatedAt": "2026-03-18T10:30:00.000Z",
  "trip": { ... },
  "user": { ... }
}
```

#### Error Responses

**400 Bad Request** - Validation error
```json
{
  "statusCode": 400,
  "message": ["basePrice must be greater than 0"],
  "error": "Bad Request"
}
```

**400 Bad Request** - Invalid date range
```json
{
  "statusCode": 400,
  "message": "endDate must be after startDate",
  "error": "Bad Request"
}
```

**404 Not Found** - User or trip not found
```json
{
  "statusCode": 404,
  "message": "User with ID 660e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

### 2. List All Bookings

**GET** `/bookings`

Retrieves all bookings, ordered by most recent first.

#### Query Parameters

None currently supported, but standard pagination can be added.

#### Response (200 OK)

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "tripId": "550e8400-e29b-41d4-a716-446655440001",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "itemName": "Round-trip flight to Paris",
    "type": "FLIGHT",
    "basePrice": 820.5,
    "commissionPct": 0.1,
    "commissionValue": 82.05,
    "provider": "Air France",
    "externalRef": "AF-123456",
    "currency": "USD",
    "status": "CONFIRMED",
    "startDate": "2026-04-05T07:00:00Z",
    "endDate": "2026-04-05T11:00:00Z",
    "createdAt": "2026-03-18T10:30:00.000Z",
    "updatedAt": "2026-03-18T10:30:00.000Z",
    "trip": { ... },
    "user": { ... }
  },
  ...
]
```

---

### 3. Get Booking by ID

**GET** `/bookings/:id`

Retrieves a specific booking by its UUID.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| id        | string | UUID of the booking |

#### Response (200 OK)

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "tripId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "itemName": "Round-trip flight to Paris",
  "type": "FLIGHT",
  "basePrice": 820.5,
  "commissionPct": 0.1,
  "commissionValue": 82.05,
  "provider": "Air France",
  "externalRef": "AF-123456",
  "currency": "USD",
  "status": "CONFIRMED",
  "startDate": "2026-04-05T07:00:00Z",
  "endDate": "2026-04-05T11:00:00Z",
  "createdAt": "2026-03-18T10:30:00.000Z",
  "updatedAt": "2026-03-18T10:30:00.000Z",
  "trip": { ... },
  "user": { ... }
}
```

#### Error Response (404 Not Found)

```json
{
  "statusCode": 404,
  "message": "Booking with ID 660e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

### 4. Update Booking

**PATCH** `/bookings/:id`

Updates a booking. All fields are optional. If `basePrice` or `commissionPct` is updated, `commissionValue` is automatically recalculated.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| id        | string | UUID of the booking |

#### Request Body (All fields optional)

```json
{
  "itemName": "string",
  "type": "FLIGHT|STAY|EXPERIENCE|RENTAL|GUIDE",
  "basePrice": "number (> 0)",
  "commissionPct": "number (≥ 0)",
  "provider": "string",
  "externalRef": "string",
  "currency": "string",
  "status": "PENDING|CONFIRMED|CANCELED",
  "startDate": "ISO 8601 DateTime",
  "endDate": "ISO 8601 DateTime"
}
```

#### Request Example

```bash
curl -X PATCH http://localhost:3000/bookings/660e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "basePrice": 950.00,
    "status": "CONFIRMED"
  }'
```

#### Response (200 OK)

The response includes the updated booking with recalculated commission if applicable:

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "tripId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "itemName": "Round-trip flight to Paris",
  "type": "FLIGHT",
  "basePrice": 950.00,
  "commissionPct": 0.1,
  "commissionValue": 95.00,
  "provider": "Air France",
  "externalRef": "AF-123456",
  "currency": "USD",
  "status": "CONFIRMED",
  "startDate": "2026-04-05T07:00:00Z",
  "endDate": "2026-04-05T11:00:00Z",
  "createdAt": "2026-03-18T10:30:00.000Z",
  "updatedAt": "2026-03-18T11:45:00.000Z",
  "trip": { ... },
  "user": { ... }
}
```

#### Error Responses

**404 Not Found** - Booking not found
```json
{
  "statusCode": 404,
  "message": "Booking with ID 660e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

**400 Bad Request** - Invalid date range
```json
{
  "statusCode": 400,
  "message": "endDate must be after startDate",
  "error": "Bad Request"
}
```

---

### 5. Delete Booking

**DELETE** `/bookings/:id`

Deletes a booking permanently.

#### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| id        | string | UUID of the booking |

#### Response (200 OK)

Returns the deleted booking object:

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "tripId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "itemName": "Round-trip flight to Paris",
  "type": "FLIGHT",
  "basePrice": 820.5,
  "commissionPct": 0.1,
  "commissionValue": 82.05,
  "provider": "Air France",
  "externalRef": "AF-123456",
  "currency": "USD",
  "status": "CONFIRMED",
  "startDate": "2026-04-05T07:00:00Z",
  "endDate": "2026-04-05T11:00:00Z",
  "createdAt": "2026-03-18T10:30:00.000Z",
  "updatedAt": "2026-03-18T10:30:00.000Z",
  "trip": { ... },
  "user": { ... }
}
```

#### Error Response (404 Not Found)

```json
{
  "statusCode": 404,
  "message": "Booking with ID 660e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

---

## Validation Rules

### basePrice
- **Required for creation**
- **Must be > 0** (strictly positive)
- **Accepts numbers** with up to 2 decimal places
- **Rounded to 2 decimals** in database

### commissionPct
- **Optional** (default: 0.10 for 10%)
- **Must be ≥ 0** (non-negative)
- **Typical values**: 0.05 (5%), 0.10 (10%), 0.15 (15%), etc.
- **Decimal precision**: Up to 2 decimals

### Date Validation
- **Both dates optional** or **both required**
- **endDate must be after startDate** if both provided
- **Supported format**: ISO 8601 (e.g., "2026-04-05T07:00:00Z")

### itemName
- **Required for creation**
- **String type**
- **2-255 characters recommended**

### userId & tripId
- **userId is required**
- **tripId is optional** (booking can exist without a trip)
- **Both must reference valid existing records**

---

## Frontend Integration Examples

### React/TypeScript Example

```typescript
// Create a booking
async function createBooking(bookingData: CreateBookingRequest) {
  const response = await fetch('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return response.json(); // Returns booking with calculated commission
}

// Example usage
const booking = await createBooking({
  userId: currentUser.id,
  tripId: selectedTrip.id,
  itemName: 'Hotel in Paris',
  type: 'STAY',
  basePrice: 500,
  commissionPct: 0.10, // 10%
  // commissionValue will be automatically computed as 50
  provider: 'Booking.com',
  currency: 'USD'
});

console.log(`Commission earned: $${booking.commissionValue}`);
```

### Rendering Booking Data

```typescript
function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="booking-card">
      <h3>{booking.itemName}</h3>
      <div className="price-section">
        <p>Base Price: ${booking.basePrice.toFixed(2)}</p>
        <p>Commission ({(booking.commissionPct * 100).toFixed(0)}%): 
           ${booking.commissionValue.toFixed(2)}</p>
        <p><strong>Total: ${(booking.basePrice + booking.commissionValue).toFixed(2)}</strong></p>
      </div>
      <p>Status: {booking.status}</p>
      {booking.startDate && booking.endDate && (
        <p>Dates: {new Date(booking.startDate).toLocaleDateString()} - 
           {new Date(booking.endDate).toLocaleDateString()}</p>
      )}
    </div>
  );
}
```

---

## Testing Guide

### cURL Examples

#### Create a booking
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "itemName": "Test Booking",
    "type": "FLIGHT",
    "basePrice": 100.00
  }'
```

#### Get all bookings
```bash
curl http://localhost:3000/bookings
```

#### Get a specific booking
```bash
curl http://localhost:3000/bookings/660e8400-e29b-41d4-a716-446655440000
```

#### Update a booking
```bash
curl -X PATCH http://localhost:3000/bookings/660e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
```

#### Delete a booking
```bash
curl -X DELETE http://localhost:3000/bookings/660e8400-e29b-41d4-a716-446655440000
```

---

## Common Use Cases

### 1. Calculate Platform Revenue
```sql
SELECT 
  SUM(commission_value) as total_commissions,
  COUNT(*) as total_bookings,
  AVG(commission_value) as avg_commission
FROM bookings
WHERE status = 'CONFIRMED';
```

### 2. Commission by Type
```sql
SELECT 
  type,
  COUNT(*) as count,
  SUM(commission_value) as total_commission,
  AVG(commission_value) as avg_commission
FROM bookings
WHERE status = 'CONFIRMED'
GROUP BY type;
```

### 3. Trip Revenue Analysis
```sql
SELECT 
  t.id,
  t.title,
  SUM(b.base_price) as travel_costs,
  SUM(b.commission_value) as commissions_to_platform
FROM trips t
JOIN bookings b ON t.id = b.trip_id
GROUP BY t.id, t.title;
```

---

## Notes

- **Commission is always calculated server-side** for security and consistency
- **All monetary values are stored as Decimal(12,2)** for financial precision
- **Timestamps (createdAt, updatedAt) are automatically managed** - do not provide them in requests
- **Commission calculation is deterministic** - same basePrice and commissionPct will always produce identical results
- **Date validation ensures logical booking periods** - endDate must always be after startDate

