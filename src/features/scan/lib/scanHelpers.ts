// Re-exports from consolidated scan modules (client-safe only).
// Server-only scan helpers (AI calling, rate limiting) live in
// `./scanCore.server` and must not be imported from client code.
export { MEAL_TYPES, type MealTypeValue, pickDefaultMealType, fileToDataUrl } from "./scanCore";
