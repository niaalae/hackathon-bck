/* eslint-disable no-console */

const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4001/api";
const email = `gamification.smoke.${Date.now()}@example.com`;
const password = "Trippple123";

type JsonRecord = Record<string, unknown>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchJson(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; json: JsonRecord | JsonRecord[] | null }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  if (!text) return { response, json: null };

  try {
    return {
      response,
      json: JSON.parse(text) as JsonRecord | JsonRecord[],
    };
  } catch {
    return { response, json: null };
  }
}

async function run() {
  console.log(`Running gamification smoke checks against ${baseUrl}`);

  const register = await fetchJson("/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Gamification Smoke",
      email,
      password,
    }),
  });
  assert(
    register.response.status === 201 || register.response.status === 200,
    `Expected register to succeed. Got ${register.response.status}`,
  );

  const login = await fetchJson("/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
  assert(
    login.response.ok,
    `Expected login to succeed. Got ${login.response.status}`,
  );
  assert(
    login.json && !Array.isArray(login.json),
    "Expected object response for login",
  );
  assert(typeof login.json.token === "string", "Expected login token");
  const token = login.json.token as string;

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const initialSettings = await fetchJson("/gamification/settings", {
    method: "GET",
    headers: authHeaders,
  });
  assert(
    initialSettings.response.ok,
    `Expected settings GET to succeed. Got ${initialSettings.response.status}`,
  );

  const disableSettings = await fetchJson("/gamification/settings", {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ enabled: false }),
  });
  assert(
    disableSettings.response.ok,
    `Expected settings PATCH to succeed. Got ${disableSettings.response.status}`,
  );
  assert(
    disableSettings.json &&
      !Array.isArray(disableSettings.json) &&
      disableSettings.json.gamificationEnabled === false,
    "Expected settings PATCH to disable gamification",
  );

  const aiEvent = await fetchJson("/gamification/events", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ type: "AI_PROMPT_SENT", amount: 1 }),
  });
  assert(
    aiEvent.response.ok,
    `Expected event tracking to succeed. Got ${aiEvent.response.status}`,
  );
  assert(
    aiEvent.json && !Array.isArray(aiEvent.json),
    "Expected object response for event tracking",
  );

  const overview = await fetchJson("/gamification/overview", {
    method: "GET",
    headers: authHeaders,
  });
  assert(
    overview.response.ok,
    `Expected overview GET to succeed. Got ${overview.response.status}`,
  );
  assert(
    overview.json && !Array.isArray(overview.json),
    "Expected object response for overview",
  );
  assert(
    Array.isArray(overview.json.quests),
    "Expected quests array in overview",
  );
  assert(
    typeof overview.json.summary === "object",
    "Expected summary object in overview",
  );

  const enableSettings = await fetchJson("/gamification/settings", {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ enabled: true }),
  });
  assert(
    enableSettings.response.ok,
    `Expected final settings PATCH to succeed. Got ${enableSettings.response.status}`,
  );

  console.log("Gamification smoke checks passed:", {
    registerStatus: register.response.status,
    loginStatus: login.response.status,
    overviewStatus: overview.response.status,
    questCount:
      overview.json &&
      !Array.isArray(overview.json) &&
      Array.isArray(overview.json.quests)
        ? overview.json.quests.length
        : 0,
  });
}

run().catch((error) => {
  console.error("Gamification smoke checks failed:", error);
  process.exitCode = 1;
});

export {};
