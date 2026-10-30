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
 * Basemap colours. Low contrast throughout: roads are a touch lighter than the
 * land, labels a step quieter than the sheet's text, and nothing is saturated,
 * so the lacquer pins are the first thing the eye finds.
 */
export const mapColor = {
  land: color.wash,
  water: color.water,
  waterLabel: '#6F8A95',
  park: '#DFE6DA',
  building: '#E2E4DF',
  road: color.paper,
  rail: '#D3D6D0',
  boundary: '#B9BDB6',
  label: '#4C5157',
  roadLabel: color.muted,
  halo: color.paper,
  /** The dotted line joining pins in trip order. */
  connector: color.ink,
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
  /** The trip-order number inside a pin. */
  numeral: { fontSize: 14, lineHeight: 17, fontWeight: '700' },
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

/** The one elevation in the app: pins lifting off the map. */
export const shadow = {
  pin: {
    shadowColor: color.ink,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
} as const;

/**
 * The app's one orchestrated motion: the sheet settling on a snap point, with
 * the camera moving alongside it when a pin is opened. The spring is just
 * under critically damped, so a flick carries its speed in and settles without
 * a bounce. The camera's duration is matched to how long the spring takes to
 * come to rest, so the two land together. Under Reduce Motion, Reanimated
 * skips the spring and the sheet jumps to its snap.
 */
export const motion = {
  sheetSpring: { damping: 32, stiffness: 300, mass: 1 },
  cameraMs: 450,
} as const;
