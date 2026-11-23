export const blackFridayEndsAt = Date.parse("2026-12-10T04:59:00.000Z");

export function isBlackFridayActive(now = Date.now()) {
  return now < blackFridayEndsAt;
}

export function blackFridayNavLabel(active: boolean) {
  return active ? "Black Friday" : "Offers Archive";
}
