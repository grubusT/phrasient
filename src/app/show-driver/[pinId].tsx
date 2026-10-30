import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { getPin } from '../../db/pins';
import type { Pin } from '../../db/types';
import { driverCardText } from '../../lib/driverCard';
import { HoldUpScreen } from '../../components/HoldUpScreen';

/** The destination in local script, for a driver. Official text only, never the display name. */
export default function ShowDriverScreen() {
  const { pinId } = useLocalSearchParams<{ pinId: string }>();
  const [pin, setPin] = useState<Pin | null>(null);

  useEffect(() => {
    getPin(Number(pinId)).then(setPin);
  }, [pinId]);

  const card = pin ? driverCardText(pin) : null;
  if (!pin || !card) return null;

  return <HoldUpScreen primary={card.primary} secondary={card.secondary} caption={pin.address_en ?? pin.name_en} />;
}
