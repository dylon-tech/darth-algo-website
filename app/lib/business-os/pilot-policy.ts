// Owner approved September 8, 2026: one internal starter run per department,
// $1 total. This is not a recurring or general execution authorization.
export const pilot = {
  id: "starter-20260908", model: "gpt-5.6-luna", maxAttempts: 8,
  reservationUsd: 0.125, totalUsd: 1, maxRequestBytes: 100000,
  maxOutputTokens: 2500,
  // Standard per-token prices verified against OpenAI's model page 2026-09-08.
  inputUsdPerMillion: 0.20, outputUsdPerMillion: 1.20,
} as const;
export const pilotJobKeys = ["ceo", "growth", "content", "support", "affiliates", "analytics", "research", "operations"]
  .map(department => `darth-starter-20260907-${department}`);
export function assertPilotRequest(body: string) {
  if (Buffer.byteLength(body) > pilot.maxRequestBytes) throw new Error("PILOT_INPUT_LIMIT");
}
