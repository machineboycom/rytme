export const colors = {
  bg: 0x00272e,
  bgCss: "#00272e",
  tile: 0x0090a0,
  tileDim: 0x0090a0,
  tileShadow: 0x15152e,
  accent: 0x00c4d8,
  error: 0xff7461,
  white: 0xffffff,
  textMuted: "#555577",
  textDisabled: "#888888",
  textWhite: "#ffffff",
} as const;

export type Theme = typeof colors;
