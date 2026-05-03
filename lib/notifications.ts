import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from('users').update({ push_token: token }).eq('id', userId);

  return token;
}

export async function scheduleDailyReminder() {
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💪 Uitdager herinnering!',
      body: 'Vergeet je challenge van vandaag niet! Jij kan dit!',
      sound: true,
    },
    trigger: {
      hour: 19,
      minute: 0,
      repeats: true,
    },
  });
}

export async function sendCompletionNotification(otherUserToken: string, completedByName: string, dayNumber: number) {
  if (!otherUserToken) return;

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: otherUserToken,
      title: `⭐ ${completedByName} heeft dag ${dayNumber} voltooid!`,
      body: 'Snel jij ook! Jullie doen het geweldig samen! 🔥',
      sound: 'default',
    }),
  });
}
