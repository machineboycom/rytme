export const colors = {
  bg: 0x1a1a2e,
  bgCss: "#1a1a2e",
  tile: 0x2a2a4e,
  tileDim: 0x2a2a4e,
  tileShadow: 0x15152e,
  accent: 0x4ecca3,
  error: 0xe94560,
  white: 0xffffff,
  textMuted: "#555577",
  textDisabled: "#888888",
  textWhite: "#ffffff",
} as const;

export type Theme = typeof colors;
