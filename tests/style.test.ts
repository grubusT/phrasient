import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { buildStyle } from '../src/map/style.ts';

test('the basemap style is valid against the MapLibre style spec', () => {
  assert.deepEqual(validateStyleMin(buildStyle()), []);
});

test('the basemap needs no sprite, so there is nothing extra to carry offline', () => {
  const style = buildStyle();
  assert.equal(style.sprite, undefined);
  for (const layer of style.layers) {
    if (layer.type === 'symbol') assert.equal(layer.layout?.['icon-image'], undefined, layer.id);
  }
});

test('an offline source swaps in without changing a layer', () => {
  const online = buildStyle();
  const offline = buildStyle({ type: 'vector', url: 'pmtiles://file:///trip.pmtiles' });
  assert.deepEqual(offline.layers, online.layers);
  assert.equal(validateStyleMin(offline).length, 0);
});
