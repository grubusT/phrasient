import { test } from 'node:test';
import assert from 'node:assert/strict';
import { driverCardText } from '../src/lib/driverCard.ts';
import type { Pin } from '../src/db/types.ts';

function pin(partial: Partial<Pin>): Pin {
  return {
    id: 1,
    trip_id: 1,
    day_date: '2026-11-03',
    order_index: 0,
    display_name: 'My hotel',
    official_name: null,
    official_address: null,
    name_en: 'Hotel Metropole',
    address_en: '15 Ngo Quyen, Hanoi',
    country_code: 'VN',
    stop_type: 'accommodation',
    lat: null,
    lng: null,
    place_id: null,
    place_types: null,
    source: 'manual',
    time: null,
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

test('the driver card leads with the official address and keeps the official name under it', () => {
  assert.deepEqual(
    driverCardText(pin({ official_name: 'Khách sạn Metropole', official_address: '15 Ngô Quyền, Hà Nội' })),
    { primary: '15 Ngô Quyền, Hà Nội', secondary: 'Khách sạn Metropole' }
  );
});

test('the driver card falls back to the official name alone', () => {
  assert.deepEqual(driverCardText(pin({ official_name: '上海站' })), { primary: '上海站', secondary: null });
});

test('the driver card never shows the display name or English', () => {
  assert.equal(driverCardText(pin({})), null);
  assert.equal(driverCardText(pin({ official_name: '  ', official_address: '' })), null);
});
