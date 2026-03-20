# API Endpoints (Consolidated)

## Base

- Base URL: `http://127.0.0.1:4001/api`
- Global validation: enabled via ValidationPipe
- Global error shape: standardized by ApiExceptionFilter

## Standard Error Shape

All non-2xx API errors now follow:

```json
{
  "code": "BAD_REQUEST",
  "message": "city should not be empty",
  "details": ["city should not be empty"],
  "path": "/api/groups/search",
  "timestamp": "2026-03-18T12:34:56.789Z"
}
```

Fields:
- `code`: HTTP status text (e.g. `BAD_REQUEST`, `NOT_FOUND`)
- `message`: primary error message
- `details`: optional validation details array
- `path`: request path
- `timestamp`: ISO timestamp

## Pagination Defaults (List Endpoints)

Supported query params on list endpoints:
- `offset` (default `0`, min `0`)
- `limit` (default `20`, min `1`, max `100`)

Applied to:
- `GET /regions`
- `GET /cities`
- `GET /categories`
- `GET /places`
- `GET /ratings`
- `GET /bookings`
- `GET /trips`
- `GET /groups/search`

## Request Validation Highlights

- UUID path params now validated on key detail/update/delete routes.
- `GET /groups/search` now requires non-empty `city`.
- `GET /trips` query now validates:
  - `cityId` UUID
  - `startDate/endDate` ISO 8601
  - `status` enum
  - `offset/limit` integers in valid ranges

## Public Endpoint Summary

### Regions
- `GET /regions`
- `GET /regions/:id`

### Cities
- `GET /cities`
- `GET /cities/:id`

### Categories
- `GET /categories`
- `GET /categories/:id`

### Places
- `GET /places`
- `GET /places/:id`
- `GET /places/recommendations/:userId`

### Ratings
- `GET /ratings`
- `GET /ratings/:id`

### Trips
- `POST /trips`
- `GET /trips`
- `GET /trips/:id`
- `PUT /trips/:id`
- `DELETE /trips/:id`

### Bookings
- `POST /bookings`
- `GET /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id`
- `DELETE /bookings/:id`

### Groups
- `GET /groups/search`

## Commission Rounding

Booking commission is rounded to 2 decimals using `toFixed(2)` conversion, reducing floating-point precision drift.

## CORS/Auth Assumptions for Frontend

### CORS
Current backend CORS setup:
- `origin: true`
- `credentials: true`

Assumption:
- Frontend can run from different local origins during development.
- Cookies/credentials are expected for auth-aware routes.

Recommended production tightening:
- Replace `origin: true` with explicit allowlist from env (comma-separated origins).

### Auth
- Public routes listed above are generally open.
- `POST /users/place-feedback` and `POST /users/reset-vector` require auth guard/cookie context.

## Stability Scripts

Run smoke tests against a running backend:

```bash
npm run smoke:api
```

Run repeated-call stability check:

```bash
npm run load:check
```

Optional env vars:
- `API_BASE_URL` (default `http://127.0.0.1:4001/api`)
- `LOAD_REPEAT` (default `50`)
