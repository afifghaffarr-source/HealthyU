import { z } from "zod";

/**
 * Shared Zod schemas for input validation across server functions & routes.
 * Always use these (or schemas like them) for user-provided input — never trust raw payloads.
 */

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(254);

// Common text fields with safe bounds (prevents DoS via huge payloads).
export const shortTextSchema = z.string().min(1).max(255);
export const mediumTextSchema = z.string().min(1).max(2000);
export const longTextSchema = z.string().min(1).max(10000);

// Slug / identifier-style strings (no spaces, no special chars).
export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Slug hanya boleh huruf kecil, angka, dan tanda strip");

// Chat message constraints (matches existing chat.stream limit).
export const chatMessageSchema = z.object({
  message: mediumTextSchema,
  imageBase64: z.string().max(5_500_000).optional(), // ~4 MB base64
  imageMime: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

// Pagination
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// Numeric bounds for health metrics (defensive validation).
export const weightKgSchema = z.number().positive().max(500);
export const heightCmSchema = z.number().positive().max(300);
export const ageYearsSchema = z.number().int().min(0).max(150);

/**
 * Safe-parse helper that throws a consistent error for server functions.
 */
export function parseInput<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Validation error: ${msg}`);
  }
  return r.data;
}
