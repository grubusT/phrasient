import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createStop, getStop, updateStop } from '../../../../db/stops';
import type { StopType } from '../../../../db/types';
import { STOP_TYPE_LABELS, STOP_TYPES } from '../../../../components/stopTypeLabels';

export default function NewStopScreen() {
  const { legId, date, stopId } = useLocalSearchParams<{
    legId?: string;
    date?: string;
    stopId?: string;
  }>();
  const router = useRouter();
  const isEditing = Boolean(stopId);

  const [name, setName] = useState('');
  const [nameLocal, setNameLocal] = useState('');
  const [address, setAddress] = useState('');
  const [addressLocal, setAddressLocal] = useState('');
  const [time, setTime] = useState('');
  const [stopType, setStopType] = useState<StopType>('restaurant');
  const [error, setError] = useState<string | null>(null);
  const [legIdForSave, setLegIdForSave] = useState<number | null>(legId ? Number(legId) : null);
  const [dateForSave, setDateForSave] = useState<string>(date ?? '');

  useEffect(() => {
    if (!stopId) return;
    getStop(Number(stopId)).then((stop) => {
      if (!stop) return;
      setName(stop.name);
      setNameLocal(stop.name_local ?? '');
      setAddress(stop.address ?? '');
      setAddressLocal(stop.address_local ?? '');
      setTime(stop.time ?? '');
      setStopType(stop.stop_type);
      setLegIdForSave(stop.leg_id);
      setDateForSave(stop.day_date);
    });
  }, [stopId]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (time && !/^\d{2}:\d{2}$/.test(time)) {
      setError('Time must be in HH:MM format');
      return;
    }
    if (!legIdForSave) {
      setError('Missing leg for this stop');
      return;
    }
    setError(null);

    const input = {
      leg_id: legIdForSave,
      day_date: dateForSave,
      time: time || null,
      name: name.trim(),
      name_local: nameLocal.trim() || null,
      address: address.trim() || null,
      address_local: addressLocal.trim() || null,
      stop_type: stopType,
      notes: null,
    };

    if (isEditing) {
      await updateStop(Number(stopId), input);
    } else {
      await createStop(input);
    }

    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Stop type</Text>
      <View style={styles.typeRow}>
        {STOP_TYPES.map((t) => (
          <Pressable
            key={t}
            style={[styles.typePill, stopType === t && styles.typePillSelected]}
            onPress={() => setStopType(t)}
          >
            <Text style={[styles.typePillText, stopType === t && styles.typePillTextSelected]}>
              {STOP_TYPE_LABELS[t]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Din Tai Fung" />

      <Text style={styles.label}>Local-script name</Text>
      <TextInput
        style={styles.input}
        value={nameLocal}
        onChangeText={setNameLocal}
        placeholder="鼎泰丰"
      />

      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St"
      />

      <Text style={styles.label}>Local-script address</Text>
      <TextInput
        style={styles.input}
        value={addressLocal}
        onChangeText={setAddressLocal}
        placeholder="主街123号"
      />

      <Text style={styles.label}>Time (HH:MM, optional)</Text>
      <TextInput style={styles.input} value={time} onChangeText={setTime} placeholder="18:30" />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{isEditing ? 'Save Changes' : 'Save Stop'}</Text>
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
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e8e8e8',
  },
  typePillSelected: { backgroundColor: '#1a73e8' },
  typePillText: { color: '#333' },
  typePillTextSelected: { color: '#fff' },
  error: { color: '#d32f2f', marginTop: 12 },
  saveButton: {
    marginTop: 24,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
