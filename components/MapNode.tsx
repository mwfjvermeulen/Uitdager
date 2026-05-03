import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  day: number;
  x: number;
  y: number;
  myDone: boolean;
  otherDone: boolean;
  bothDone: boolean;
  isCurrent: boolean;
  isFuture: boolean;
  userName: string;
  otherName?: string;
}

export default function MapNode({ day, x, y, myDone, otherDone, bothDone, isCurrent, isFuture, userName, otherName }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isCurrent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.18, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isCurrent]);

  const getNodeColor = () => {
    if (bothDone) return ['#FFE66D', '#F7971E'];
    if (myDone && !otherDone) return ['#FF6B6B', '#ee0979'];
    if (!myDone && otherDone) return ['#4ECDC4', '#11998e'];
    if (isCurrent) return ['#a18cd1', '#fbc2eb'];
    return ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'];
  };

  const [c1, c2] = getNodeColor();

  const nodeContent = () => {
    if (bothDone) return '⭐';
    if (isFuture) return String(day);
    if (myDone || otherDone) return '✔️';
    return String(day);
  };

  return (
    <Animated.View
      style={[
        styles.nodeWrapper,
        { left: x, top: y },
        isCurrent && { transform: [{ scale: pulse }] },
      ]}
    >
      {/* Glow for current */}
      {isCurrent && (
        <Animated.View
          style={[
            styles.glow,
            { transform: [{ scale: pulse }] },
          ]}
        />
      )}

      <View
        style={[
          styles.node,
          { backgroundColor: c1, shadowColor: c1 },
          isFuture && styles.nodeFuture,
        ]}
      >
        <Text style={[styles.nodeText, isFuture && styles.nodeTextFuture]}>
          {nodeContent()}
        </Text>
      </View>

      {/* Avatar indicators */}
      <View style={styles.avatars}>
        {myDone && (
          <View style={[styles.avatar, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.avatarText}>{userName[0]}</Text>
          </View>
        )}
        {otherDone && otherName && (
          <View style={[styles.avatar, { backgroundColor: '#4ECDC4' }]}>
            <Text style={styles.avatarText}>{otherName[0]}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.dayLabel, isFuture && styles.dayLabelFuture]}>Dag {day}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nodeWrapper: {
    position: 'absolute',
    width: 64,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(161,140,209,0.25)',
    top: -8,
    left: -8,
  },
  node: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  nodeFuture: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  nodeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  nodeTextFuture: {
    color: 'rgba(255,255,255,0.5)',
  },
  avatars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  dayLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontWeight: '600',
  },
  dayLabelFuture: {
    color: 'rgba(255,255,255,0.25)',
  },
});
