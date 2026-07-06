import { useEffect } from 'react';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';

const isExpoGo = Constants.executionEnvironment === 'storeClient';

export function usePushToken() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user || isExpoGo) return;
    register();
  }, [user?.id]);

  const register = async () => {
    try {
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      if (!Device.default.isDevice) return;

      Notifications.default.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const { status: existingStatus } = await Notifications.default.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.default.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;

      const tokenData = await Notifications.default.getExpoPushTokenAsync();
      const token = tokenData.data;

      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('token', token)
        .single();

      if (!existing && user) {
        await supabase.from('push_tokens').insert({
          profile_id: user.id,
          token,
          platform: Platform.OS,
        });
      }

      if (Platform.OS === 'android') {
        await Notifications.default.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.default.AndroidImportance.MAX,
        });
      }
    } catch {
      /* expo-notifications not available (Expo Go) */
    }
  };
}
