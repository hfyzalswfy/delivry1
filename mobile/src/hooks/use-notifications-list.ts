import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { Notifications as NotifType } from '../types/database';

export function useNotificationsList() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<NotifType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelKeyRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const init = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (data && !cancelled) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read_at).length);
      }
      if (cancelled) { setLoading(false); return; }

      const key = ++channelKeyRef.current;
      const channel = supabase.channel(`notifications-${user.id}-${key}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` },
          (payload) => {
            if (cancelled) return;
            const newNotif = payload.new as NotifType;
            setNotifications((prev) => [newNotif, ...prev]);
            if (!newNotif.read_at) setUnreadCount((c) => c + 1);
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` },
          (payload) => {
            if (cancelled) return;
            const updated = payload.new as NotifType;
            setNotifications((prev) => prev.map((n) => n.id === updated.id ? updated : n));
            setUnreadCount((prev) => Math.max(0, data ? data.filter((n) => !n.read_at).length : 0));
          },
        )
        .subscribe();

      channelRef.current = channel;
      if (!cancelled) setLoading(false);
    };

    init();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const markAsRead = async (notifId: string) => {
    const now = new Date().toISOString();
    await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('id', notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read_at: now } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return { notifications, unreadCount, loading, markAsRead };
}
