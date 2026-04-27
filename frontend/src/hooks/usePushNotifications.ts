import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usersApi } from '../api/users';

export function usePushNotifications(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn || Platform.OS === 'web') return;
    registerForPushNotificationsAsync();
  }, [isLoggedIn]);
}

async function registerForPushNotificationsAsync() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getDevicePushTokenAsync();
    await usersApi.updateFcmToken(tokenData.data);
  } catch (e) {
    // expo-notifications 미설치 또는 에뮬레이터 환경에서 graceful skip
    console.debug('Push notification setup skipped:', e);
  }
}
