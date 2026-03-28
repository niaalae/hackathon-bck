# Trippple Backend API Endpoints

**Last Updated:** March 28, 2026  
**Version:** 1.0.0

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Flights API](#flights-api)
- [Groups API](#groups-api)
- [User Groups API](#user-groups-api)
- [Cities API](#cities-api)
- [Notifications API](#notifications-api)
- [Trips API](#trips-api)
- [Bookings API](#bookings-api)
- [Gamification API](#gamification-api)
- [Agent API](#agent-api)
- [Error Handling](#error-handling)

## Overview

The Trippple API is a RESTful API built with NestJS that provides endpoints for managing travel groups, trips, bookings, gamification, and AI-driven assistant features.

**Base URLs:**
- Development: `http://localhost:4001/api`
- Production: `https://trippple-backend-production-1f87.up.railway.app/api`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

Public endpoints (no authentication required):
- GET `/groups` - List public groups
- GET `/groups/search` - Search public groups
- GET `/groups/:id` - Get group details
- GET `/cities` - List available cities
- GET `/trips` - Get public trips
- GET `/bookings` - Get all bookings

## Flights API

### Search Flights

**POST** `/flights/search`

Search for available flights.

**Request Body:**
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
- `origin` (string, required) - IATA airport code for departure
- `destination` (string, required) - IATA airport code for arrival
- `departureDate` (string, required) - ISO 8601 date
- `returnDate` (string, optional) - ISO 8601 return date
- `adults` (number, optional) - Number of passengers (default: 1)

**Response (200 OK):**
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
      "return": { ... }
    }
  ]
}
```

**Notes:**
- Currently returns mock flight data
- Production integration required with flight API providers

---

## Groups API

### List/Search Groups

**GET** `/groups/search?city=&start=&end=&budget=&offset=0&limit=20`

Search for travel groups with filtering.

**Query Parameters:**
- `city` (string, optional) - City name or ID
- `start` (string, optional) - Start date (ISO 8601)
- `end` (string, optional) - End date (ISO 8601)
- `budget` (number, optional) - Budget range
- `offset` (number, default: 0) - Pagination offset
- `limit` (number, default: 20, max: 50) - Results per page

**Response (200 OK):**
```json
{
  "query": { ... },
  "total": 15,
  "noMatches": false,
  "matches": [
    {
      "groupId": "uuid",
      "cityId": "uuid",
      "cityName": "Marrakech",
      "title": "Spring Break 2026",
      "description": "...",
      "coverImage": "...",
      "startDate": "2026-04-15",
      "endDate": "2026-04-22",
      "capacity": 10,
      "memberCount": 5,
      "availableSpots": 5,
      "budgetMin": 1000,
      "budgetMax": 5000,
      "score": 92
    }
  ]
}
```

### List Public Groups

**GET** `/groups?offset=0&limit=20`

List all public groups.

### Get Group Details

**GET** `/groups/:id`

Get detailed information for a specific group.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "title": "Spring Break 2026",
  "description": "...",
  "coverImage": "...",
  "owner": { ... },
  "city": { ... },
  "startDate": "2026-04-15",
  "endDate": "2026-04-22",
  "capacity": 10,
  "budgetMin": 1000,
  "budgetMax": 5000,
  "memberCount": 5,
  "availableSpots": 5,
  "members": [ ... ],
  "pendingRequests": [ ... ],
  "recentMessages": [ ... ]
}
```

### Create Group

**POST** `/groups` (requires authentication)

Create a new travel group.

**Request Body:**
```json
{
  "cityId": "uuid",
  "title": "Summer Trip 2026",
  "description": "Amazing summer adventure",
  "coverImage": "https://...",
  "startDate": "2026-07-01",
  "endDate": "2026-07-15",
  "capacity": 8,
  "budgetMin": 2000,
  "budgetMax": 5000
}
```

### Update Group

**PATCH** `/groups/:id` (requires authentication, owner only)

Update group details.

### Delete Group

**DELETE** `/groups/:id` (requires authentication, owner only)

Delete a group.

### Join Group

**POST** `/groups/:id/join` (requires authentication)

Request to join a group.

**Response (200 OK):**
```json
{
  "groupId": "uuid",
  "user": { ... },
  "status": "PENDING",
  "joined": true,
  "message": "Join request sent"
}
```

### Cancel Join Request

**DELETE** `/groups/:id/join` (requires authentication)

Cancel or leave a group.

### Get Group Messages

**GET** `/groups/:id/messages` (requires authentication)

Get chat messages for a group.

**Response (200 OK):**
```json
{
  "groupId": "uuid",
  "total": 42,
  "messages": [
    {
      "id": "uuid",
      "message": "Hello everyone!",
      "createdAt": "2026-03-28T10:30:00Z",
      "user": { ... }
    }
  ]
}
```

### Send Message

**POST** `/groups/:id/messages` (requires authentication)

Send a message to group chat.

**Request Body:**
```json
{
  "message": "Looking forward to the trip!"
}
```

### Review Group Membership

**PATCH** `/groups/:id/members/:userId/review` (requires authentication, owner/admin)

Approve or reject a pending member.

**Request Body:**
```json
{
  "status": "MEMBER",
  "note": "Welcome to the group!"
}
```

### Update Member Role

**PATCH** `/groups/:id/members/:userId/role` (requires authentication, owner/admin)

Change a member's role.

**Request Body:**
```json
{
  "role": "ADMIN"
}
```

### Remove Member

**DELETE** `/groups/:id/members/:userId` (requires authentication, owner/admin)

Remove a member from the group.

---

## User Groups API

### List User Groups

**GET** `/user/groups` (requires authentication)

Get all groups where the current user is a member.

**Response:** Array of GroupMembership objects

### List Managed Groups

**GET** `/user/groups/managed` (requires authentication)

Get all groups owned/managed by the current user.

**Response:** Array of GroupDetail objects

### List Incoming Requests

**GET** `/user/groups/requests` (requires authentication)

Get pending join requests for groups owned by the current user.

**Response:** Array of IncomingGroupRequest objects

---

## Cities API

### List Cities

**GET** `/cities?limit=20`

Get list of available cities.

**Query Parameters:**
- `limit` (number, default: 20) - Maximum results

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Marrakech",
    "slug": "marrakech",
    "coverImage": "...",
    "description": "City description"
  }
]
```

---

## Notifications API

### List Notifications

**GET** `/notifications?unreadOnly=false&limit=20` (requires authentication)

Get notifications for the current user.

**Query Parameters:**
- `unreadOnly` (boolean, default: false) - Show only unread notifications
- `limit` (number, default: 20) - Maximum results

**Response:** Array of GroupNotification objects

### Mark Notification Read

**PATCH** `/notifications/:id/read` (requires authentication)

Mark a single notification as read.

### Mark All Notifications Read

**PATCH** `/notifications/read-all` (requires authentication)

Mark all notifications as read.

---

## Trips API

### Search/List Trips

**GET** `/trips?cityId=&startDate=&endDate=&status=&offset=0&limit=20`

Get public trips (for "Match" feature).

**Query Parameters:**
- `cityId` (string, optional) - Filter by city
- `startDate` (string, optional) - Filter by start date
- `endDate` (string, optional) - Filter by end date
- `status` (string, optional) - Filter by status (DRAFT, ACTIVE, COMPLETED, CANCELED)
- `offset` (number, default: 0) - Pagination offset
- `limit` (number, default: 20) - Results per page

### Create Trip

**POST** `/trips`

Create a new trip.

**Request Body:**
```json
{
  "title": "Marrakech Adventure",
  "description": "...",
  "ownerUserId": "uuid",
  "cityId": "uuid",
  "status": "DRAFT",
  "startDate": "2026-04-15",
  "endDate": "2026-04-22",
  "budgetTotal": 5000,
  "currency": "USD"
}
```

### Get Trip Details

**GET** `/trips/:id`

Get details of a specific trip.

### Update Trip

**PUT** `/trips/:id`

Update trip details.

### Delete Trip

**DELETE** `/trips/:id`

Delete a trip.

---

## Bookings API

### List Bookings

**GET** `/bookings?offset=0&limit=20`

Get all bookings.

**Query Parameters:**
- `offset` (number, default: 0) - Pagination offset
- `limit` (number, default: 20) - Results per page

### Create Booking

**POST** `/bookings`

Create a new booking.

**Request Body:**
```json
{
  "tripId": "uuid (optional)",
  "userId": "uuid",
  "itemName": "Round-trip flight CMN-CDG",
  "type": "FLIGHT",
  "basePrice": 450.75,
  "commissionPct": 0.10,
  "provider": "AirFrance",
  "externalRef": "AF123456",
  "currency": "USD",
  "status": "PENDING",
  "startDate": "2026-04-15",
  "endDate": "2026-04-22"
}
```

**Response includes computed `commissionValue` field:**
- `commissionValue` = `basePrice * commissionPct`

### Get Booking Details

**GET** `/bookings/:id`

Get details of a specific booking.

### Update Booking

**PATCH** `/bookings/:id`

Update booking details.

### Delete Booking

**DELETE** `/bookings/:id`

Cancel/delete a booking.

---

## Gamification API

### Get Overview

**GET** `/gamification/overview` (requires authentication)

Get the current user's gamification overview.

**Response:**
```json
{
  "userId": "uuid",
  "xp": 1250,
  "level": 3,
  "score": 5000,
  "rank": 42,
  "activeStreaks": [ ... ],
  "recentAchievements": [ ... ]
}
```

### Get Settings

**GET** `/gamification/settings` (requires authentication)

Get the user's gamification visibility settings.

### Update Settings

**PATCH** `/gamification/settings` (requires authentication)

Update gamification settings.

**Request Body:**
```json
{
  "visibilityLevel": "PUBLIC",
  "showRanking": true,
  "showAchievements": true
}
```

### Track Event

**POST** `/gamification/events` (requires authentication)

Track a gamification event.

**Request Body:**
```json
{
  "eventType": "GROUP_SCOUTED",
  "data": {
    "groupId": "uuid",
    "userId": "uuid"
  }
}
```

**Supported Events:**
- `GROUP_SCOUTED` - User viewed a group
- `GROUP_JOINED` - User joined a group
- `MAP_INTERACTED` - User interacted with map
- `AI_PROMPT_SENT` - User sent prompt to AI agent
- `BOOKING_CREATED` - User created a booking
- `TRIP_CREATED` - User created a trip
- `MESSAGE_SENT` - User sent a group message

---

## Agent API

### Chat with Hero Agent (POST)

**POST** `/agent/hero`

Chat with the Hero AI Agent.

**Request Body:**
```json
{
  "prompt": "What should I see in Marrakech?",
  "history": [
    { "role": "user", "content": "I'm planning a trip to Morocco" },
    { "role": "assistant", "content": "Great! Morocco is amazing..." }
  ]
}
```

**Response:**
```json
{
  "reply": "In Marrakech, you should visit...",
  "suggestions": [ ... ],
  "context": { ... }
}
```

### Chat with Hero Agent (GET)

**GET** `/agent/hero?prompt=...`

Get AI response for a single prompt (simpler interface).

**Query Parameters:**
- `prompt` (string, required) - The prompt to send

### Alternative Chat Endpoint

**POST** `/agent/chat`

Alternative chat endpoint.

**Request Body:**
```json
{
  "message": "What's the best time to visit Marrakech?",
  "history": [ ... ]
}
```

**Response:**
```json
{
  "reply": "The best time to visit is..."
}
```

---

## Error Handling

All errors follow a consistent response format:

**Error Response:**
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": ["Detailed error information"],
  "path": "/api/endpoint",
  "timestamp": "2026-03-28T12:34:56.789Z"
}
```

**Common Error Codes:**
- `BAD_REQUEST` (400) - Invalid request parameters
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource already exists or constraint violation
- `INTERNAL_SERVER_ERROR` (500) - Server error

---

## Pagination

List endpoints support pagination with the following parameters:

- `offset` (number, default: 0, min: 0) - Number of items to skip
- `limit` (number, default: 20, min: 1, max: 100) - Number of items to return

Applied to endpoints:
- `GET /regions`
- `GET /cities`
- `GET /categories`
- `GET /places`
- `GET /ratings`
- `GET /bookings`
- `GET /trips`
- `GET /groups/search`
- `GET /user/groups`
- `GET /notifications`

---

## Rate Limiting

Rate limiting information (if implemented):
- Check response headers for `X-RateLimit-*` headers
- 429 Too Many Requests indicates limit exceeded

---

## Related Documentation

- [Flights API](./FLIGHTS_API.md)
- [Booking Implementation](./BOOKING_IMPLEMENTATION.md)
- [Groups API](./GROUPS_API.md)
- [Trip API](./TRIP_API.md)
- [Trip Implementation Summary](./TRIP_IMPLEMENTATION_SUMMARY.md)

---

## Version History

### v1.0.0 (March 28, 2026)
- Initial release
- Added Flights API (flights/search)
- Documented all existing endpoints
- Standardized error responses
- Added comprehensive examples

