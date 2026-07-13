import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';

interface ConversationItem {
  id: string;
  order_id: string;
  order_number: string;
  other_party_name: string;
}

export function useConversations() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;

    const fetchConversations = async () => {
      setLoading(true);

      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', user.id);

      if (cancelled) return;

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map((p) => p.conversation_id);

      const { data: convs } = await supabase
        .from('conversations')
        .select('id, order_id')
        .in('id', convIds)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (!convs) {
        setLoading(false);
        return;
      }

      const orderIds = convs.map((c) => c.order_id);

      const { data: orders } = await supabase
        .from('delivery_orders')
        .select('id, order_number, customer_name')
        .in('id', orderIds);

      if (cancelled) return;

      const orderMap = new Map((orders || []).map((o) => [o.id, o]));

      const items: ConversationItem[] = convs.map((conv) => {
        const order = orderMap.get(conv.order_id);
        return {
          id: conv.id,
          order_id: conv.order_id,
          order_number: order?.order_number ?? '',
          other_party_name:
            profile.role === 'store'
              ? (order?.customer_name ?? 'Customer')
              : `Order #${order?.order_number ?? ''}`,
        };
      });

      setConversations(items);
      setLoading(false);
    };

    fetchConversations();

    return () => { cancelled = true; };
  }, [user?.id, profile?.id]);

  return { conversations, loading };
}
