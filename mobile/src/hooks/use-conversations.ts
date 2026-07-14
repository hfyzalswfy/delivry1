import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';

export interface OtherParty {
  profile_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

export interface LastMessage {
  content: string;
  created_at: string;
  sender_id: string;
}

export interface ConversationItem {
  id: string;
  order_id: string;
  order_number: string;
  other_party: OtherParty | null;
  last_message: LastMessage | null;
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

      const [{ data: orders }, { data: allMessages }, { data: otherParticipants }] = await Promise.all([
        supabase.from('delivery_orders').select('id, order_number, customer_name').in('id', orderIds),
        supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('conversation_participants')
          .select('conversation_id, profile_id, participant_role')
          .in('conversation_id', convIds)
          .neq('profile_id', user.id),
      ]);

      if (cancelled) return;

      const orderMap = new Map((orders || []).map((o) => [o.id, o]));
      const lastMsgMap = new Map<string, LastMessage>();
      for (const msg of allMessages || []) {
        if (!lastMsgMap.has(msg.conversation_id)) {
          lastMsgMap.set(msg.conversation_id, { content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id });
        }
      }

      const otherProfileIds = [...new Set((otherParticipants || []).map((p) => p.profile_id))];
      const { data: otherProfiles } = otherProfileIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, avatar_url, role').in('id', otherProfileIds)
        : { data: [] };
      const profileMap = new Map((otherProfiles || []).map((p) => [p.id, p]));

      const otherPartyMap = new Map<string, OtherParty>();
      (otherParticipants || []).forEach((p) => {
        const prof = profileMap.get(p.profile_id);
        if (prof) {
          otherPartyMap.set(p.conversation_id, {
            profile_id: prof.id,
            full_name: prof.full_name,
            avatar_url: prof.avatar_url,
            role: prof.role,
          });
        }
      });

      const items: ConversationItem[] = convs.map((conv) => {
        const order = orderMap.get(conv.order_id);
        return {
          id: conv.id,
          order_id: conv.order_id,
          order_number: order?.order_number ?? '',
          other_party: otherPartyMap.get(conv.id) ?? null,
          last_message: lastMsgMap.get(conv.id) ?? null,
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
