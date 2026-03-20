/* eslint-disable no-console */

type JsonValue = Record<string, unknown> | Array<unknown>;

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4001/api';

async function fetchJson(path: string) {
  const url = `${baseUrl}${path}`;
  const startedAt = Date.now();
  const response = await fetch(url);
  const elapsedMs = Date.now() - startedAt;
  const text = await response.text();
  let json: JsonValue | undefined;

  try {
    json = JSON.parse(text) as JsonValue;
  } catch {
    json = undefined;
  }

  return { response, json, elapsedMs, url, raw: text };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(`Running API smoke tests against ${baseUrl}`);

  const groupsMatch = await fetchJson('/groups/search?city=Paris&start=2026-04-05T00:00:00Z&end=2026-04-09T00:00:00Z&budget=3000');
  assert(groupsMatch.response.ok, `Expected 2xx for groups search. Got ${groupsMatch.response.status}`);
  assert(groupsMatch.json && !Array.isArray(groupsMatch.json), 'Expected object response for groups search');
  assert('matches' in groupsMatch.json, 'Expected "matches" field in groups search response');

  const groupsBadReq = await fetchJson('/groups/search?start=2026-04-05T00:00:00Z&end=2026-04-09T00:00:00Z');
  assert(groupsBadReq.response.status === 400, `Expected 400 for invalid groups search. Got ${groupsBadReq.response.status}`);

  const tripsList = await fetchJson('/trips?limit=1&offset=0');
  assert(tripsList.response.ok, `Expected 2xx for trips list. Got ${tripsList.response.status}`);
  assert(Array.isArray(tripsList.json), 'Expected array response for trips list');

  const bookingsList = await fetchJson('/bookings?limit=1&offset=0');
  assert(bookingsList.response.ok, `Expected 2xx for bookings list. Got ${bookingsList.response.status}`);
  assert(Array.isArray(bookingsList.json), 'Expected array response for bookings list');

  console.log('Smoke checks passed:', {
    groupsSearchMs: groupsMatch.elapsedMs,
    groupsBadRequestMs: groupsBadReq.elapsedMs,
    tripsListMs: tripsList.elapsedMs,
    bookingsListMs: bookingsList.elapsedMs,
  });
}

run().catch((error) => {
  console.error('Smoke tests failed:', error);
  process.exitCode = 1;
});

export {};
