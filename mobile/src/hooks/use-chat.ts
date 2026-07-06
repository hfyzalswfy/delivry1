import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { Messages, MessageType } from '../types/database';

interface ChatMessage extends Messages {
  sender?: { full_name: string; avatar_url: string | null; role: string };
}

export function useConversation(orderId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!orderId || !user || !profile) return;
    let cancelled = false;

    const senderCache = new Map<string, { full_name: string; avatar_url: string | null; role: string }>();

    const fetchSender = async (profileId: string) => {
      const cached = senderCache.get(profileId);
      if (cached !== undefined) return cached;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('id', profileId)
        .maybeSingle();
      if (data) senderCache.set(profileId, data);
      return data ?? undefined;
    };

    const loadMessages = async (convId: string) => {
      const { data: raw } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (!raw) { if (cancelled) return; if (convId) setLoading(false); return; }

      const uniqueIds = [...new Set(raw.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', uniqueIds);
      if (profiles) profiles.forEach((p) => senderCache.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url, role: p.role }));

      const enriched = raw.map((msg) => ({ ...msg, sender: senderCache.get(msg.sender_id) } as ChatMessage));
      if (!cancelled) setMessages(enriched);
    };

    const init = async () => {
      const { data: convId, error: convError } = await supabase.rpc('ensure_conversation', {
        p_order_id: orderId,
        p_profile_id: user.id,
        p_participant_role: profile.role,
      });

      if (convError || !convId) {
        console.error('ensure_conversation failed:', convError?.message);
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) { setLoading(false); return; }
      if (!cancelled) setConversationId(convId);
      await loadMessages(convId);
      if (cancelled) { channelRef.current = null; setLoading(false); return; }

      const ch = supabase.channel(`messages:${convId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
          async (payload) => {
            const newMsg = payload.new as Messages;
            const sender = await fetchSender(newMsg.sender_id);
            if (!cancelled) setMessages((prev) => [...prev, { ...newMsg, sender } as ChatMessage]);
          },
        )
        .subscribe();

      if (cancelled) { supabase.removeChannel(ch); channelRef.current = null; setLoading(false); return; }
      channelRef.current = ch;
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
  }, [orderId, user?.id, profile?.id]);

  const sendMessage = async (content: string, messageType: MessageType = 'text') => {
    if (!conversationId || !user) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: messageType,
      content,
    });
    if (error) console.error('sendMessage failed:', error.message);
  };

  return { conversationId, messages, loading, sendMessage };
}
