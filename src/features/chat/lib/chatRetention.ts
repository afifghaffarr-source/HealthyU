/**
 * AUDIT-017 Phase 3 — chat retention policy types and constants.
 *
 * This module is safe to import from both client and server code.
 * It contains no server-only imports. Server-only operations (the
 * actual SQL purge) live in `chatRetention.server.ts`.
 *
 * Design: opt-in retention, default = forever. Matches the
 * existing data-retention.ts precedent ("user health data is
 * NEVER auto-deleted without explicit consent per UU PDP").
 */

export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 3650; // 10 years

/**
 * The retention value. `null` = keep forever (default for new users).
 * A number in [MIN_RETENTION_DAYS, MAX_RETENTION_DAYS] = auto-purge.
 */
export type ChatRetentionDays = number | null;

/**
 * Options shown in the settings UI. Order matters — first option is
 * the default (currently "simpan selamanya" / forever).
 *
 * `value: null` is the privacy-preserving default. Picking a number
 * is an explicit opt-in to auto-purge.
 */
export const CHAT_RETENTION_OPTIONS: ReadonlyArray<{
  value: ChatRetentionDays;
  label: string;
  description: string;
}> = [
  {
    value: null,
    label: "Simpan selamanya",
    description: "Pesan chat tetap tersimpan sampai Anda menghapusnya secara manual.",
  },
  {
    value: 30,
    label: "Hapus otomatis setelah 30 hari",
    description:
      "Chat yang lebih dari 30 hari akan dihapus otomatis saat Anda mengirim pesan baru.",
  },
  {
    value: 90,
    label: "Hapus otomatis setelah 90 hari",
    description:
      "Chat yang lebih dari 90 hari akan dihapus otomatis saat Anda mengirim pesan baru.",
  },
  {
    value: 180,
    label: "Hapus otomatis setelah 180 hari",
    description:
      "Chat yang lebih dari 180 hari akan dihapus otomatis saat Anda mengirim pesan baru.",
  },
  {
    value: 365,
    label: "Hapus otomatis setelah 1 tahun",
    description:
      "Chat yang lebih dari 1 tahun akan dihapus otomatis saat Anda mengirim pesan baru.",
  },
];

/**
 * Validate a client-supplied retention value before sending it to
 * the server. Returns the cleaned value, or throws if invalid.
 *
 * The SQL column has a CHECK constraint that will catch this too,
 * but a client-side check gives a better error message.
 */
export function validateChatRetentionDays(value: unknown): ChatRetentionDays {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("Retention must be an integer or null");
  }
  if (value < MIN_RETENTION_DAYS || value > MAX_RETENTION_DAYS) {
    throw new Error(
      `Retention must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS} days (got ${value})`,
    );
  }
  return value;
}

/**
 * Human-readable summary of a retention value, for tooltips and
 * confirmation dialogs.
 */
export function describeChatRetention(days: ChatRetentionDays): string {
  if (days === null) return "Selamanya (tidak ada auto-hapus)";
  if (days < 60) return `${days} hari`;
  if (days < 365) return `${Math.round(days / 30)} bulan`;
  return `${Math.round((days / 365) * 10) / 10} tahun`;
}
