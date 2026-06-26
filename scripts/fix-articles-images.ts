/**
 * Fix broken picsum.photos images in articles table
 * Replace with Pollinations.ai URLs
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
function generateImagePrompt(title: string, category: string | null): string {
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

  const theme = categoryThemes[category?.toLowerCase() ?? "health"] || "health and wellness";

  // Clean title untuk prompt
  const cleanTitle = title.replace(/[?:]/g, "").replace(/\s+/g, " ").trim();

  return `${theme}, professional health photography, vibrant colors, modern minimalist, high quality, ${cleanTitle}, editorial style, clean composition`;
}

// Pollinations.ai URL constructor
function getPollinationsUrl(prompt: string, seed: number): string {
  const encodedPrompt = encodeURIComponent(prompt);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&seed=${seed}&model=flux&nologo=true`;
}

async function fixArticleImages() {
  console.log("🎨 Fixing broken picsum.photos images in articles table...\n");

  // Fetch articles with picsum.photos URLs
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, slug, title, category, image_url")
    .like("image_url", "%picsum.photos%")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching articles:", error.message);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log("✅ No broken images found!");
    return;
  }

  console.log(`📝 Found ${articles.length} articles with broken picsum.photos images\n`);

  let successCount = 0;
  let failCount = 0;

  for (const article of articles) {
    console.log(`🖼️  Fixing: ${article.title}`);
    console.log(`   Old URL: ${article.image_url}`);

    // Generate AI prompt
    const prompt = generateImagePrompt(article.title, article.category);

    // Generate unique seed from article slug
    const seed = article.slug.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const newImageUrl = getPollinationsUrl(prompt, seed);

    console.log(`   New URL: ${newImageUrl.substring(0, 100)}...`);

    // Update database
    const { error: updateError } = await supabase
      .from("articles")
      .update({ image_url: newImageUrl })
      .eq("id", article.id);

    if (updateError) {
      console.error(`   ❌ Failed: ${updateError.message}\n`);
      failCount++;
    } else {
      console.log(`   ✅ Updated\n`);
      successCount++;
    }

    // Small delay to be polite to API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n🎉 Fix complete!");
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
}

fixArticleImages().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
