import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

const PUSH_TOKEN_STORAGE_KEY = 'freshly_push_token';
const isExpoGo = Constants.appOwnership === 'expo';

type NotificationsModule = typeof import('expo-notifications');
type NotificationResponse = import('expo-notifications').NotificationResponse;

const getNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (isExpoGo) {
    return null;
  }

  try {
    return await import('expo-notifications');
  } catch (error) {
    console.warn('[push] Failed to load expo-notifications', error);
    return null;
  }
};

const getProjectId = (): string | undefined => {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    undefined
  );
};

export const isPushSupported = () => !isExpoGo;

export const getStoredPushToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const storePushToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
  } catch {
    // Best effort only.
  }
};

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  let finalStatus = permissions.status;

  if (finalStatus !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('[push] Missing EAS projectId; cannot create Expo push token.');
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    if (token) {
      await storePushToken(token);
      try {
        await api.put('/users/me/push-token', {
          expoPushToken: token,
        });
      } catch (error) {
        console.warn('[push] Failed to sync Expo push token to backend', error);
      }
    }
    return token || null;
  } catch (error) {
    console.warn('[push] Failed to fetch Expo push token', error);
    return null;
  }
};

export const subscribeToPushResponses = async (
  onResponse: (response: NotificationResponse) => void
): Promise<(() => void) | null> => {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
    // Foreground presentation is handled by the notification handler.
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onResponse);

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};
