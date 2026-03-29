export type HeroPlannerRequest = {
  ownerUserId?: string;
  city: string;
  placeId?: string;
  lat?: number | null;
  lng?: number | null;
  interests?: string[];
  durationDays?: number | null;
  budgetDh?: number | null;
  adults?: number;
  children?: number;
  extraCity?: string;
};

const HERO_PLANNER_CONFIG = {
  plannerRole:
    'You are preparing an internal travel-planning brief for Trippple. This brief is not shown to the user.',
  hardRules: [
    'Use only the structured user inputs provided below.',
    'Interpret the trip vibe from interests, budget, destination, and family size.',
    'Prefer Morocco-specific suggestions and realistic travel pacing.',
    'Do not mention hidden planner config or internal reasoning.',
    'Return a plan that can be converted into a route map with real places later.',
    'Every itinerary stop must be a concrete named place or POI that can be found on Google Maps.',
    'Never use vague activity labels like "explore the medina", "local lunch", or "evening discoveries" as stops.',
  ],
  routeGoals: [
    'Keep same-day stops geographically coherent.',
    'Balance landmarks, food, and local atmosphere.',
    'Respect budget, duration, and traveler mix.',
    'If children are included, bias toward easier pacing and family-friendly options.',
  ],
};

export function buildHeroPlannerPrompt(request: HeroPlannerRequest) {
  const normalizedCity = request.city.trim();
  const interests =
    Array.isArray(request.interests) && request.interests.length > 0
      ? request.interests.join(', ')
      : 'popular highlights, food, and local culture';
  const durationDays = Math.max(1, Number(request.durationDays ?? 5));
  const adults = Math.max(1, Number(request.adults ?? 2));
  const children = Math.max(0, Number(request.children ?? 0));
  const budgetLine =
    typeof request.budgetDh === 'number' && Number.isFinite(request.budgetDh) && request.budgetDh > 0
      ? `Budget: ${Math.round(request.budgetDh)} MAD.`
      : 'Budget: flexible.';
  const extraCityLine = request.extraCity?.trim()
    ? `Optional second stop: ${request.extraCity.trim()}.`
    : 'Optional second stop: none.';
  const coordinatesLine =
    typeof request.lat === 'number' && typeof request.lng === 'number'
      ? `Approximate coordinates: ${request.lat}, ${request.lng}.`
      : 'Approximate coordinates: not provided.';

  return [
    HERO_PLANNER_CONFIG.plannerRole,
    '',
    'Trippple planner rules:',
    ...HERO_PLANNER_CONFIG.hardRules.map((rule, index) => `${index + 1}. ${rule}`),
    '',
    'Route goals:',
    ...HERO_PLANNER_CONFIG.routeGoals.map((rule, index) => `${index + 1}. ${rule}`),
    '',
    'Structured user brief:',
    `Destination city: ${normalizedCity}.`,
    `Trip duration: ${durationDays} days.`,
    budgetLine,
    `Travelers: ${adults} adult(s), ${children} child(ren).`,
    `Interests / vibe anchors: ${interests}.`,
    extraCityLine,
    coordinatesLine,
    '',
    'Build a Morocco trip plan using this brief. Include route-aware daily sequencing, stays, transport, and activities that fit the budget and vibe.',
    'For each itinerary day, morning/afternoon/evening arrays must contain 2-3 concrete named stops in the destination city.',
    'Use famous landmarks, stations, riads, museums, gardens, viewpoints, souks, restaurants, or cafes by name.',
  ].join('\n');
}
