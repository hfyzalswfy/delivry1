import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth-store';
import { Messages, MessageType } from '../types/database';

interface ChatMessage extends Messages {
  sender?: { full_name: string; avatar_url: string | null; role: string };
}

interface TypingUser {
  profile_id: string;
  full_name: string;
  role: string;
}

export function useConversation(orderId: string | undefined) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileCacheRef = useRef<Map<string, { full_name: string; avatar_url: string | null; role: string }>>(new Map());

  const fetchSender = useCallback(async (profileId: string) => {
    const cached = profileCacheRef.current.get(profileId);
    if (cached !== undefined) return cached;
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role')
      .eq('id', profileId)
      .maybeSingle();
    if (data) profileCacheRef.current.set(profileId, data);
    return data ?? undefined;
  }, []);

  useEffect(() => {
    if (!orderId || !user || !profile) return;
    let cancelled = false;

    const loadMessages = async (convId: string) => {
      const { data: raw } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (!raw) { setLoading(false); return; }

      const uniqueIds = [...new Set(raw.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .in('id', uniqueIds);
      if (profiles) profiles.forEach((p) => profileCacheRef.current.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url, role: p.role }));

      const enriched = raw.map((msg) => ({ ...msg, sender: profileCacheRef.current.get(msg.sender_id) } as ChatMessage));
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

      const ch = supabase.channel(`chat:${convId}`, {
        config: { presence: { key: user.id } },
      });

      ch.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        async (payload) => {
          const newMsg = payload.new as Messages;
          const sender = await fetchSender(newMsg.sender_id);
          if (!cancelled) setMessages((prev) => [...prev, { ...newMsg, sender } as ChatMessage]);
        },
      );

      ch.on('presence', { event: 'sync' }, () => {
        if (cancelled) return;
        const state = ch.presenceState();
        const typing: TypingUser[] = [];
        for (const key of Object.keys(state)) {
          if (key === user.id) continue;
          const presences = state[key] as any[];
          for (const p of presences) {
            if (p.typing && p.profile_id) {
              typing.push({ profile_id: p.profile_id, full_name: p.full_name || 'Someone', role: p.role || 'customer' });
            }
          }
        }
        setTypingUsers(typing);
      });

      ch.on('presence', { event: 'join' }, ({ key }) => {
        if (key !== user.id && !cancelled) {
          setMessages((prev) => [...prev]);
        }
      });

      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && !cancelled) {
          await ch.track({
            profile_id: user.id,
            full_name: profile.full_name,
            role: profile.role,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [orderId, user?.id, profile?.id, fetchSender]);

  const sendMessage = async (content: string, messageType: MessageType = 'text') => {
    if (!conversationId || !user) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message_type: messageType,
      content,
    });
    if (error) console.error('sendMessage failed:', error.message);
    setSending(false);
  };

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current) return;
    await channelRef.current.track({
      profile_id: user?.id,
      full_name: profile?.full_name,
      role: profile?.role,
      typing: isTyping,
      online_at: new Date().toISOString(),
    });
  }, [user?.id, profile?.full_name, profile?.role]);

  const handleInputChange = useCallback((text: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setTyping(true);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 1500);
    return text;
  }, [setTyping]);

  return {
    conversationId,
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    setTyping,
    handleInputChange,
  };
}