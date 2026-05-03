import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StatItem {
  emoji: string;
  label: string;
  value: string;
  color: string;
  sub?: string;
}

export default function StatsScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatItem[]>([]);
  const [challenge, setChallenge] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(useCallback(() => {
    loadStats();
  }, []));

  const loadStats = async () => {
    const { data: active } = await supabase
      .from('challenges').select('*').eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1);

    if (!active?.[0]) {
      setChallenge(null);
      setStats([]);
      setLoaded(true);
      return;
    }

    const ch = active[0];
    setChallenge(ch);

    const { data: allUsers } = await supabase.from('users').select('*');
    const { data: completions } = await supabase
      .from('daily_completions').select('*').eq('challenge_id', ch.id);
    const { data: actProg } = await supabase
      .from('activity_progress').select('*').eq('challenge_id', ch.id);

    if (!allUsers || !completions) { setLoaded(true); return; }

    const manon = allUsers.find(u => u.name === 'Manon');
    const melvin = allUsers.find(u => u.name === 'Melvin');

    const manonComps = completions.filter(c => c.user_id === manon?.id);
    const melvinComps = completions.filter(c => c.user_id === melvin?.id);

    const today = new Date();
    const start = new Date(ch.start_date);
    const daysPassed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.min(daysPassed, ch.duration_days);

    // Who finishes first each day
    let manonFirst = 0;
    let melvinFirst = 0;
    for (let d = 1; d <= currentDay; d++) {
      const mc = completions.find(c => c.day_number === d && c.user_id === manon?.id);
      const mv = completions.find(c => c.day_number === d && c.user_id === melvin?.id);
      if (mc && mv) {
        if (new Date(mc.completed_at) < new Date(mv.completed_at)) manonFirst++;
        else melvinFirst++;
      } else if (mc) manonFirst++;
      else if (mv) melvinFirst++;
    }

    // Missed days (days passed but not completed)
    const manonMissed = Math.max(0, currentDay - 1 - manonComps.length);
    const melvinMissed = Math.max(0, currentDay - 1 - melvinComps.length);

    // Both completed same day
    const bothDays = Array.from({ length: currentDay }, (_, i) => i + 1)
      .filter(d => completions.some(c => c.day_number === d && c.user_id === manon?.id) &&
                   completions.some(c => c.day_number === d && c.user_id === melvin?.id));

    // Current streaks
    const getStreak = (userComps: any[]) => {
      let streak = 0;
      for (let d = currentDay; d >= 1; d--) {
        if (userComps.some(c => c.day_number === d)) streak++;
        else break;
      }
      return streak;
    };

    const manonStreak = getStreak(manonComps);
    const melvinStreak = getStreak(melvinComps);

    // Completion percentages
    const manonPct = currentDay > 0 ? Math.round((manonComps.length / currentDay) * 100) : 0;
    const melvinPct = currentDay > 0 ? Math.round((melvinComps.length / currentDay) * 100) : 0;

    // Who has more
    const manonLeads = manonComps.length >= melvinComps.length;

    const computedStats: StatItem[] = [
      {
        emoji: '📅',
        label: 'Dag',
        value: `${currentDay} / ${ch.duration_days}`,
        color: '#4ECDC4',
        sub: `${ch.duration_days - currentDay} dagen te gaan`,
      },
      {
        emoji: '🥇',
        label: 'Meest als eerste klaar',
        value: manonFirst > melvinFirst ? 'Manon' : melvinFirst > manonFirst ? 'Melvin' : 'Gelijk!',
        color: '#FFE66D',
        sub: `Manon: ${manonFirst}x • Melvin: ${melvinFirst}x`,
      },
      {
        emoji: '✅',
        label: 'Voltooide dagen',
        value: `Manon ${manonComps.length} • Melvin ${melvinComps.length}`,
        color: '#6BCB77',
        sub: manonLeads ? 'Manon loopt voor! 💪' : 'Melvin loopt voor! 💪',
      },
      {
        emoji: '⭐',
        label: 'Samen voltooid',
        value: `${bothDays.length} dagen`,
        color: '#FF6B6B',
        sub: `${Math.round((bothDays.length / Math.max(currentDay, 1)) * 100)}% van de tijd samen`,
      },
      {
        emoji: '😬',
        label: 'Gemiste dagen',
        value: `Manon ${manonMissed}x • Melvin ${melvinMissed}x`,
        color: '#FF9F43',
        sub: manonMissed === 0 && melvinMissed === 0 ? 'Jullie zijn perfect! 🎉' : 'Bijhalen kan nog!',
      },
      {
        emoji: '🔥',
        label: 'Huidige streak',
        value: `Manon ${manonStreak}d • Melvin ${melvinStreak}d`,
        color: '#ee0979',
        sub: manonStreak > melvinStreak ? 'Manon is on fire! 🔥' : melvinStreak > manonStreak ? 'Melvin is on fire! 🔥' : 'Beiden even sterk!',
      },
      {
        emoji: '📊',
        label: 'Slagingspercentage',
        value: `${manonPct}% / ${melvinPct}%`,
        color: '#a18cd1',
        sub: `Manon ${manonPct}% • Melvin ${melvinPct}%`,
      },
    ];

    setStats(computedStats);
    setLoaded(true);
  };

  const onRefresh = async () => { setRefreshing(true); await loadStats(); setRefreshing(false); };

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>📊 Statistieken</Text>
          {challenge && <Text style={styles.subtitle}>{challenge.title}</Text>}
        </View>

        {!loaded && (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Laden...</Text>
          </View>
        )}

        {loaded && !challenge && (
          <View style={styles.centered}>
            <Text style={styles.noStatsEmoji}>📭</Text>
            <Text style={styles.noStatsText}>Nog geen challenge actief.</Text>
            <Text style={styles.noStatsSub}>Start een challenge om statistieken te zien!</Text>
          </View>
        )}

        {loaded && challenge && (
          <View style={styles.statsGrid}>
            {stats.map((stat, i) => (
              <View key={i} style={[styles.statCard, { borderLeftColor: stat.color }]}>
                <View style={styles.statTop}>
                  <Text style={styles.statEmoji}>{stat.emoji}</Text>
                  <View style={styles.statRight}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                    {stat.sub && <Text style={styles.statSub}>{stat.sub}</Text>}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Fun comparison section */}
        {loaded && challenge && (
          <View style={styles.comparisonCard}>
            <Text style={styles.compTitle}>👥 Jullie vs Jullie</Text>
            <View style={styles.compRow}>
              <View style={styles.compUser}>
                <Text style={styles.compName}>Manon</Text>
                <Text style={styles.compEmoji}>💃</Text>
              </View>
              <Text style={styles.compVs}>VS</Text>
              <View style={styles.compUser}>
                <Text style={styles.compEmoji}>🕺</Text>
                <Text style={styles.compName}>Melvin</Text>
              </View>
            </View>
            <Text style={styles.compMotivation}>
              {stats[1]?.value === 'Manon'
                ? 'Manon is de kampioen van het snel voltooien! 👸'
                : stats[1]?.value === 'Melvin'
                ? 'Melvin is de snelste! Goed bezig! 🤴'
                : 'Jullie zijn perfect op elkaar afgestemd! ❤️'}
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  noStatsEmoji: { fontSize: 64, marginBottom: 16 },
  noStatsText: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  noStatsSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8 },
  statsGrid: { paddingHorizontal: 20, gap: 12 },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statEmoji: { fontSize: 32 },
  statRight: { flex: 1 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  comparisonCard: {
    marginHorizontal: 20, marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  compTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 20 },
  compRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 16 },
  compUser: { alignItems: 'center', gap: 8 },
  compName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  compEmoji: { fontSize: 40 },
  compVs: { fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.3)' },
  compMotivation: { fontSize: 15, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
});
