/**
 * Privacy helpers — keep the rules in one file so leaderboards, feeds,
 * public profile, discover, and stories all agree on what an "outsider"
 * may see about a given profile.
 *
 * Rule of thumb:
 *  - If `viewerId === profile.id`, return data untouched (user sees own data).
 *  - Else if `profile.public_profile === false`, return an anonymous shell.
 *  - Else only expose name/avatar + metrics whose `show_*` flag is true.
 */

export type PrivacyAwareProfile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  public_profile?: boolean | null;
  show_weight?: boolean | null;
  show_meals?: boolean | null;
  show_progress_photos?: boolean | null;
  show_workouts?: boolean | null;
  allow_dm?: boolean | null;
};

export type ProfileMetric =
  | "weight"
  | "meals"
  | "progress_photos"
  | "workouts"
  | "dm";

export const ANON_NAME = "Pengguna HealthyU";

/**
 * Mask a profile object for display to a viewer other than its owner.
 * Always safe to call — returns the original object when the viewer is the owner.
 */
export function maskPublicProfile<T extends PrivacyAwareProfile>(
  profile: T | null | undefined,
  viewerId: string | null,
): T | null {
  if (!profile) return null;
  if (viewerId && viewerId === profile.id) return profile;

  if (profile.public_profile === false) {
    return {
      ...profile,
      full_name: ANON_NAME,
      avatar_url: null,
    };
  }
  return profile;
}

/**
 * Check whether a particular metric can be shown to a viewer.
 * Owner can always see their own data.
 */
export function canShowProfileMetric(
  profile: PrivacyAwareProfile | null | undefined,
  metric: ProfileMetric,
  viewerId: string | null,
): boolean {
  if (!profile) return false;
  if (viewerId && viewerId === profile.id) return true;
  if (profile.public_profile === false) return false;
  switch (metric) {
    case "weight":
      return profile.show_weight === true;
    case "meals":
      return profile.show_meals === true;
    case "progress_photos":
      return profile.show_progress_photos === true;
    case "workouts":
      return profile.show_workouts === true;
    case "dm":
      return profile.allow_dm === true;
  }
}