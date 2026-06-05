import { describe, it, expect } from "vitest";
import { maskPublicProfile, canShowProfileMetric, ANON_NAME } from "../privacy";

const owner = "u-owner";
const viewer = "u-viewer";

const baseProfile = {
  id: owner,
  full_name: "Budi",
  avatar_url: "https://x/a.png",
  public_profile: true,
  show_weight: false,
  show_meals: true,
  show_progress_photos: false,
  show_workouts: true,
  allow_dm: false,
};

describe("maskPublicProfile", () => {
  it("returns profile untouched for the owner", () => {
    expect(maskPublicProfile({ ...baseProfile, public_profile: false }, owner)).toEqual(
      expect.objectContaining({ full_name: "Budi", avatar_url: "https://x/a.png" }),
    );
  });

  it("anonymizes when profile is private and viewer is not the owner", () => {
    const masked = maskPublicProfile({ ...baseProfile, public_profile: false }, viewer);
    expect(masked?.full_name).toBe(ANON_NAME);
    expect(masked?.avatar_url).toBeNull();
  });

  it("keeps public profile visible to other viewers", () => {
    const masked = maskPublicProfile(baseProfile, viewer);
    expect(masked?.full_name).toBe("Budi");
  });

  it("returns null for null input", () => {
    expect(maskPublicProfile(null, viewer)).toBeNull();
  });
});

describe("canShowProfileMetric", () => {
  it("owner can always see their own metrics", () => {
    expect(canShowProfileMetric(baseProfile, "weight", owner)).toBe(true);
  });

  it("hides all metrics when profile is private", () => {
    const priv = { ...baseProfile, public_profile: false, show_meals: true };
    expect(canShowProfileMetric(priv, "meals", viewer)).toBe(false);
  });

  it("respects individual flags for other viewers", () => {
    expect(canShowProfileMetric(baseProfile, "meals", viewer)).toBe(true);
    expect(canShowProfileMetric(baseProfile, "weight", viewer)).toBe(false);
  });
});