/**
 * Generate AI images for seo_articles using Pollinations.ai
 *
 * Uses free Pollinations.ai API (https://image.pollinations.ai)
 * - No authentication required
 * - Indonesian health/nutrition themed prompts
 * - High quality images suitable for artikel headers
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate Indonesian AI image prompt based on article
function generateImagePrompt(title: string, category: string): string {
  const categoryThemes: Record<string, string> = {
    diet: "healthy meal prep, balanced nutrition, colorful vegetables",
    nutrisi: "fresh fruits and vegetables, protein sources, balanced diet",
    olahraga: "fitness workout, exercise equipment, active lifestyle",
    fitness: "gym training, strength exercise, healthy body",
    mental: "meditation, peaceful mind, wellness, calm atmosphere",
    health: "healthy lifestyle, medical wellness, preventive care",
    nutrition: "nutritious food, meal planning, dietary balance",
    kesehatan: "healthy living, wellness concept, medical care",
  };

  const theme = categoryThemes[category.toLowerCase()] || "health and wellness";

  // Clean title untuk prompt
  const cleanTitle = title.replace(/[?:]/g, "").replace(/\s+/g, " ").trim();

  return `${theme}, professional health photography, vibrant colors, modern minimalist, high quality, ${cleanTitle}, editorial style, clean composition`;
}

// Pollinations.ai URL constructor
function getPollinationsUrl(prompt: string, seed: number): string {
  // Use model parameter for better quality
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&seed=${seed}&model=flux&nologo=true`;
}

async function generateImagesForArticles() {
  console.log("🎨 Generating AI images for seo_articles...\n");

  // Fetch articles without images
  const { data: articles, error } = await supabase
    .from("seo_articles")
    .select("id, slug, title, category")
    .or("image_url.is.null,image_url.eq.")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching articles:", error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log("✅ All articles already have images!");
    return;
  }

  console.log(`📝 Found ${articles.length} articles without images\n`);

  for (const article of articles) {
    console.log(`🖼️  Generating image for: ${article.title}`);
    console.log(`   Category: ${article.category}`);

    // Generate AI prompt
    const prompt = generateImagePrompt(article.title, article.category);
    console.log(`   Prompt: ${prompt.substring(0, 80)}...`);

    // Generate unique seed from article slug
    const seed = article.slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const imageUrl = getPollinationsUrl(prompt, seed);

    console.log(`   URL: ${imageUrl.substring(0, 80)}...`);

    // Update database
    const { error: updateError } = await supabase
      .from("seo_articles")
      .update({ image_url: imageUrl })
      .eq("id", article.id);

    if (updateError) {
      console.error(`   ❌ Failed to update: ${updateError.message}`);
    } else {
      console.log(`   ✅ Image URL saved\n`);
    }

    // Small delay to be polite to API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n🎉 Image generation complete!");
  console.log(`✅ Updated ${articles.length} articles with AI-generated images`);
}

generateImagesForArticles().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
