export const GAMIFICATION_EVENT_TYPES = [
  'ROUTE_BUILT',
  'AI_PROMPT_SENT',
  'LOCAL_SPOT_MATCHED',
  'GROUP_SCOUTED',
  'MAP_PREVIEWED',
] as const;

export type GamificationEventType =
  (typeof GAMIFICATION_EVENT_TYPES)[number];
