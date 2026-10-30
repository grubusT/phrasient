/**
 * Basemap sources.
 *
 * Online tiles come from OpenFreeMap, which serves the unmodified OpenMapTiles
 * schema. Offline archives are built from the same endpoint, so one style works
 * in both cases and there is no second style to keep in sync.
 */
export const OPENFREEMAP_TILE_URL = 'https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';

/** Hosted style, used until the PamPam-calm style lands. */
export const ONLINE_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

export const ATTRIBUTION = '© OpenFreeMap © OpenStreetMap contributors';
