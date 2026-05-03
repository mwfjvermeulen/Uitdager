import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Challenge, ChallengeActivity, ActivityProgress, DailyCompletion } from '../../types';
import ActivityItem from '../../components/ActivityItem';

export default function ChallengeScreen() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [activities, setActivities] = useState<ChallengeActivity[]>([]);
  const [myProgress, setMyProgress] = useState<ActivityProgress[]>([]);
  const [myCompletion, setMyCompletion] = useState<DailyCompletion | null>(null);
  const [otherCompletion, setOtherCompletion] = useState<DailyCompletion | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dayNumber, setDayNumber] = useState(1);

  useFocusEffect(useCallback(() => {
    loadData();
    const sub = supabase
      .channel('challenge_tab')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_progress' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_completions' }, loadData)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []));

  const loadData = async () => {
    const { data: other } = await supabase.from('users').select('*').neq('id', user!.id);
    setOtherUser(other?.[0] ?? null);

    const { data: active } = await supabase
      .from('challenges').select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1);

    if (!active?.[0]) { setChallenge(null); return; }
    const ch = active[0];
    setChallenge(ch);

    const today = new Date();
    const start = new Date(ch.start_date!);
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const day = Math.max(1, Math.min(diff, ch.duration_days));
    setDayNumber(day);

    const { data: acts } = await supabase
      .from('challenge_activities').select('*')
      .eq('challenge_id', ch.id).order('sort_order');
    setActivities(acts ?? []);

    const { data: prog } = await supabase
      .from('activity_progress').select('*')
      .eq('challenge_id', ch.id).eq('user_id', user!.id).eq('day_number', day);
    setMyProgress(prog ?? []);

    const { data: myComp } = await supabase
      .from('daily_completions').select('*')
      .eq('challenge_id', ch.id).eq('user_id', user!.id).eq('day_number', day).single();
    setMyCompletion(myComp ?? null);

    if (other?.[0]) {
      const { data: otherComp } = await supabase
        .from('daily_completions').select('*')
        .eq('challenge_id', ch.id).eq('user_id', other[0].id).eq('day_number', day).single();
      setOtherCompletion(otherComp ?? null);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleToggleActivity = async (activityId: string, completed: boolean) => {
    if (!challenge) return;
    const existing = myProgress.find(p => p.activity_id === activityId);
    if (existing) {
      await supabase.from('activity_progress')
        .update({ completed, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('activity_progress').insert({
        challenge_id: challenge.id,
        user_id: user!.id,
        activity_id: activityId,
        day_number: dayNumber,
        completed,
        progress_count: completed ? 1 : 0,
      });
    }
    await loadData();
    await autoCheckDayCompletion();
  };

  const autoCheckDayCompletion = async () => {
    if (!challenge) return;
    const { data: prog } = await supabase
      .from('activity_progress').select('*')
      .eq('challenge_id', challenge.id).eq('user_id', user!.id).eq('day_number', dayNumber);
    const { data: acts } = await supabase
      .from('challenge_activities').select('*').eq('challenge_id', challenge.id);

    if ((prog ?? []).every(p => p.completed) && (prog ?? []).length === (acts ?? []).length) {
      await markDayComplete();
    }
  };

  const markDayComplete = async () => {
    if (!challenge || myCompletion) return;
    await supabase.from('daily_completions').upsert({
      challenge_id: challenge.id,
      user_id: user!.id,
      day_number: dayNumber,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id,day_number' });
    await loadData();
  };

  const handleManualComplete = async () => {
    Alert.alert(
      'Dag voltooien',
      `Dag ${dayNumber} markeren als voltooid?`,
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Voltooien', onPress: markDayComplete },
      ]
    );
  };

  const completedCount = myProgress.filter(p => p.completed).length;
  const progressPct = activities.length > 0 ? completedCount / activities.length : 0;

  if (!challenge) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.noChallEmoji}>🔥</Text>
          <Text style={styles.noChallengeText}>Geen actieve challenge.</Text>
          <Text style={styles.noChallSub}>Ga naar de map-tab om een challenge te starten.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dayLabel}>Dag {dayNumber}</Text>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
        </View>

        {/* Status row */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusEmoji}>{myCompletion ? '✅' : '⏳'}</Text>
            <Text style={styles.statusName}>{user?.name}</Text>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusItem}>
            <Text style={styles.statusEmoji}>{otherCompletion ? '✅' : '⏳'}</Text>
            <Text style={styles.statusName}>{otherUser?.name ?? '...'}</Text>
          </View>
        </View>

        {/* Progress bar */}
        {!myCompletion && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Voortgang</Text>
              <Text style={styles.progressCount}>{completedCount}/{activities.length}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct * 100}%` }]} />
            </View>
          </View>
        )}

        {/* Completed banner */}
        {myCompletion && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>🎉 Jij hebt dag {dayNumber} voltooid!</Text>
            {otherCompletion && <Text style={styles.bothText}>⭐ Jullie allebei! Geweldig!</Text>}
          </View>
        )}

        {/* Activities */}
        <Text style={styles.sectionTitle}>Activiteiten van vandaag</Text>
        <View style={styles.activities}>
          {activities.map(activity => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              progress={myProgress.find(p => p.activity_id === activity.id)}
              onToggle={handleToggleActivity}
              dayNumber={dayNumber}
            />
          ))}
        </View>

        {/* Manual complete button */}
        {!myCompletion && (
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualComplete}>
            <Ionicons name="checkmark-done" size={20} color="#6BCB77" />
            <Text style={styles.manualBtnText}>Dag handmatig als voltooid markeren</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noChallEmoji: { fontSize: 64, marginBottom: 16 },
  noChallengeText: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  noChallSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  dayLabel: { fontSize: 14, color: '#FF6B6B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  challengeTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 4 },
  statusRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16,
    padding: 16, alignItems: 'center',
  },
  statusItem: { flex: 1, alignItems: 'center', gap: 4 },
  statusEmoji: { fontSize: 28 },
  statusName: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  statusDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
  progressSection: { marginHorizontal: 20, marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  progressCount: { fontSize: 13, color: '#FF6B6B', fontWeight: '700' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#FF6B6B', borderRadius: 4 },
  completedBanner: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(107,203,119,0.15)', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: 'rgba(107,203,119,0.3)',
  },
  completedText: { fontSize: 16, fontWeight: '700', color: '#6BCB77', textAlign: 'center' },
  bothText: { fontSize: 14, color: '#FFE66D', textAlign: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: 'rgba(255,255,255,0.5)', marginHorizontal: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  activities: { marginHorizontal: 20, gap: 10 },
  manualBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginHorizontal: 20, marginTop: 24,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(107,203,119,0.4)', borderStyle: 'dashed',
  },
  manualBtnText: { color: '#6BCB77', fontWeight: '600', fontSize: 14 },
});
