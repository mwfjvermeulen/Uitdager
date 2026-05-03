import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

const PIN_LENGTH = 4;

export default function LoginScreen() {
  const { login } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = async (digit: string) => {
    if (loading || pin.length >= PIN_LENGTH) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === PIN_LENGTH) {
      setLoading(true);
      const success = await login(newPin);
      if (success) {
        router.replace('/(tabs)');
      } else {
        setError(true);
        shake();
        if (Platform.OS !== 'web') Vibration.vibrate(400);
        setTimeout(() => {
          setPin('');
          setError(false);
          setLoading(false);
        }, 900);
      }
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['', '0', '⌫']];

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🏆</Text>
        <Text style={styles.title}>Uitdager</Text>
        <Text style={styles.subtitle}>Voer je pincode in</Text>

        <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
          {Array(PIN_LENGTH).fill(0).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < pin.length && (error ? styles.dotError : styles.dotFilled),
              ]}
            />
          ))}
        </Animated.View>

        {error && <Text style={styles.errorText}>Onjuiste pincode! ❌</Text>}
        {!error && <Text style={styles.errorText}> </Text>}

        <View style={styles.numpad}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.row}>
              {row.map((digit, di) => (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.key,
                    digit === '' && styles.keyInvisible,
                    digit === '⌫' && styles.keyDelete,
                  ]}
                  onPress={() => {
                    if (digit === '⌫') handleDelete();
                    else if (digit !== '') handlePress(digit);
                  }}
                  activeOpacity={0.6}
                  disabled={digit === ''}
                >
                  <Text style={[styles.keyText, digit === '⌫' && styles.deleteText]}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.hints}>
          <Text style={styles.hintText}>💪 Manon of Melvin?</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  emoji: { fontSize: 72, marginBottom: 8 },
  title: { fontSize: 38, fontWeight: '800', color: '#fff', letterSpacing: 3 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', marginTop: 6, marginBottom: 36 },
  dots: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  dotError: { backgroundColor: '#ff4444', borderColor: '#ff4444' },
  errorText: { color: '#ff6b6b', fontSize: 14, marginBottom: 16, height: 20 },
  numpad: { gap: 16 },
  row: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  key: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  keyInvisible: { backgroundColor: 'transparent', borderColor: 'transparent' },
  keyDelete: { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: 'rgba(255,107,107,0.3)' },
  keyText: { fontSize: 26, fontWeight: '600', color: '#fff' },
  deleteText: { fontSize: 22 },
  hints: { marginTop: 40, alignItems: 'center' },
  hintText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
