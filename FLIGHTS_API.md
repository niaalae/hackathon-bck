# Flights API Documentation

## Overview

The Flights API provides flight search functionality for the Trippple backend. Currently, it returns mock flight data for demonstration purposes. In production, this endpoint should be integrated with real flight APIs such as Skyscanner, Amadeus, Kayak, or other flight aggregation services.

## Base URL

All endpoints are prefixed with `/api/flights`

## Endpoints

### Search Flights

**POST** `/flights/search`

Search for available flights based on origin, destination, and travel dates.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "origin": "CMN",
  "destination": "CDG",
  "departureDate": "2026-04-15",
  "returnDate": "2026-04-22",
  "adults": 2
}
```

**Parameters:**
- `origin` (string, required) - IATA airport code for departure city (e.g., 'CMN' for Casablanca, 'CDG' for Paris)
- `destination` (string, required) - IATA airport code for arrival city
- `departureDate` (string, required) - Departure date in ISO 8601 format (YYYY-MM-DD)
- `returnDate` (string, optional) - Return date in ISO 8601 format. If omitted, search for one-way flights
- `adults` (number, optional, default: 1) - Number of adult passengers

#### Response

**Status Code:** `200 OK`

**Body:**
```json
{
  "success": true,
  "results": [
    {
      "id": "flight-1234567890-0",
      "price": 450.75,
      "currency": "USD",
      "deepLink": "https://www.aviasales.com/...",
      "outbound": {
        "airline": "AT",
        "flightNumber": "970",
        "origin": "CMN",
        "destination": "CDG",
        "departureTime": "2026-04-15T10:30:00.000Z",
        "duration": 185,
        "stops": 0
      },
      "return": {
        "airline": "BA",
        "flightNumber": "250",
        "origin": "CDG",
        "destination": "CMN",
        "departureTime": "2026-04-22T14:00:00.000Z",
        "duration": 180,
        "stops": 0
      }
    }
  ],
  "message": null
}
```

**Response Fields:**
- `success` (boolean) - Whether the search was successful
- `results` (array) - Array of flight options
  - `id` (string) - Unique flight identifier
  - `price` (number) - Total price in specified currency
  - `currency` (string) - ISO 4217 currency code (e.g., 'USD')
  - `deepLink` (string) - URL to booking page
  - `outbound` (object) - Outbound flight details
    - `airline` (string) - IATA airline code
    - `flightNumber` (string) - Flight number
    - `origin` (string) - Departure airport code
    - `destination` (string) - Arrival airport code
    - `departureTime` (string) - Departure time in ISO 8601 format
    - `duration` (number) - Flight duration in minutes
    - `stops` (number) - Number of stops (0 for direct, 1+ for connections)
  - `return` (object, optional) - Return flight details (only present for round-trip searches)
- `message` (string, optional) - Error or status message

#### Error Responses

**Status Code:** `400 Bad Request`

```json
{
  "success": false,
  "results": [],
  "message": "Missing required parameters: origin, destination, departureDate"
}
```

**Status Code:** `500 Internal Server Error`

```json
{
  "success": false,
  "results": [],
  "message": "Failed to search flights"
}
```

## Examples

### One-Way Flight Search

**Request:**
```bash
curl -X POST http://localhost:4001/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "CMN",
    "destination": "CDG",
    "departureDate": "2026-04-15",
    "adults": 1
  }'
```

### Round-Trip Flight Search

**Request:**
```bash
curl -X POST http://localhost:4001/api/flights/search \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "CMN",
    "destination": "CDG",
    "departureDate": "2026-04-15",
    "returnDate": "2026-04-22",
    "adults": 2
  }'
```

## Implementation Notes

### Current State

The Flights API currently returns **mock flight data** for demonstration and testing purposes. This allows the frontend to develop and test flight search functionality without requiring real API credentials or making actual external API calls.

### Production Integration

To integrate with real flight data providers, follow these steps:

1. **Choose a Flight API Provider:**
   - Skyscanner API (https://skyscanner.com/api)
   - Amadeus API (https://developers.amadeus.com)
   - Kayak API (if available)
   - Google Flights API (if available)
   - Other providers like Travelpayouts, AviaAPI, etc.

2. **Add API Credentials:**
   ```bash
   # In Railway environment variables or .env
   FLIGHTS_API_KEY=your_api_key
   FLIGHTS_API_SECRET=your_api_secret (if required)
   FLIGHTS_API_URL=https://api.provider.com
   ```

3. **Update the FlightsService:**
   - Modify `src/services/flights.service.ts`
   - Replace the `generateMockFlights()` method with actual API calls
   - Update error handling and data transformation

4. **Update Controller (if needed):**
   - Add authentication guards if the flight provider requires authentication
   - Add request validation for any additional required fields

### Mock Data Generation

The current mock flight generation includes:
- Random prices between $200-$1000
- 5 flight options per search
- Random airline codes from real IATA codes
- Random flight durations and stop counts
- Deep links to Aviasales booking page (placeholder)

Replace these with real data when integrating with a flight provider.

## Security Considerations

- **API Keys:** Never commit API keys to version control. Use environment variables.
- **Rate Limiting:** Consider implementing rate limiting to prevent abuse.
- **CORS:** Ensure CORS is properly configured if the frontend makes direct API calls.
- **Input Validation:** Validate all airport codes against a list of valid IATA codes.
- **Caching:** Consider caching search results for common routes to reduce API calls.

## Related Files

- Controller: `src/public/controllers/flights.controller.ts`
- Service: `src/services/flights.service.ts`
- Module: `src/public/public.module.ts`
- Services Module: `src/services/services.module.ts`
