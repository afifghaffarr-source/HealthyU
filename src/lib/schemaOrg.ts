/**
 * Schema.org JSON-LD builders for SEO.
 * Render the returned object via TanStack head() `scripts` entry:
 *
 *   head: ({ loaderData }) => ({
 *     scripts: [
 *       { type: "application/ld+json", children: JSON.stringify(buildArticleSchema(loaderData.article, origin)) },
 *     ],
 *   })
 */

export interface ArticleForSchema {
  title: string;
  slug: string;
  excerpt?: string | null;
  image_url?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  reading_time_minutes?: number | null;
  category?: string | null;
  keywords?: string[] | null;
}

export function buildArticleSchema(a: ArticleForSchema, origin = "") {
  const url = `${origin}/articles/${a.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.excerpt ?? undefined,
    image: a.image_url ? [a.image_url] : undefined,
    author: a.author_name ? { "@type": "Person", name: a.author_name } : undefined,
    publisher: { "@type": "Organization", name: "HealthyU" },
    datePublished: a.published_at ?? undefined,
    dateModified: a.updated_at ?? a.published_at ?? undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: a.category ?? undefined,
    keywords: Array.isArray(a.keywords) ? a.keywords.join(", ") : undefined,
    wordCount: a.reading_time_minutes ? a.reading_time_minutes * 200 : undefined,
    inLanguage: "id-ID",
  };
}

export interface RecipeForSchema {
  title: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  prep_min?: number | null;
  cook_min?: number | null;
  total_min?: number | null;
  servings?: number | null;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  fiber_g?: number | null;
  ingredients?: string[] | null;
  instructions?: string[] | null;
  cuisine?: string | null;
  category?: string | null;
  tags?: string[] | null;
  avg_rating?: number | null;
  rating_count?: number | null;
  is_vegan?: boolean | null;
  is_vegetarian?: boolean | null;
  is_keto_friendly?: boolean | null;
  is_halal?: boolean | null;
}

function minutesToISO(min?: number | null): string | undefined {
  if (!min || min <= 0) return undefined;
  return `PT${Math.round(min)}M`;
}

export function buildRecipeSchema(r: RecipeForSchema, origin = "") {
  const url = `${origin}/recipes/${r.slug}`;
  const diets: string[] = [];
  if (r.is_vegan) diets.push("https://schema.org/VeganDiet");
  else if (r.is_vegetarian) diets.push("https://schema.org/VegetarianDiet");
  if (r.is_keto_friendly) diets.push("https://schema.org/LowCalorieDiet");
  if (r.is_halal) diets.push("https://schema.org/HalalDiet");

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: r.title,
    description: r.description ?? undefined,
    image: r.image_url ? [r.image_url] : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    recipeCategory: r.category ?? undefined,
    recipeCuisine: r.cuisine ?? undefined,
    keywords: Array.isArray(r.tags) ? r.tags.join(", ") : undefined,
    recipeYield: r.servings ? `${r.servings} porsi` : undefined,
    prepTime: minutesToISO(r.prep_min),
    cookTime: minutesToISO(r.cook_min),
    totalTime: minutesToISO(r.total_min ?? (r.prep_min ?? 0) + (r.cook_min ?? 0)),
    recipeIngredient: r.ingredients ?? undefined,
    recipeInstructions: r.instructions?.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      text: step,
    })),
    nutrition: r.calories
      ? {
          "@type": "NutritionInformation",
          calories: `${r.calories} kcal`,
          proteinContent: r.protein_g ? `${r.protein_g} g` : undefined,
          carbohydrateContent: r.carbs_g ? `${r.carbs_g} g` : undefined,
          fatContent: r.fat_g ? `${r.fat_g} g` : undefined,
          fiberContent: r.fiber_g ? `${r.fiber_g} g` : undefined,
          servingSize: r.servings ? `1/${r.servings} resep` : undefined,
        }
      : undefined,
    suitableForDiet: diets.length ? diets : undefined,
    aggregateRating:
      r.avg_rating && r.rating_count && r.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(r.avg_rating).toFixed(1),
            ratingCount: r.rating_count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    inLanguage: "id-ID",
  };
}

/** Strip undefined deeply before JSON.stringify (Schema.org validators dislike nulls). */
export function cleanSchema<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_k, v) => (v === null ? undefined : v))) as T;
}
