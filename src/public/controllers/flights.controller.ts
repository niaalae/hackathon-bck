import { Body, Controller, Post } from '@nestjs/common';
import { FlightsService } from '@/services/flights.service';

/**
 * Flights Controller
 *
 * Handles flight search operations.
 * Currently provides mock data for demonstration purposes.
 * TODO: Integrate with external flight APIs (Skyscanner, Amadeus, Kayak, etc.)
 */
@Controller('flights')
export class FlightsPublicController {
  constructor(private readonly flightsService: FlightsService) {}

  /**
   * Search for flights
   *
   * POST /flights/search
   *
   * Request body:
   * {
   *   "origin": "string (required) - Departure airport code (e.g., 'CMN', 'CDG')",
   *   "destination": "string (required) - Arrival airport code",
   *   "departureDate": "ISO 8601 string (required)",
   *   "returnDate": "ISO 8601 string (optional) - For round-trip flights",
   *   "adults": "number (optional, default: 1) - Number of adult passengers"
   * }
   *
   * Response:
   * {
   *   "success": boolean,
   *   "results": [
   *     {
   *       "id": "string",
   *       "price": number,
   *       "currency": "string",
   *       "deepLink": "string - URL to booking page",
   *       "outbound": {
   *         "airline": "string - IATA airline code",
   *         "flightNumber": "string",
   *         "origin": "string",
   *         "destination": "string",
   *         "departureTime": "ISO 8601",
   *         "duration": "number - minutes",
   *         "stops": "number"
   *       },
   *       "return": { ... } // Only for round-trip flights
   *     }
   *   ],
   *   "message": "string (optional) - Error or status message"
   * }
   *
   * Example request:
   * {
   *   "origin": "CMN",
   *   "destination": "CDG",
   *   "departureDate": "2026-04-15",
   *   "returnDate": "2026-04-22",
   *   "adults": 2
   * }
   */
  @Post('search')
  async searchFlights(
    @Body()
    body: {
      origin: string;
      destination: string;
      departureDate: string;
      returnDate?: string;
      adults?: number;
    },
  ) {
    return this.flightsService.searchFlights(body);
  }
}
