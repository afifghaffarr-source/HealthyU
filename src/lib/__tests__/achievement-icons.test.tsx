import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AchievementIcon, getAchievementToastPrefix } from "../achievement-icons";

describe("AchievementIcon", () => {
  it("renders mapped icon for valid name", () => {
    const { container } = render(<AchievementIcon icon="flame" />);
    // lucide renders an SVG
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("normalizes icon name (spaces, underscores)", () => {
    const { container } = render(<AchievementIcon icon="Chef Hat" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders emoji fallback for non-text icon", () => {
    const { container } = render(<AchievementIcon icon="🔥" />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent).toContain("🔥");
  });

  it("defaults to Medal for unknown text name", () => {
    const { container } = render(<AchievementIcon icon="unknown" />);
    expect(container.querySelector("svg")).toBeTruthy();
    // Medal is rendered
    expect(container.querySelector("[aria-hidden]")).toBeTruthy();
  });

  it("defaults to Medal for empty icon", () => {
    const { container } = render(<AchievementIcon icon={undefined} />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("accepts custom className", () => {
    const { container } = render(<AchievementIcon icon="flame" className="size-8" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class") ?? svg?.className?.toString() ?? "").toContain("size-8");
  });
});

describe("getAchievementToastPrefix", () => {
  it("returns emoji fallback for mapped icon", () => {
    expect(getAchievementToastPrefix("flame")).toBe("🔥");
  });

  it("returns raw emoji for non-text icon", () => {
    expect(getAchievementToastPrefix("🏆")).toBe("🏆");
  });

  it("defaults to medal for unknown text", () => {
    expect(getAchievementToastPrefix("unknown")).toBe("🏅");
  });

  it("defaults to medal for null/undefined", () => {
    expect(getAchievementToastPrefix(null)).toBe("🏅");
    expect(getAchievementToastPrefix(undefined)).toBe("🏅");
  });

  it("normalizes icon name", () => {
    expect(getAchievementToastPrefix("chef_hat")).toBe("👨‍🍳");
  });
});
