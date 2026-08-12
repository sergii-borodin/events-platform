/** Replace Danish letters: æ→ae, ø→oe, å→aa (case-aware for titles). */
export function replaceDanishLetters(value: string): string {
  return value
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "Ae")
    .replace(/ø/g, "oe")
    .replace(/Ø/g, "Oe")
    .replace(/å/g, "aa")
    .replace(/Å/g, "Aa");
}

export function createSlug(title: string): string {
  return replaceDanishLetters(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
