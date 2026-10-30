// Type-only, and the same package MapLibre RN takes its style types from; it
// re-exports most of them but not ExpressionSpecification.
import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type {
  LayerSpecification,
  SourceSpecification,
  StyleSpecification,
} from '@maplibre/maplibre-react-native';
import { mapColor } from '../theme';

/**
 * Basemap sources.
 *
 * Online tiles come from OpenFreeMap, which serves the unmodified OpenMapTiles
 * schema. Offline archives are built from the same endpoint, so one style works
 * in both cases and there is no second style to keep in sync.
 */
export const OPENFREEMAP_TILE_URL = 'https://tiles.openfreemap.org/planet/latest/{z}/{x}/{y}.pbf';

export const ATTRIBUTION = '© OpenFreeMap © OpenStreetMap contributors';

/** TileJSON for the current planet build; it resolves to a dated tile path. */
const ONLINE_SOURCE: SourceSpecification = {
  type: 'vector',
  url: 'https://tiles.openfreemap.org/planet',
  attribution: ATTRIBUTION,
};

const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const SOURCE = 'openmaptiles';
const REGULAR = ['Noto Sans Regular'];
const ITALIC = ['Noto Sans Italic'];

/**
 * Latin name with the local script under it where they differ ("Shanghai" over
 * "上海"), so a label can be matched against a street sign. Vietnamese is Latin
 * script, so it gets one line.
 */
const NAME: ExpressionSpecification = [
  'case',
  ['has', 'name:nonlatin'],
  ['concat', ['get', 'name:latin'], '\n', ['get', 'name:nonlatin']],
  ['coalesce', ['get', 'name_en'], ['get', 'name']],
];

const notTunnel: ExpressionSpecification = ['!=', ['get', 'brunnel'], 'tunnel'];
const isClass = (...classes: string[]): ExpressionSpecification => [
  'match',
  ['get', 'class'],
  classes,
  true,
  false,
];

/** Road width by zoom, scaled so motorways are wider than minor streets. */
const roadWidth = (atZ10: number, atZ18: number): ExpressionSpecification => [
  'interpolate',
  ['exponential', 1.5],
  ['zoom'],
  10,
  atZ10,
  18,
  atZ18,
];

const labelPaint = (textColor: string) => ({
  'text-color': textColor,
  'text-halo-color': mapColor.halo,
  'text-halo-width': 1.5,
});

/**
 * The basemap, a calm light style after the PamPam references: land and water
 * in two quiet tones, roads drawn lighter than the land rather than darker, and
 * no points of interest at all. Pins are the only points on this map; a cafe
 * icon beside a pin would compete with it. Having no icons also means the style
 * needs no sprite, which is one less remote asset to carry offline.
 */
export function buildStyle(source: SourceSpecification = ONLINE_SOURCE): StyleSpecification {
  const layers: LayerSpecification[] = [
    { id: 'land', type: 'background', paint: { 'background-color': mapColor.land } },
    {
      id: 'park',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'park',
      paint: { 'fill-color': mapColor.park },
    },
    {
      id: 'wood',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'landcover',
      filter: isClass('wood', 'grass'),
      paint: { 'fill-color': mapColor.park, 'fill-opacity': 0.6 },
    },
    {
      id: 'water',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'water',
      filter: notTunnel,
      paint: { 'fill-color': mapColor.water },
    },
    {
      id: 'waterway',
      type: 'line',
      source: SOURCE,
      'source-layer': 'waterway',
      minzoom: 10,
      filter: notTunnel,
      paint: { 'line-color': mapColor.water, 'line-width': roadWidth(1, 4) },
    },
    {
      id: 'building',
      type: 'fill',
      source: SOURCE,
      'source-layer': 'building',
      minzoom: 14,
      paint: { 'fill-color': mapColor.building },
    },
    {
      id: 'rail',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['all', isClass('rail', 'transit'), notTunnel],
      paint: { 'line-color': mapColor.rail, 'line-width': 1 },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', isClass('minor', 'service'), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': mapColor.road, 'line-width': roadWidth(0.5, 8) },
    },
    {
      id: 'road-major',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 8,
      filter: ['all', isClass('primary', 'secondary', 'tertiary', 'trunk'), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': mapColor.road, 'line-width': roadWidth(1, 14) },
    },
    {
      id: 'road-motorway',
      type: 'line',
      source: SOURCE,
      'source-layer': 'transportation',
      minzoom: 5,
      filter: ['all', isClass('motorway'), notTunnel],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': mapColor.road, 'line-width': roadWidth(1.5, 18) },
    },
    {
      id: 'boundary-country',
      type: 'line',
      source: SOURCE,
      'source-layer': 'boundary',
      filter: ['all', ['==', ['get', 'admin_level'], 2], ['!=', ['get', 'maritime'], 1]],
      paint: { 'line-color': mapColor.boundary, 'line-width': 1, 'line-dasharray': [3, 2] },
    },
    {
      id: 'label-water',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'water_name',
      filter: ['==', ['geometry-type'], 'Point'],
      layout: { 'text-field': NAME, 'text-font': ITALIC, 'text-size': 12, 'text-max-width': 8 },
      paint: labelPaint(mapColor.waterLabel),
    },
    {
      id: 'label-road',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'transportation_name',
      minzoom: 14,
      filter: isClass('primary', 'secondary', 'tertiary', 'trunk', 'minor'),
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME,
        'text-font': REGULAR,
        'text-size': 11,
      },
      paint: labelPaint(mapColor.roadLabel),
    },
    {
      id: 'label-neighbourhood',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      minzoom: 12,
      filter: isClass('suburb', 'quarter', 'neighbourhood'),
      layout: { 'text-field': NAME, 'text-font': REGULAR, 'text-size': 11, 'text-max-width': 8 },
      paint: labelPaint(mapColor.roadLabel),
    },
    {
      id: 'label-town',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      minzoom: 9,
      filter: isClass('town', 'village'),
      layout: { 'text-field': NAME, 'text-font': REGULAR, 'text-size': 13, 'text-max-width': 8 },
      paint: labelPaint(mapColor.label),
    },
    {
      id: 'label-city',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      minzoom: 4,
      filter: isClass('city'),
      layout: {
        'text-field': NAME,
        'text-font': REGULAR,
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 12, 10, 16],
        'text-max-width': 8,
      },
      paint: labelPaint(mapColor.label),
    },
    {
      id: 'label-country',
      type: 'symbol',
      source: SOURCE,
      'source-layer': 'place',
      maxzoom: 7,
      filter: isClass('country'),
      layout: { 'text-field': NAME, 'text-font': REGULAR, 'text-size': 13, 'text-max-width': 8 },
      paint: labelPaint(mapColor.label),
    },
  ];

  return { version: 8, glyphs: GLYPHS, sources: { [SOURCE]: source }, layers };
}
