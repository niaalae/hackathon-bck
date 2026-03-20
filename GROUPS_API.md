# Groups Search API

## Endpoint

GET /api/groups/search

## Query Parameters

- city (required): City identifier. Supports city id, city slug, or exact city name.
- start (optional, ISO 8601): Query start date.
- end (optional, ISO 8601): Query end date.
- budget (optional, number >= 0): Budget preference used for filtering and score.
- limit (optional, integer 1-50, default 20): Maximum results.

## Default Behaviors

- If start is omitted: defaults to current UTC time.
- If end is omitted: defaults to start + 7 days.
- If budget is omitted: no budget filter is applied and budget score defaults to 5.

## Matching Logic (MVP)

A group is considered a candidate if:
1. City matches query city.
2. Date windows overlap:
   - group.startDate < query.end
   - group.endDate > query.start
3. If budget is provided: group.budgetMin <= budget <= group.budgetMax

## Match Score Heuristic

Total score = city score + date overlap score + budget score

- City score: 60
- Date overlap score: 0-30 (proportional to overlap against query window)
- Budget score:
  - budget provided: 0-10 (closer to group mid-budget is higher)
  - budget omitted: 5

Results are sorted by:
1. score descending
2. startDate ascending

## Response Shape (Frontend)

```json
{
  "query": {
    "city": "Paris",
    "start": "2026-04-01T00:00:00.000Z",
    "end": "2026-04-10T00:00:00.000Z",
    "budget": 3200,
    "limit": 20
  },
  "total": 2,
  "noMatches": false,
  "matches": [
    {
      "groupId": "uuid",
      "cityId": "uuid",
      "cityName": "Paris",
      "startDate": "2026-04-03T08:00:00.000Z",
      "endDate": "2026-04-11T20:00:00.000Z",
      "capacity": 6,
      "budgetMin": 1800,
      "budgetMax": 3600,
      "score": 96,
      "scoreBreakdown": {
        "city": 60,
        "dateOverlap": 30,
        "budget": 6
      }
    }
  ]
}
```

No matches example:

```json
{
  "query": {
    "city": "Paris",
    "start": "2028-01-01T00:00:00.000Z",
    "end": "2028-01-08T00:00:00.000Z",
    "budget": 1000,
    "limit": 20
  },
  "total": 0,
  "noMatches": true,
  "message": "No matching groups found.",
  "matches": []
}
```

## Seeded Demo Groups

Seed script adds 5 demo groups:
- Paris: 2 groups
- Tokyo: 1 group
- Lisbon: 2 groups

These are intended for smoke testing /groups/search quickly.
