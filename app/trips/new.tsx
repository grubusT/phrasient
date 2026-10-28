import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { createTrip, type NewLegInput } from '../../db/trips';
import { AVAILABLE_COUNTRIES } from '../../phrasebook/availableLanguages';

interface LegDraft {
  countryCode: string;
  languageCode: string;
  startDate: string;
  endDate: string;
}

function emptyLeg(): LegDraft {
  const first = AVAILABLE_COUNTRIES[0];
  return {
    countryCode: first.countryCode,
    languageCode: first.languageCode,
    startDate: '',
    endDate: '',
  };
}

export default function NewTripScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [legs, setLegs] = useState<LegDraft[]>([emptyLeg()]);
  const [error, setError] = useState<string | null>(null);

  const updateLeg = (index: number, patch: Partial<LegDraft>) => {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
  };

  const addLeg = () => setLegs((prev) => [...prev, emptyLeg()]);

  const removeLeg = (index: number) =>
    setLegs((prev) => prev.filter((_, i) => i !== index));

  const selectCountry = (index: number, countryCode: string) => {
    const option = AVAILABLE_COUNTRIES.find((c) => c.countryCode === countryCode);
    if (!option) return;
    updateLeg(index, { countryCode: option.countryCode, languageCode: option.languageCode });
  };

  const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Trip name is required');
      return;
    }
    for (const leg of legs) {
      if (!isValidDate(leg.startDate) || !isValidDate(leg.endDate)) {
        setError('Dates must be in YYYY-MM-DD format');
        return;
      }
      if (leg.endDate < leg.startDate) {
        setError('End date must be on or after start date');
        return;
      }
    }
    setError(null);

    const legInputs: NewLegInput[] = legs.map((leg) => ({
      country_code: leg.countryCode,
      language_code: leg.languageCode,
      start_date: leg.startDate,
      end_date: leg.endDate,
    }));

    const tripId = await createTrip(name.trim(), legInputs);
    router.replace(`/trips/${tripId}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Trip name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. China & Vietnam 2026"
      />

      {legs.map((leg, index) => (
        <View key={index} style={styles.legCard}>
          <View style={styles.legHeader}>
            <Text style={styles.legTitle}>Leg {index + 1}</Text>
            {legs.length > 1 && (
              <Pressable onPress={() => removeLeg(index)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            )}
          </View>

          <Text style={styles.label}>Country</Text>
          <View style={styles.countryRow}>
            {AVAILABLE_COUNTRIES.map((option) => (
              <Pressable
                key={option.countryCode}
                style={[
                  styles.countryPill,
                  leg.countryCode === option.countryCode && styles.countryPillSelected,
                ]}
                onPress={() => selectCountry(index, option.countryCode)}
              >
                <Text
                  style={[
                    styles.countryPillText,
                    leg.countryCode === option.countryCode && styles.countryPillTextSelected,
                  ]}
                >
                  {option.countryName}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={leg.startDate}
            onChangeText={(v) => updateLeg(index, { startDate: v })}
            placeholder="2026-11-03"
          />

          <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={leg.endDate}
            onChangeText={(v) => updateLeg(index, { endDate: v })}
            placeholder="2026-11-10"
          />
        </View>
      ))}

      <Pressable style={styles.addLegButton} onPress={addLeg}>
        <Text style={styles.addLegButtonText}>+ Add another leg</Text>
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.createButton} onPress={handleCreate}>
        <Text style={styles.createButtonText}>Create Trip</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, color: '#666', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  legCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  legHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legTitle: { fontSize: 16, fontWeight: '600' },
  remove: { color: '#d32f2f' },
  countryRow: { flexDirection: 'row', gap: 8 },
  countryPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  countryPillSelected: { backgroundColor: '#1a73e8' },
  countryPillText: { color: '#333' },
  countryPillTextSelected: { color: '#fff' },
  addLegButton: { marginTop: 16, alignItems: 'center', paddingVertical: 10 },
  addLegButtonText: { color: '#1a73e8', fontWeight: '600' },
  error: { color: '#d32f2f', marginTop: 12 },
  createButton: {
    marginTop: 24,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
