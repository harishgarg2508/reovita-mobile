// Turns an SVG string into a base64 data URI. Android's image loader (expo-image) cannot read the
// percent-encoded "utf8" form, so every inline SVG goes through this helper.
export function svgDataUri(svg: string): string {
  // Encode to UTF-8 bytes first, so btoa (which only takes Latin-1) can handle any character.
  const utf8 = encodeURIComponent(svg).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return `data:image/svg+xml;base64,${btoa(utf8)}`;
}
