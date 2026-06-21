import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  SYSTEM_PROMPT,
  parseAndNormalizeArticle,
  looksHealthy,
  type ArticleInput,
} from "@/features/articles/lib/articleBodyFill.lib";

const baseInput: ArticleInput = {
  slug: "panduan-diet-defisit-kalori-pemula",
  title: "Panduan Diet Defisit Kalori untuk Pemula",
  excerpt: "Cara aman memulai defisit kalori tanpa lemas.",
  category: "diet",
  tags: ["diet", "kalori", "pemula"],
  language: "id",
  reading_time_minutes: 6,
};

describe("buildPrompt", () => {
  it("includes all required fields", () => {
    const p = buildPrompt(baseInput);
    expect(p).toContain("Panduan Diet Defisit Kalori untuk Pemula");
    expect(p).toContain("Ringkasan: Cara aman memulai defisit kalori tanpa lemas.");
    expect(p).toContain("Kategori: diet");
    expect(p).toContain("Tag: diet, kalori, pemula");
    expect(p).toContain("Target bahasa: id");
    expect(p).toContain("Target durasi baca: 6 menit");
  });

  it("omits null/undefined optional fields", () => {
    const p = buildPrompt({ slug: "x", title: "X" });
    expect(p).not.toContain("Ringkasan:");
    expect(p).not.toContain("Kategori:");
    expect(p).not.toContain("Tag:");
    expect(p).not.toContain("Target durasi baca:");
    expect(p).toContain("Target bahasa: id"); // defaults to id
  });

  it("demands markdown structure (headings, FAQ)", () => {
    const p = buildPrompt(baseInput);
    expect(p).toContain("## Heading 2");
    expect(p).toContain("FAQ");
  });

  it("forbids placeholder text and emoji", () => {
    const p = buildPrompt(baseInput);
    expect(p).toContain("NO placeholder text");
    expect(p).toContain("Jangan pakai emoji");
  });
});

describe("SYSTEM_PROMPT", () => {
  it("sets Indonesia health writer persona", () => {
    expect(SYSTEM_PROMPT).toContain("penulis kesehatan Indonesia");
  });

  it("demands markdown output", () => {
    expect(SYSTEM_PROMPT).toContain("Markdown");
  });
});

describe("parseAndNormalizeArticle — happy path (real Vexo shape)", () => {
  it("parses plain markdown body", () => {
    const heading = "## Pendahuluan\n\nIni paragraf pembuka artikel.";
    const body = Array(10)
      .fill("Paragraf isi artikel yang panjang dan informatif tentang topik kesehatan.")
      .join("\n\n");
    const raw = `${heading}\n\n${body}`;
    const out = parseAndNormalizeArticle(raw);
    expect(out).not.toBeNull();
    expect(out?.content).toContain("Pendahuluan");
    expect(out?.content.length).toBeGreaterThan(500);
  });

  it("parses markdown-fenced body", () => {
    const heading = "## Judul\n\n";
    const body = Array(30)
      .fill("Paragraf panjang dengan informasi berguna untuk artikel kesehatan.")
      .join("\n\n");
    const raw = "```markdown\n" + heading + body + "\n```";
    const out = parseAndNormalizeArticle(raw);
    expect(out).not.toBeNull();
    expect(out?.content).toMatch(/^##\s/);
  });

  it("strips prefatory prose before the first heading", () => {
    const raw =
      "Berikut artikel yang Anda minta:\n\n" +
      "Semoga bermanfaat!\n\n" +
      "## Pendahuluan\n\n" +
      Array(30).fill("Paragraf isi artikel yang informatif dan panjang.").join("\n\n");
    const out = parseAndNormalizeArticle(raw);
    expect(out).not.toBeNull();
    expect(out?.content).not.toContain("Berikut artikel");
    expect(out?.content).not.toContain("Semoga bermanfaat");
    expect(out?.content).toMatch(/^##\s/);
  });
});

describe("parseAndNormalizeArticle — failure modes", () => {
  it("returns null for too-short content", () => {
    const raw = "## Pendahuluan\n\nPendek.";
    expect(parseAndNormalizeArticle(raw)).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(parseAndNormalizeArticle("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(parseAndNormalizeArticle("   \n\n  \n  ")).toBeNull();
  });
});

describe("looksHealthy — quality guard", () => {
  it("accepts a well-structured article", () => {
    const body = {
      content: [
        "## Pendahuluan",
        "Paragraf pembuka artikel yang panjang dan informatif untuk pembaca Indonesia.",
        "",
        "## Section 1",
        "Isi section 1 dengan penjelasan detail tentang topik yang diangkat.",
        "",
        "Paragraf lanjutan dengan contoh konkret dan data pendukung yang relevan.",
        "",
        "## Section 2",
        "Isi section 2 yang menjelaskan aspek lain dari topik utama artikel ini.",
        "",
        "Paragraf penutup section dengan rangkuman singkat dan actionable tips.",
        "",
        "## FAQ",
        "### Pertanyaan pertama yang sering ditanyakan?",
        "Jawaban lengkap untuk pertanyaan pertama dengan penjelasan bertahap.",
        "### Pertanyaan kedua yang juga sering muncul?",
        "Jawaban untuk pertanyaan kedua dengan tips praktis dan sumber referensi.",
      ].join("\n\n"),
    };
    expect(looksHealthy(body)).toBe(true);
  });

  it("rejects article with no headings", () => {
    const body = {
      content: Array(10).fill("Paragraf panjang tanpa heading.").join("\n\n"),
    };
    expect(looksHealthy(body)).toBe(false);
  });

  it("rejects too-short article", () => {
    expect(looksHealthy({ content: "## Pendahuluan\n\nPendek." })).toBe(false);
  });

  it("rejects too-long article (likely model repetition)", () => {
    const body = { content: "## Heading\n\n" + "x".repeat(25_000) };
    expect(looksHealthy(body)).toBe(false);
  });

  it("rejects article with no paragraphs", () => {
    const body = { content: "## A\n## B\n## C\n" };
    expect(looksHealthy(body)).toBe(false);
  });
});
