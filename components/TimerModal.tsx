import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  activityName: string;
  durationMinutes: number;
  onClose: () => void;
  onComplete: () => void;
}

export default function TimerModal({ visible, activityName, durationMinutes, onClose, onComplete }: Props) {
  const totalSeconds = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      setSecondsLeft(totalSeconds);
      setRunning(false);
      setDone(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [visible, totalSeconds]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            setDone(true);
            if (Platform.OS !== 'web') Vibration.vibrate([0, 300, 100, 300, 100, 300]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: secondsLeft / totalSeconds,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const progressColor = progressAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#ff4444', '#FFE66D', '#6BCB77'],
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.modal}>
          <Text style={styles.title}>{activityName}</Text>
          <Text style={styles.subtitle}>{durationMinutes} minuten timer</Text>

          {/* Circular progress indicator */}
          <View style={styles.timerContainer}>
            <View style={styles.timerRing}>
              <Animated.View
                style={[
                  styles.timerProgress,
                  { backgroundColor: done ? '#6BCB77' : '#FF6B6B' },
                ]}
              />
              <View style={styles.timerInner}>
                <Text style={[styles.timerText, done && styles.timerDone]}>
                  {done ? '🎉' : formatTime(secondsLeft)}
                </Text>
                {done && <Text style={styles.doneText}>Klaar!</Text>}
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: progressColor,
                },
              ]}
            />
          </View>

          <View style={styles.buttons}>
            {!done ? (
              <TouchableOpacity
                style={[styles.btn, running ? styles.btnPause : styles.btnPlay]}
                onPress={() => setRunning(r => !r)}
              >
                <Ionicons name={running ? 'pause' : 'play'} size={24} color="#fff" />
                <Text style={styles.btnText}>{running ? 'Pauzeer' : (secondsLeft === totalSeconds ? 'Start' : 'Hervat')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btn, styles.btnComplete]}
                onPress={() => { onComplete(); onClose(); }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.btnText}>Markeer als voltooid</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnClose} onPress={onClose}>
              <Text style={styles.btnCloseText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 32, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  timerContainer: { alignItems: 'center', marginBottom: 24 },
  timerRing: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 8, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  timerProgress: { position: 'absolute', width: '100%', height: '100%', borderRadius: 80, opacity: 0.15 },
  timerInner: { alignItems: 'center' },
  timerText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  timerDone: { fontSize: 48 },
  doneText: { fontSize: 20, fontWeight: '700', color: '#6BCB77', marginTop: 4 },
  progressBar: {
    height: 8, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 28,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  buttons: { gap: 12 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
  },
  btnPlay: { backgroundColor: '#FF6B6B' },
  btnPause: { backgroundColor: '#FFE66D' },
  btnComplete: { backgroundColor: '#6BCB77' },
  btnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  btnClose: { alignItems: 'center', paddingVertical: 12 },
  btnCloseText: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
});
