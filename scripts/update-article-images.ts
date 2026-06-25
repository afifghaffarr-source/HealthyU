/**
 * Update artikel yang belum punya gambar dengan placeholder images
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("🖼️  Updating artikel images...\n");

  // Get articles without images
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, slug")
    .or("image_url.is.null,image_url.eq.");

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  if (!articles || articles.length === 0) {
    console.log("✅ All articles already have images!");
    return;
  }

  console.log(`Found ${articles.length} articles without images:\n`);

  for (const article of articles) {
    const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(article.slug)}/1200/630`;

    const { error: updateError } = await supabase
      .from("articles")
      .update({ image_url: imageUrl })
      .eq("id", article.id);

    if (updateError) {
      console.error(`❌ Failed: ${article.title}`, updateError);
    } else {
      console.log(`✅ ${article.title}`);
    }
  }

  console.log(`\n✅ Updated ${articles.length} artikel images!`);
}

main().catch(console.error);
