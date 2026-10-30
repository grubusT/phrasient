/**
 * Design tokens.
 *
 * The map carries the colour on this app's home screen, so the interface stays
 * paper and ink and lets the basemap through. Saturation is spent in exactly one
 * place: the numbered pins.
 */
export const color = {
  ink: '#15181C', // primary text
  paper: '#FBFBF9', // sheets and cards
  wash: '#ECEEE9', // basemap land, inactive fills
  water: '#C9D8DE', // basemap water
  muted: '#6E7378', // captions, romanisation
  hairline: '#DEE0DB',
  lacquer: '#9B2F26', // pins, and nothing else
  onLacquer: '#FBFBF9',
  danger: '#9B2F26',
  warningInk: '#5A4A14',
  warningGround: '#F6EFD8',
  driverGround: '#000000',
  driverInk: '#FFFFFF',
} as const;

/**
 * Type inverts the usual hierarchy: English is the caption, the local script is
 * the object being handed to someone. `script` and `driver` are the sizes that
 * matter — the rest stay quiet around them.
 */
export const type = {
  caption: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 16, lineHeight: 22 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  /** Local-script phrase and place lines. Extra leading clears diacritic stacks. */
  script: { fontSize: 22, lineHeight: 32 },
  /** Held up for a stranger to read at arm's length. */
  driver: { fontSize: 56, lineHeight: 68, fontWeight: '700' },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;
