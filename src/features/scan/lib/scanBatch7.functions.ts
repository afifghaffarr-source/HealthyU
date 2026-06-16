// Re-exports from consolidated scan modules
export { getDailyQuote, getDailyQuiz, answerDailyQuiz } from "./scanContent.functions";
export { discoverUsers, searchUsers } from "./scanDiscovery.functions";
export { getMealHeatmap } from "./scanReports.functions";
export { estimateBodyComposition, syncWorkoutBurn } from "./scanWellness.functions";
export { smartMealReminderPattern } from "./scanAICoach.functions";
export {
  gachaPull,
  listPetAccessories,
  buyPetAccessory,
  equipPetAccessory,
  listHabitStacks,
  createHabitStack,
} from "./scanGamification.functions";
export { voteFamilyMeal, getFamilyMealVotes } from "./scanPlan.functions";
export { generateRecipeVideoScript, coachInterview } from "./scanAICoach.functions";
export { listFollowers } from "./scanDiscovery.functions";
