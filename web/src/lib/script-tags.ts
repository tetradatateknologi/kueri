/** Normalize user input into a tag name (no leading #, lowercase). */
export function normalizeTagName(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase();
}

export function parseTagInput(input: string): string[] {
  const parts = input.split(/[,\s]+/).map(normalizeTagName).filter(Boolean);
  return [...new Set(parts)];
}

export function formatTagLabel(name: string): string {
  return name.startsWith("#") ? name : `#${name}`;
}
