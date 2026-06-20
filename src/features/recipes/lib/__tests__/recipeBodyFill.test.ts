import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  SYSTEM_PROMPT,
  parseAndNormalizeBody,
  looksHealthy,
  type RecipeInput,
} from "@/features/recipes/lib/recipeBodyFill.lib";

const baseInput: RecipeInput = {
  slug: "nasi-merah-ayam-bakar",
  title: "Nasi Merah Ayam Bakar",
  description: "Menu makan siang sehat",
  category: "main",
  cuisine: "Indonesia",
  calories: 420,
  protein_g: 35,
  carbs_g: 45,
  fat_g: 10,
  servings: 1,
  tags: ["tinggi-protein", "rendah-lemak"],
};

describe("buildPrompt", () => {
  it("includes all required fields", () => {
    const p = buildPrompt(baseInput);
    expect(p).toContain("Nasi Merah Ayam Bakar");
    expect(p).toContain("Kategori: main");
    expect(p).toContain("Masakan: Indonesia");
    expect(p).toContain("Menu makan siang sehat");
    expect(p).toContain("420 kcal");
    expect(p).toContain("Protein: 35g");
    expect(p).toContain("Karbo: 45g");
    expect(p).toContain("Lemak: 10g");
    expect(p).toContain("Porsi: 1");
    expect(p).toContain("tinggi-protein, rendah-lemak");
  });

  it("omits null/undefined optional fields", () => {
    const p = buildPrompt({ slug: "x", title: "X" });
    expect(p).not.toContain("Kategori:");
    expect(p).not.toContain("Masakan:");
    expect(p).not.toContain("Estimasi kalori:");
    expect(p).not.toContain("Tag:");
    expect(p).toContain("Judul: X");
  });

  it("includes output schema + Indonesian units guidance", () => {
    const p = buildPrompt(baseInput);
    expect(p).toContain('"ingredients"');
    expect(p).toContain('"instructions"');
    expect(p).toContain("sdm");
    expect(p).toContain("gram");
    expect(p).toContain("Indonesia");
  });

  it("ends without markdown fences (instructs model to return pure JSON)", () => {
    const p = buildPrompt(baseInput);
    expect(p).not.toContain("```");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("is in Indonesian (chef persona)", () => {
    expect(SYSTEM_PROMPT).toContain("chef Indonesia");
  });

  it("demands JSON output", () => {
    expect(SYSTEM_PROMPT).toContain("JSON");
  });
});

describe("parseAndNormalizeBody — happy path (real Vexo shape)", () => {
  it("parses flat JSON with lowercase keys", () => {
    const raw = JSON.stringify({
      ingredients: ["100g nasi merah", "150g ayam fillet", "1 sdm kecap manis"],
      instructions: ["Cuci nasi, masak 25 menit", "Bakar ayam 10 menit", "Sajikan"],
    });
    const out = parseAndNormalizeBody(raw);
    expect(out).not.toBeNull();
    expect(out?.ingredients).toHaveLength(3);
    expect(out?.instructions).toHaveLength(3);
  });

  it("parses markdown-fenced JSON", () => {
    const raw =
      "```json\n" +
      JSON.stringify({
        ingredients: ["100g nasi", "100g ayam", "1 sdt garam"],
        instructions: ["masak", "sajikan"],
      }) +
      "\n```";
    const out = parseAndNormalizeBody(raw);
    expect(out).not.toBeNull();
    expect(out?.ingredients).toEqual(["100g nasi", "100g ayam", "1 sdt garam"]);
  });

  it("parses JSON with mixed-case keys", () => {
    const raw = JSON.stringify({
      Ingredients: ["a", "b", "c"],
      Instructions: ["1", "2"],
    });
    const out = parseAndNormalizeBody(raw);
    expect(out?.ingredients).toEqual(["a", "b", "c"]);
  });

  it("parses JSON wrapped in {result: ...}", () => {
    const raw = JSON.stringify({
      result: {
        ingredients: ["x", "y", "z"],
        instructions: ["1", "2"],
      },
    });
    const out = parseAndNormalizeBody(raw);
    expect(out?.ingredients).toEqual(["x", "y", "z"]);
  });

  it("parses JSON with recipe_ingredients / steps aliases", () => {
    const raw = JSON.stringify({
      recipe_ingredients: ["1", "2", "3"],
      steps: ["a", "b"],
    });
    const out = parseAndNormalizeBody(raw);
    expect(out?.ingredients).toEqual(["1", "2", "3"]);
    expect(out?.instructions).toEqual(["a", "b"]);
  });

  it("parses ingredients given as newline-separated string", () => {
    const raw = JSON.stringify({
      ingredients: "100g nasi\n150g ayam\n1 sdm kecap",
      instructions: ["langkah 1", "langkah 2"],
    });
    const out = parseAndNormalizeBody(raw);
    expect(out?.ingredients).toHaveLength(3);
    expect(out?.ingredients[0]).toBe("100g nasi");
  });

  it("parses instructions given as numbered list string", () => {
    const raw = JSON.stringify({
      ingredients: ["a", "b", "c"],
      instructions: "1. masak nasi\n2. bakar ayam\n3. sajikan",
    });
    const out = parseAndNormalizeBody(raw);
    expect(out?.instructions).toHaveLength(3);
    expect(out?.instructions[0]).toBe("masak nasi");
  });
});

describe("parseAndNormalizeBody — failure modes", () => {
  it("returns null for non-JSON garbage", () => {
    expect(parseAndNormalizeBody("maaf, saya tidak bisa")).toBeNull();
  });

  it("returns null for empty ingredients", () => {
    expect(parseAndNormalizeBody('{"ingredients":[],"instructions":["a","b"]}')).toBeNull();
  });

  it("returns null for too few ingredients (<3)", () => {
    expect(parseAndNormalizeBody('{"ingredients":["a","b"],"instructions":["x","y"]}')).toBeNull();
  });

  it("returns null for too few instructions (<2)", () => {
    expect(parseAndNormalizeBody('{"ingredients":["a","b","c"],"instructions":["x"]}')).toBeNull();
  });

  it("returns null for empty object", () => {
    expect(parseAndNormalizeBody("{}")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseAndNormalizeBody("null")).toBeNull();
  });

  it("returns null for array (not object) input", () => {
    expect(parseAndNormalizeBody('["a","b"]')).toBeNull();
  });
});

describe("looksHealthy — quality guard", () => {
  it("accepts a normal body", () => {
    expect(
      looksHealthy({
        ingredients: Array(8).fill("bahan"),
        instructions: Array(6).fill("langkah"),
      }),
    ).toBe(true);
  });

  it("rejects suspiciously long ingredients list", () => {
    expect(
      looksHealthy({
        ingredients: Array(25).fill("bahan"),
        instructions: Array(6).fill("langkah"),
      }),
    ).toBe(false);
  });

  it("rejects suspiciously long instructions list", () => {
    expect(
      looksHealthy({
        ingredients: Array(8).fill("bahan"),
        instructions: Array(20).fill("langkah"),
      }),
    ).toBe(false);
  });

  it("rejects single ingredient with prose-length text", () => {
    expect(
      looksHealthy({
        ingredients: ["a", "b", "x".repeat(250)],
        instructions: ["1", "2"],
      }),
    ).toBe(false);
  });

  it("rejects single instruction with prose-length text", () => {
    expect(
      looksHealthy({
        ingredients: ["a", "b", "c"],
        instructions: ["1", "x".repeat(600)],
      }),
    ).toBe(false);
  });
});
