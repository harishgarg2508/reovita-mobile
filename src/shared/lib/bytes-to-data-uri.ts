const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Turns the bytes of a picture into an address the Image component can show (data:image/jpeg;base64,...). Used for pictures the API serves behind sign-in,
// which cannot be given to Image as a plain web address.
export function bytesToDataUri(bytes: Uint8Array, mime: string): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2] + ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : ALPHABET[c & 63];
  }
  return `data:${mime};base64,${out}`;
}
