/* eslint-disable no-console */

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4001/api';
const repeat = Number.parseInt(process.env.LOAD_REPEAT ?? '50', 10);

async function run() {
  const path = '/groups/search?city=Paris&start=2026-04-05T00:00:00Z&end=2026-04-09T00:00:00Z&budget=3000';

  let failures = 0;
  const times: number[] = [];

  for (let i = 0; i < repeat; i += 1) {
    const startedAt = Date.now();
    const response = await fetch(`${baseUrl}${path}`);
    const elapsedMs = Date.now() - startedAt;
    times.push(elapsedMs);

    if (!response.ok) {
      failures += 1;
      // Drain body to avoid socket accumulation.
      await response.text();
      continue;
    }

    const payload = (await response.json()) as { matches?: unknown[] };
    if (!Array.isArray(payload.matches)) {
      failures += 1;
    }
  }

  const total = times.reduce((sum, value) => sum + value, 0);
  const averageMs = times.length ? Math.round(total / times.length) : 0;
  const maxMs = times.length ? Math.max(...times) : 0;
  const minMs = times.length ? Math.min(...times) : 0;

  console.log('Load-check summary:', {
    repeat,
    failures,
    averageMs,
    minMs,
    maxMs,
  });

  if (failures > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Load-check failed:', error);
  process.exitCode = 1;
});

export {};
