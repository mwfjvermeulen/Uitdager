import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface ActivityInput {
  name: string;
  target_count: string;
  unit: string;
  duration_minutes: string;
  is_timed: boolean;
}

interface Props {
  visible: boolean;
  user: User;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateChallengeModal({ visible, user, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [activities, setActivities] = useState<ActivityInput[]>([{
    name: '', target_count: '', unit: 'reps', duration_minutes: '', is_timed: false,
  }]);
  const [loading, setLoading] = useState(false);

  const addActivity = () => {
    setActivities(prev => [...prev, { name: '', target_count: '', unit: 'reps', duration_minutes: '', is_timed: false }]);
  };

  const removeActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index));
  };

  const updateActivity = (index: number, field: keyof ActivityInput, value: string | boolean) => {
    setActivities(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Vul een titel in'); return; }
    if (activities.some(a => !a.name.trim())) { Alert.alert('Geef elke activiteit een naam'); return; }
    const days = parseInt(durationDays);
    if (isNaN(days) || days < 1 || days > 31) { Alert.alert('Duur moet tussen 1 en 31 dagen zijn'); return; }

    setLoading(true);
    try {
      const isManon = user.name === 'Manon';
      const { data: challenge, error } = await supabase
        .from('challenges')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          duration_days: days,
          status: 'proposed',
          proposed_by: user.id,
          manon_approved: isManon,
          melvin_approved: !isManon,
        })
        .select()
        .single();

      if (error || !challenge) throw error;

      const activityRows = activities.map((a, i) => ({
        challenge_id: challenge.id,
        name: a.name.trim(),
        target_count: a.is_timed ? null : (parseInt(a.target_count) || null),
        unit: a.is_timed ? 'minuten' : (a.unit || 'reps'),
        duration_minutes: a.is_timed ? (parseInt(a.duration_minutes) || null) : null,
        sort_order: i,
      }));

      await supabase.from('challenge_activities').insert(activityRows);

      setTitle('');
      setDescription('');
      setDurationDays('30');
      setActivities([{ name: '', target_count: '', unit: 'reps', duration_minutes: '', is_timed: false }]);
      onCreated();
      onClose();
    } catch (e) {
      Alert.alert('Fout', 'Kon de challenge niet aanmaken. Probeer opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nieuwe Challenge 💪</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Titel</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="bv. Fitness Challenge"
              placeholderTextColor="rgba(255,255,255,0.3)"
              maxLength={60}
            />

            <Text style={styles.label}>Beschrijving (optioneel)</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={description}
              onChangeText={setDescription}
              placeholder="Waarom doen jullie deze challenge?"
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Aantal dagen</Text>
            <View style={styles.daysRow}>
              {['7', '14', '21', '30', '31'].map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, durationDays === d && styles.dayChipActive]}
                  onPress={() => setDurationDays(d)}
                >
                  <Text style={[styles.dayChipText, durationDays === d && styles.dayChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[styles.input, styles.daysInput]}
                value={durationDays}
                onChangeText={setDurationDays}
                keyboardType="numeric"
                maxLength={2}
                placeholder="#"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <Text style={styles.label}>Activiteiten</Text>
            {activities.map((activity, index) => (
              <View key={index} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityNum}>#{index + 1}</Text>
                  {activities.length > 1 && (
                    <TouchableOpacity onPress={() => removeActivity(index)}>
                      <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.input}
                  value={activity.name}
                  onChangeText={v => updateActivity(index, 'name', v)}
                  placeholder="bv. Push-ups"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <View style={styles.typeRow}>
                  <TouchableOpacity
                    style={[styles.typeChip, !activity.is_timed && styles.typeChipActive]}
                    onPress={() => updateActivity(index, 'is_timed', false)}
                  >
                    <Text style={[styles.typeChipText, !activity.is_timed && styles.typeChipTextActive]}>Herhalingen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeChip, activity.is_timed && styles.typeChipActive]}
                    onPress={() => updateActivity(index, 'is_timed', true)}
                  >
                    <Text style={[styles.typeChipText, activity.is_timed && styles.typeChipTextActive]}>⏱ Minuten</Text>
                  </TouchableOpacity>
                </View>
                {activity.is_timed ? (
                  <TextInput
                    style={styles.input}
                    value={activity.duration_minutes}
                    onChangeText={v => updateActivity(index, 'duration_minutes', v)}
                    placeholder="Aantal minuten"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                  />
                ) : (
                  <View style={styles.repsRow}>
                    <TextInput
                      style={[styles.input, styles.repsInput]}
                      value={activity.target_count}
                      onChangeText={v => updateActivity(index, 'target_count', v)}
                      placeholder="Aantal"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, styles.unitInput]}
                      value={activity.unit}
                      onChangeText={v => updateActivity(index, 'unit', v)}
                      placeholder="eenheid"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addBtn} onPress={addActivity}>
              <Ionicons name="add-circle-outline" size={20} color="#4ECDC4" />
              <Text style={styles.addBtnText}>Activiteit toevoegen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? 'Even geduld...' : 'Challenge voorstellen 🚀'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: { maxHeight: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  label: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  dayChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  dayChipActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  dayChipText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  dayChipTextActive: { color: '#fff' },
  daysInput: { width: 56, textAlign: 'center', padding: 10 },
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activityNum: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  typeChipActive: { backgroundColor: 'rgba(78,205,196,0.2)', borderColor: '#4ECDC4' },
  typeChipText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 13 },
  typeChipTextActive: { color: '#4ECDC4' },
  repsRow: { flexDirection: 'row', gap: 8 },
  repsInput: { flex: 1 },
  unitInput: { flex: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginVertical: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: '#4ECDC4', borderStyle: 'dashed',
  },
  addBtnText: { color: '#4ECDC4', fontWeight: '700', fontSize: 15 },
  submitBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginTop: 8, marginBottom: 16,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});
