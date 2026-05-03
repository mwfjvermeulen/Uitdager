import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Challenge, DailyCompletion } from '../../types';
import MapNode from '../../components/MapNode';
import CreateChallengeModal from '../../components/CreateChallengeModal';

const { width } = Dimensions.get('window');
const NODE_SIZE = 64;
const SPACING = 110;

const PATH_COLS = [width * 0.18, width * 0.5, width * 0.82];
const getCol = (i: number) => {
  const pattern = [0, 1, 2, 1];
  return PATH_COLS[pattern[i % 4]];
};

export default function MapScreen() {
  const { user, logout } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<Challenge | null>(null);
  const [completions, setCompletions] = useState<DailyCompletion[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    loadAll();
    const sub = supabase
      .channel('map')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_completions' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, loadAll)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, []));

  const loadAll = async () => {
    const { data: users } = await supabase.from('users').select('*').neq('id', user!.id);
    setOtherUser(users?.[0] ?? null);

    const { data: active } = await supabase
      .from('challenges').select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    setChallenge(active?.[0] ?? null);

    if (!active?.[0]) {
      const { data: pending } = await supabase
        .from('challenges').select('*')
        .eq('status', 'proposed')
        .order('created_at', { ascending: false })
        .limit(1);
      setPendingChallenge(pending?.[0] ?? null);
    } else {
      setPendingChallenge(null);
      const { data: comps } = await supabase
        .from('daily_completions').select('*')
        .eq('challenge_id', active[0].id);
      setCompletions(comps ?? []);
    }
  };

  const onRefresh = async () => { setRefreshing(true); await loadAll(); setRefreshing(false); };

  const handleApprove = async () => {
    if (!pendingChallenge) return;
    const isManon = user!.name === 'Manon';
    const update = isManon
      ? { manon_approved: true }
      : { melvin_approved: true };

    const bothApproved =
      (isManon && pendingChallenge.melvin_approved) ||
      (!isManon && pendingChallenge.manon_approved);

    const finalUpdate = bothApproved
      ? { ...update, status: 'active', start_date: new Date().toISOString().split('T')[0] }
      : update;

    await supabase.from('challenges').update(finalUpdate).eq('id', pendingChallenge.id);
    loadAll();
  };

  const handleReject = async () => {
    Alert.alert('Challenge afwijzen', 'Weet je zeker dat je de challenge wil afwijzen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Afwijzen', style: 'destructive',
        onPress: async () => {
          await supabase.from('challenges').update({ status: 'cancelled' }).eq('id', pendingChallenge!.id);
          loadAll();
        },
      },
    ]);
  };

  const getCurrentDay = () => {
    if (!challenge?.start_date) return 0;
    const start = new Date(challenge.start_date);
    const today = new Date();
    const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(diff, challenge.duration_days));
  };

  const isDayDone = (day: number, uid: string) =>
    completions.some(c => c.day_number === day && c.user_id === uid);

  const currentDay = getCurrentDay();

  if (!challenge && !pendingChallenge) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyTitle}>Geen actieve challenge</Text>
          <Text style={styles.emptyText}>Stel een nieuwe maandelijkse challenge voor!</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.createBtnText}>Challenge aanmaken</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Uitloggen ({user?.name})</Text>
          </TouchableOpacity>
        </View>
        <CreateChallengeModal
          visible={showCreate}
          user={user!}
          onClose={() => setShowCreate(false)}
          onCreated={loadAll}
        />
      </LinearGradient>
    );
  }

  if (pendingChallenge && !challenge) {
    const isManonApproved = pendingChallenge.manon_approved;
    const isMelvinApproved = pendingChallenge.melvin_approved;
    const myName = user!.name;
    const myApproved = myName === 'Manon' ? isManonApproved : isMelvinApproved;

    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
        <View style={styles.pendingContainer}>
          <Text style={styles.pendingEmoji}>⏳</Text>
          <Text style={styles.pendingTitle}>Challenge in afwachting</Text>
          <View style={styles.pendingCard}>
            <Text style={styles.pendingChallengeTitle}>{pendingChallenge.title}</Text>
            {pendingChallenge.description ? (
              <Text style={styles.pendingDesc}>{pendingChallenge.description}</Text>
            ) : null}
            <Text style={styles.pendingDays}>📅 {pendingChallenge.duration_days} dagen</Text>

            <View style={styles.approvals}>
              <View style={styles.approvalItem}>
                <Text style={styles.approvalEmoji}>{isManonApproved ? '✅' : '⏳'}</Text>
                <Text style={styles.approvalName}>Manon</Text>
              </View>
              <View style={styles.approvalItem}>
                <Text style={styles.approvalEmoji}>{isMelvinApproved ? '✅' : '⏳'}</Text>
                <Text style={styles.approvalName}>Melvin</Text>
              </View>
            </View>
          </View>

          {!myApproved ? (
            <View style={styles.approveRow}>
              <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
                <Text style={styles.approveBtnText}>✅ Akkoord</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                <Text style={styles.rejectBtnText}>❌ Afwijzen</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.waitingText}>Wachten op {myName === 'Manon' ? 'Melvin' : 'Manon'}...</Text>
          )}

          <TouchableOpacity style={styles.createAltBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.createAltText}>Nieuw voorstel doen</Text>
          </TouchableOpacity>
        </View>
        <CreateChallengeModal
          visible={showCreate}
          user={user!}
          onClose={() => setShowCreate(false)}
          onCreated={loadAll}
        />
      </LinearGradient>
    );
  }

  if (!challenge) return null;

  const days = Array.from({ length: challenge.duration_days }, (_, i) => i + 1);
  const totalHeight = days.length * SPACING + 200;

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{challenge.title}</Text>
          <Text style={styles.headerSub}>Dag {currentDay} van {challenge.duration_days}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.avatarBtn}>
          <Text style={styles.avatarText}>{user?.name[0]}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ height: totalHeight }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
        onLayout={() => {
          const targetY = totalHeight - currentDay * SPACING - 200;
          scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
        }}
      >
        {/* Path lines between nodes */}
        {days.map((day, i) => {
          if (i === 0) return null;
          const fromX = getCol(i - 1) - 4;
          const toX = getCol(i) - 4;
          const fromY = totalHeight - i * SPACING - 50;
          const toY = totalHeight - (i + 1) * SPACING - 50;
          const done = isDayDone(day - 1, user!.id) && (otherUser ? isDayDone(day - 1, otherUser.id) : true);
          return (
            <View
              key={`p${i}`}
              style={[
                styles.pathLine,
                {
                  left: Math.min(fromX, toX) + NODE_SIZE / 2,
                  top: toY + NODE_SIZE,
                  width: Math.abs(fromX - toX) + 8,
                  height: fromY - toY,
                  backgroundColor: done ? '#FFE66D40' : 'rgba(255,255,255,0.08)',
                },
              ]}
            />
          );
        })}

        {/* Map nodes */}
        {days.map((day, i) => {
          const x = getCol(i);
          const y = totalHeight - (i + 1) * SPACING - 50;
          const myDone = isDayDone(day, user!.id);
          const otherDone = otherUser ? isDayDone(day, otherUser.id) : false;
          return (
            <MapNode
              key={day}
              day={day}
              x={x - NODE_SIZE / 2}
              y={y}
              myDone={myDone}
              otherDone={otherDone}
              bothDone={myDone && otherDone}
              isCurrent={day === currentDay}
              isFuture={day > currentDay}
              userName={user!.name}
              otherName={otherUser?.name}
            />
          );
        })}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.legendLabel}>{user?.name}</Text>
        </View>
        {otherUser && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
            <Text style={styles.legendLabel}>{otherUser.name}</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFE66D' }]} />
          <Text style={styles.legendLabel}>⭐ Samen</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pathLine: { position: 'absolute', borderRadius: 4 },
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  // Empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 80, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyText: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FF6B6B', paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 20,
  },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  logoutBtn: { marginTop: 20 },
  logoutText: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  // Pending state
  pendingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pendingEmoji: { fontSize: 60, marginBottom: 12 },
  pendingTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 20 },
  pendingCard: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    padding: 24, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  pendingChallengeTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8 },
  pendingDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12 },
  pendingDays: { fontSize: 15, color: '#4ECDC4', fontWeight: '600', marginBottom: 20 },
  approvals: { flexDirection: 'row', gap: 24, justifyContent: 'center' },
  approvalItem: { alignItems: 'center', gap: 4 },
  approvalEmoji: { fontSize: 28 },
  approvalName: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  approveRow: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  approveBtn: {
    flex: 1, backgroundColor: '#6BCB77', paddingVertical: 16,
    borderRadius: 16, alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rejectBtn: {
    flex: 1, backgroundColor: 'rgba(255,107,107,0.2)', paddingVertical: 16,
    borderRadius: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#FF6B6B',
  },
  rejectBtnText: { color: '#FF6B6B', fontWeight: '800', fontSize: 16 },
  waitingText: { marginTop: 20, color: 'rgba(255,255,255,0.5)', fontSize: 15, fontStyle: 'italic' },
  createAltBtn: { marginTop: 16 },
  createAltText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, textDecorationLine: 'underline' },
});
