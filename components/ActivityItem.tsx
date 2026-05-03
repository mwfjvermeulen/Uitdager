import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ChallengeActivity, ActivityProgress } from '../types';
import TimerModal from './TimerModal';

interface Props {
  activity: ChallengeActivity;
  progress?: ActivityProgress;
  onToggle: (activityId: string, completed: boolean) => void;
  dayNumber: number;
}

export default function ActivityItem({ activity, progress, onToggle, dayNumber }: Props) {
  const [showTimer, setShowTimer] = useState(false);
  const completed = progress?.completed ?? false;

  const handleToggle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(activity.id, !completed);
  };

  const isTimedActivity = !!activity.duration_minutes;

  const getLabel = () => {
    if (isTimedActivity) {
      return `${activity.duration_minutes} min`;
    }
    if (activity.target_count) {
      return `${activity.target_count}x ${activity.unit}`;
    }
    return activity.unit;
  };

  return (
    <>
      <View style={[styles.container, completed && styles.containerDone]}>
        <TouchableOpacity
          style={[styles.checkbox, completed && styles.checkboxDone]}
          onPress={handleToggle}
          activeOpacity={0.7}
        >
          {completed && <Ionicons name="checkmark" size={20} color="#fff" />}
        </TouchableOpacity>

        <View style={styles.info}>
          <Text style={[styles.name, completed && styles.nameDone]}>{activity.name}</Text>
          <Text style={styles.label}>{getLabel()}</Text>
        </View>

        {isTimedActivity && (
          <TouchableOpacity
            style={styles.timerBtn}
            onPress={() => setShowTimer(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="timer-outline" size={20} color="#4ECDC4" />
            <Text style={styles.timerBtnText}>Timer</Text>
          </TouchableOpacity>
        )}
      </View>

      {isTimedActivity && (
        <TimerModal
          visible={showTimer}
          activityName={activity.name}
          durationMinutes={activity.duration_minutes!}
          onClose={() => setShowTimer(false)}
          onComplete={() => {
            setShowTimer(false);
            if (!completed) onToggle(activity.id, true);
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  containerDone: {
    backgroundColor: 'rgba(107,203,119,0.12)',
    borderColor: 'rgba(107,203,119,0.3)',
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#6BCB77',
    borderColor: '#6BCB77',
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  nameDone: { color: 'rgba(255,255,255,0.5)', textDecorationLine: 'line-through' },
  label: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(78,205,196,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(78,205,196,0.3)',
  },
  timerBtnText: { fontSize: 13, fontWeight: '600', color: '#4ECDC4' },
});
