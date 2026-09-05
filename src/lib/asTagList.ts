/**
 * Workiz `Tags` is documented as an array but often arrives as a string
 * (or a keyed object). Never use `(job.Tags ?? []).map` — it throws
 * `map is not a function` and takes down Easy Live Sync.
 */
export function asTagList(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  if (typeof tags === "string" && tags.trim()) return [tags.trim()];
  if (tags && typeof tags === "object") {
    return Object.values(tags as Record<string, unknown>).map(String).filter(Boolean);
  }
  return [];
}
