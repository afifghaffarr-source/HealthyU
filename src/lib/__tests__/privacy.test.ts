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
    expect(masked?.public_profile).toBe(false);
  });

  it("private profile does not leak sensitive fields to non-owner", () => {
    const sensitiveProfile = {
      ...baseProfile,
      public_profile: false,
      email: "budi@example.com",
      health_conditions: "diabetes",
      allergies: "peanuts",
      medications: "metformin",
      weight: 80,
      birth_date: "1990-01-01",
    };
    const masked = maskPublicProfile(sensitiveProfile, viewer) as Record<string, unknown>;
    expect(masked?.email).toBeUndefined();
    expect(masked?.health_conditions).toBeUndefined();
    expect(masked?.allergies).toBeUndefined();
    expect(masked?.medications).toBeUndefined();
    expect(masked?.weight).toBeUndefined();
    expect(masked?.birth_date).toBeUndefined();
    expect(masked?.show_weight).toBeUndefined();
    expect(masked?.show_meals).toBeUndefined();
    expect(Object.keys(masked!).sort()).toEqual([
      "avatar_url",
      "full_name",
      "id",
      "public_profile",
    ]);
  });

  it("owner sees all fields even when public_profile is false", () => {
    const sensitiveProfile = {
      ...baseProfile,
      public_profile: false,
      email: "budi@example.com",
      health_conditions: "diabetes",
      weight: 80,
    };
    const masked = maskPublicProfile(sensitiveProfile, owner) as Record<string, unknown>;
    expect(masked?.full_name).toBe("Budi");
    expect(masked?.email).toBe("budi@example.com");
    expect(masked?.health_conditions).toBe("diabetes");
    expect(masked?.weight).toBe(80);
  });

  it("keeps public profile visible to other viewers", () => {
    const masked = maskPublicProfile(baseProfile, viewer);
    expect(masked?.full_name).toBe("Budi");
  });

  it("returns null for null input", () => {
    expect(maskPublicProfile(null, viewer)).toBeNull();
  });

  it("strips sensitive fields for non-owners even when public_profile=true", () => {
    const profileWithSensitive = {
      ...baseProfile,
      email: "budi@example.com",
      health_conditions: "diabetes",
      allergies: "peanuts",
      medications: "metformin",
    };
    const masked = maskPublicProfile(profileWithSensitive, viewer);
    expect(masked?.full_name).toBe("Budi");
    expect(masked?.id).toBe(owner);
    expect((masked as Record<string, unknown>)?.email).toBeUndefined();
    expect((masked as Record<string, unknown>)?.health_conditions).toBeUndefined();
    expect((masked as Record<string, unknown>)?.allergies).toBeUndefined();
    expect((masked as Record<string, unknown>)?.medications).toBeUndefined();
  });

  it("owner sees all fields including sensitive ones", () => {
    const profileWithSensitive = {
      ...baseProfile,
      email: "budi@example.com",
      health_conditions: "diabetes",
    };
    const masked = maskPublicProfile(profileWithSensitive, owner);
    expect(masked?.full_name).toBe("Budi");
    expect((masked as Record<string, unknown>)?.email).toBe("budi@example.com");
    expect((masked as Record<string, unknown>)?.health_conditions).toBe("diabetes");
  });

  it("unauthenticated viewer gets stripped fields on public profile", () => {
    const profileWithSensitive = {
      ...baseProfile,
      email: "budi@example.com",
    };
    const masked = maskPublicProfile(profileWithSensitive, null);
    expect(masked?.full_name).toBe("Budi");
    expect((masked as Record<string, unknown>)?.email).toBeUndefined();
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

  it("returns false for null profile", () => {
    expect(canShowProfileMetric(null, "weight", owner)).toBe(false);
  });

  it("respects progress_photos flag", () => {
    expect(
      canShowProfileMetric(
        { ...baseProfile, show_progress_photos: true },
        "progress_photos",
        viewer,
      ),
    ).toBe(true);
    expect(
      canShowProfileMetric(
        { ...baseProfile, show_progress_photos: false },
        "progress_photos",
        viewer,
      ),
    ).toBe(false);
  });

  it("respects workouts flag", () => {
    expect(canShowProfileMetric({ ...baseProfile, show_workouts: true }, "workouts", viewer)).toBe(
      true,
    );
    expect(canShowProfileMetric({ ...baseProfile, show_workouts: false }, "workouts", viewer)).toBe(
      false,
    );
  });

  it("respects dm flag", () => {
    expect(canShowProfileMetric({ ...baseProfile, allow_dm: true }, "dm", viewer)).toBe(true);
    expect(canShowProfileMetric({ ...baseProfile, allow_dm: false }, "dm", viewer)).toBe(false);
  });
});
