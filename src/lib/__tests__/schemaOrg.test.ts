import { describe, it, expect } from "vitest";
import { buildArticleSchema, buildRecipeSchema, cleanSchema } from "../schemaOrg";

describe("buildArticleSchema", () => {
  it("builds a minimal Article with required fields", () => {
    const s = buildArticleSchema({ title: "Hello", slug: "hello" }, "https://x");
    expect(s["@type"]).toBe("Article");
    expect(s.headline).toBe("Hello");
    expect(s.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": "https://x/articles/hello" });
    expect(s.author).toBeUndefined();
    expect(s.image).toBeUndefined();
    expect(s.inLanguage).toBe("id-ID");
  });

  it("falls back dateModified to published_at and joins keywords", () => {
    const s = buildArticleSchema({
      title: "T",
      slug: "t",
      published_at: "2025-01-01",
      keywords: ["a", "b"],
      author_name: "Ada",
      image_url: "/img.jpg",
      reading_time_minutes: 3,
    });
    expect(s.dateModified).toBe("2025-01-01");
    expect(s.keywords).toBe("a, b");
    expect(s.author).toEqual({ "@type": "Person", name: "Ada" });
    expect(s.image).toEqual(["/img.jpg"]);
    expect(s.wordCount).toBe(600);
  });
});

describe("buildRecipeSchema", () => {
  it("formats time as ISO 8601 and infers totalTime when missing", () => {
    const s = buildRecipeSchema({
      title: "Nasi",
      slug: "nasi",
      prep_min: 10,
      cook_min: 20,
      servings: 2,
    });
    expect(s.prepTime).toBe("PT10M");
    expect(s.cookTime).toBe("PT20M");
    expect(s.totalTime).toBe("PT30M");
    expect(s.recipeYield).toBe("2 porsi");
  });

  it("omits nutrition when calories absent", () => {
    const s = buildRecipeSchema({ title: "x", slug: "x" });
    expect(s.nutrition).toBeUndefined();
    expect(s.aggregateRating).toBeUndefined();
  });

  it("includes aggregateRating when avg+count present", () => {
    const s = buildRecipeSchema({
      title: "x",
      slug: "x",
      avg_rating: 4.27,
      rating_count: 12,
    });
    expect(s.aggregateRating).toMatchObject({
      ratingValue: "4.3",
      ratingCount: 12,
      bestRating: 5,
    });
  });

  it("emits suitableForDiet for vegan but not vegetarian (vegan wins)", () => {
    const s = buildRecipeSchema({
      title: "x",
      slug: "x",
      is_vegan: true,
      is_vegetarian: true,
      is_halal: true,
    });
    expect(s.suitableForDiet).toContain("https://schema.org/VeganDiet");
    expect(s.suitableForDiet).not.toContain("https://schema.org/VegetarianDiet");
    expect(s.suitableForDiet).toContain("https://schema.org/HalalDiet");
  });

  it("emits VegetarianDiet when not vegan but vegetarian", () => {
    const s = buildRecipeSchema({
      title: "x",
      slug: "x",
      is_vegan: false,
      is_vegetarian: true,
    });
    expect(s.suitableForDiet).toContain("https://schema.org/VegetarianDiet");
    expect(s.suitableForDiet).not.toContain("https://schema.org/VeganDiet");
  });

  it("emits HowToStep instructions with positions", () => {
    const s = buildRecipeSchema({
      title: "x",
      slug: "x",
      instructions: ["a", "b"],
    });
    expect(s.recipeInstructions).toEqual([
      { "@type": "HowToStep", position: 1, text: "a" },
      { "@type": "HowToStep", position: 2, text: "b" },
    ]);
  });
});

describe("cleanSchema", () => {
  it("converts null to undefined and strips them", () => {
    const out = cleanSchema({ a: 1, b: null, c: { d: null, e: "ok" } });
    expect(out).toEqual({ a: 1, c: { e: "ok" } });
  });
});
