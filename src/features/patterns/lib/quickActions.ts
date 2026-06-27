/**
 * Quick Action Handlers
 *
 * Handles quick action buttons from pattern insight cards:
 * - reminder: Set meal reminder
 * - recipes: Navigate to filtered recipes
 * - chat: Open coach chat with pre-filled question
 * - tips: Show tips modal
 * - tracker: Open mood/hunger tracker
 */

import type { QuickAction } from "../types/pattern";

export function handleQuickAction(action: QuickAction) {
  const { type, action_data } = action;

  switch (type) {
    case "reminder":
      handleReminderAction(action_data);
      break;
    case "recipes":
      handleRecipesAction(action_data);
      break;
    case "chat":
      handleChatAction(action_data);
      break;
    case "tips":
      handleTipsAction(action_data);
      break;
    case "tracker":
      handleTrackerAction(action_data);
      break;
    default:
      console.warn("Unknown quick action type:", type);
  }
}

/**
 * Set reminder (navigate to reminder page or show modal)
 */
function handleReminderAction(data: unknown) {
  const { time, message } = (data as { time?: string; message?: string }) || {};

  // Store in localStorage for reminder page to pick up
  if (time && message) {
    localStorage.setItem("pending_reminder", JSON.stringify({ time, message }));
  }

  // Navigate to reminders page (or open modal if exists)
  window.location.href = "/profile/reminders";
}

/**
 * Navigate to recipes with filter
 */
function handleRecipesAction(data: unknown) {
  const { filter } = (data as { filter?: string }) || {};

  if (filter) {
    // Parse filter: "breakfast,quick" → ?meal_type=breakfast&tags=quick
    const parts = filter.split(",");
    const params = new URLSearchParams();

    parts.forEach((part) => {
      if (["breakfast", "lunch", "dinner", "snack"].includes(part)) {
        params.set("meal_type", part);
      } else {
        params.append("tags", part);
      }
    });

    window.location.href = `/resep?${params.toString()}`;
  } else {
    window.location.href = "/resep";
  }
}

/**
 * Open coach chat with pre-filled question
 */
function handleChatAction(data: unknown) {
  const { question } = (data as { question?: string }) || {};

  if (question) {
    // Store question in sessionStorage for chat to pick up
    sessionStorage.setItem("prefill_chat_question", question);
  }

  window.location.href = "/coach";
}

/**
 * Show tips modal
 */
function handleTipsAction(data: unknown) {
  const { tips } = (data as { tips?: string[] }) || {};

  if (tips && tips.length > 0) {
    // Show alert with tips (can be replaced with proper modal later)
    const tipsText = tips.map((tip, idx) => `${idx + 1}. ${tip}`).join("\n\n");
    alert(`💡 Tips:\n\n${tipsText}`);
  }
}

/**
 * Open mood/hunger tracker
 */
function handleTrackerAction(data: unknown) {
  const { route } = (data as { route?: string }) || {};

  if (route) {
    window.location.href = route;
  } else {
    // Default to meal log page (where mood/hunger is tracked)
    window.location.href = "/meal/log";
  }
}

/**
 * Generate quick actions based on pattern type
 * Used by scoring logic to create context-aware actions
 */
export function generateQuickActionsForPattern(patternType: string): QuickAction[] {
  const actionMap: Record<string, QuickAction[]> = {
    skip_breakfast: [
      {
        type: "reminder",
        label: "Set 7 AM reminder",
        action_data: { time: "07:00", message: "Waktunya sarapan!" },
      },
      {
        type: "recipes",
        label: "Quick breakfast ideas",
        action_data: { filter: "breakfast,quick" },
      },
    ],
    late_night_eating: [
      {
        type: "reminder",
        label: "Set 9 PM cutoff",
        action_data: { time: "21:00", message: "Jangan makan lagi ya!" },
      },
      {
        type: "tips",
        label: "Low-cal night snacks",
        action_data: { tips: ["Teh herbal hangat", "Greek yogurt 100 kcal", "Apel kecil"] },
      },
    ],
    stress_eating: [
      { type: "tracker", label: "Track mood triggers", action_data: { route: "/meal/log" } },
      {
        type: "tips",
        label: "Alternatives to stress eating",
        action_data: { tips: ["Jalan kaki 10 menit", "Deep breathing 5x", "Chat dengan teman"] },
      },
      {
        type: "chat",
        label: "Talk to coach",
        action_data: { question: "Gimana cara handle stress eating?" },
      },
    ],
    celebration_overeat: [
      {
        type: "tips",
        label: "Balance celebration meals",
        action_data: {
          tips: [
            "Porsi 80% dari biasanya",
            "Minum air 2 gelas sebelum makan",
            "Skip dessert atau pilih salah satu",
          ],
        },
      },
      {
        type: "recipes",
        label: "Healthier celebration meals",
        action_data: { filter: "healthy,special" },
      },
    ],
    gathering_overeat: [
      {
        type: "tips",
        label: "Tips eating out",
        action_data: {
          tips: [
            "Pesan duluan (jangan tunggu lapar)",
            "Share main course",
            "Minum air sebelum makan",
          ],
        },
      },
      {
        type: "chat",
        label: "Ask coach",
        action_data: { question: "Gimana handle makan bareng temen?" },
      },
    ],
    warung_overeat: [
      {
        type: "tips",
        label: "Warung menu hacks",
        action_data: {
          tips: [
            "Minta sayur lebih banyak",
            "Nasi setengah porsi",
            "Pilih lauk protein (tahu/tempe/telur)",
          ],
        },
      },
      { type: "recipes", label: "Pack lunch ideas", action_data: { filter: "lunch,meal-prep" } },
    ],
    busy_day_skips: [
      { type: "recipes", label: "Meal prep guide", action_data: { filter: "meal-prep,quick" } },
      {
        type: "tips",
        label: "Quick lunch ideas",
        action_data: { tips: ["Overnight oats prep", "Sandwich grab & go", "Meal prep Sunday"] },
      },
    ],
    sugar_crashes: [
      {
        type: "tips",
        label: "Stable blood sugar",
        action_data: {
          tips: [
            "Protein + fiber di setiap makan",
            "Kurangi refined carbs",
            "Snack: kacang, yogurt, buah",
          ],
        },
      },
      {
        type: "chat",
        label: "Ask about sugar",
        action_data: { question: "Kenapa gw sering lemes setelah makan?" },
      },
    ],
    eating_not_hungry: [
      {
        type: "tips",
        label: "Hunger scale guide",
        action_data: {
          tips: [
            "1-2: Terlalu lapar",
            "3-4: Pas buat makan",
            "5-6: Kenyang normal",
            "7+: Overeating",
          ],
        },
      },
      { type: "tracker", label: "Track hunger levels", action_data: { route: "/meal/log" } },
    ],
    ignoring_fullness: [
      {
        type: "tips",
        label: "Mindful eating tips",
        action_data: {
          tips: [
            "Makan pelan (20 menit)",
            "Pause di tengah - cek kenyang?",
            "Simpen sisanya untuk nanti",
          ],
        },
      },
      {
        type: "chat",
        label: "Talk to coach",
        action_data: { question: "Gimana cara aware sama sinyal kenyang?" },
      },
    ],
    // Meta-patterns (Sprint 14)
    stress_late_night_combo: [
      {
        type: "reminder",
        label: "Set 9 PM eating cutoff",
        action_data: { time: "21:00", message: "Stop eating — destress instead!" },
      },
      {
        type: "tips",
        label: "Evening stress relief",
        action_data: {
          tips: [
            "Jalan santai 15 menit setelah dinner",
            "Teh herbal hangat (bukan makanan)",
            "Journaling 5 menit sebelum tidur",
            "Set alarm tidur konsisten",
          ],
        },
      },
      {
        type: "chat",
        label: "Break the cycle",
        action_data: { question: "Gimana cara stop stress eating malam hari?" },
      },
    ],
    weekend_indulgence_combo: [
      {
        type: "tips",
        label: "Weekend balance tips",
        action_data: {
          tips: [
            "Plan 1 indulgence meal, sisanya normal",
            "Weekend juga track — jangan auto cheat day",
            "Olahraga weekend buat kompensasi",
            "Warung: porsi normal, jangan jumbo",
          ],
        },
      },
      {
        type: "recipes",
        label: "Healthy weekend meals",
        action_data: { filter: "healthy,special" },
      },
      {
        type: "chat",
        label: "Ask coach",
        action_data: { question: "Gimana enjoy weekend tanpa overeat?" },
      },
    ],
    emotional_mood_cycle: [
      {
        type: "tracker",
        label: "Track mood triggers",
        action_data: { route: "/meal/log" },
      },
      {
        type: "tips",
        label: "Break emotional eating",
        action_data: {
          tips: [
            "Pause 10 menit sebelum makan (cek lapar atau emosi?)",
            "Call/chat teman saat mood drop",
            "Aktivitas pengganti: jalan, musik, stretching",
            "Jangan stok comfort food di rumah",
          ],
        },
      },
      {
        type: "chat",
        label: "Talk it out",
        action_data: { question: "Gimana handle emotional eating pattern?" },
      },
    ],
  };

  return actionMap[patternType] || [];
}
