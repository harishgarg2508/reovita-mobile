// A random v4 UUID for a record the client creates before the server sees it (a medicine row on step 2).
// It is an identifier, not a secret: the server checks that the id is free or already belongs to the same subject.
// Uses the platform generator when there is one (web, newer runtimes); otherwise Math.random, as no extra package may be added.
export function newId(): string {
  const platform = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (platform?.randomUUID) return platform.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
