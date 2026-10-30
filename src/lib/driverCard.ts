import type { Pin } from '../db/types';

export interface DriverCardText {
  /** The line held up to the driver: the address, else the name. */
  primary: string;
  /** The name under the address, when both exist. */
  secondary: string | null;
}

/**
 * What the driver card shows: the official local-script name and address, and
 * nothing else. It never falls back to the user's display name or to English,
 * since a driver who cannot read either would be handed a useless card. Null
 * when the pin has no local-script text, so the caller can say so instead.
 */
export function driverCardText(pin: Pin): DriverCardText | null {
  const name = pin.official_name?.trim() || null;
  const address = pin.official_address?.trim() || null;
  if (address) return { primary: address, secondary: name };
  if (name) return { primary: name, secondary: null };
  return null;
}
