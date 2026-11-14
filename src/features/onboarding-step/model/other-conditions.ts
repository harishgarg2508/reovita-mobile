// Conditions the user types under the "Other" chip. They are kept as one comma-separated text, which is
// what the server stores as the free text of the 'other' condition, and shown as one chip per name.

export const OTHER_LABEL = 'Other';

export function splitOtherConditions(text: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of text.split(/[,\n]/)) {
    const name = part.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export function joinOtherConditions(names: string[]): string {
  return names.join(', ');
}
