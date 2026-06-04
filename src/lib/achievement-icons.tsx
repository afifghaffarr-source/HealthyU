import type { LucideIcon } from "lucide-react";
import {
  Bot,
  Camera,
  ChefHat,
  Droplet,
  Dumbbell,
  Flame,
  HeartPulse,
  Medal,
  Moon,
  Pill,
  Smile,
  Star,
  Timer,
  Trophy,
  Users,
  Utensils,
} from "lucide-react";

const ICON_MAP: Record<string, { icon: LucideIcon; fallback: string }> = {
  activity: { icon: HeartPulse, fallback: "💓" },
  bot: { icon: Bot, fallback: "🤖" },
  camera: { icon: Camera, fallback: "📸" },
  "chef-hat": { icon: ChefHat, fallback: "👨‍🍳" },
  chefhat: { icon: ChefHat, fallback: "👨‍🍳" },
  droplet: { icon: Droplet, fallback: "💧" },
  dumbbell: { icon: Dumbbell, fallback: "🏋️" },
  flame: { icon: Flame, fallback: "🔥" },
  "heart-pulse": { icon: HeartPulse, fallback: "💓" },
  medal: { icon: Medal, fallback: "🏅" },
  moon: { icon: Moon, fallback: "🌙" },
  pill: { icon: Pill, fallback: "💊" },
  smile: { icon: Smile, fallback: "😊" },
  star: { icon: Star, fallback: "⭐" },
  timer: { icon: Timer, fallback: "⏱️" },
  trophy: { icon: Trophy, fallback: "🏆" },
  users: { icon: Users, fallback: "👥" },
  utensils: { icon: Utensils, fallback: "🍽️" },
};

function normalizeIconName(icon: string | null | undefined) {
  return (icon ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

function isTextIconName(icon: string) {
  return /^[a-z0-9-]+$/i.test(icon);
}

export function AchievementIcon({
  icon,
  className = "size-5",
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const raw = (icon ?? "").trim();
  const mapped = ICON_MAP[normalizeIconName(raw)];

  if (mapped) {
    const Icon = mapped.icon;
    return <Icon className={className} aria-hidden="true" />;
  }

  if (raw && !isTextIconName(raw)) {
    return (
      <span aria-hidden="true" className="leading-none">
        {raw}
      </span>
    );
  }

  return <Medal className={className} aria-hidden="true" />;
}

export function getAchievementToastPrefix(icon: string | null | undefined) {
  const raw = (icon ?? "").trim();
  const mapped = ICON_MAP[normalizeIconName(raw)];

  if (mapped) return mapped.fallback;
  if (raw && !isTextIconName(raw)) return raw;
  return "🏅";
}
