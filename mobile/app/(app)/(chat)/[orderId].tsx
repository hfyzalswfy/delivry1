import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';
import { useConversation } from '../../../src/hooks/use-chat';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';

const roleConfig: Record<string, { label: string; emoji: string; color: string }> = {
  customer: { label: 'Customer', emoji: '\u{1F464}', color: '#8B5CF6' },
  driver: { label: 'Driver', emoji: '\u{1F69A}', color: '#10B981' },
  store: { label: 'Store', emoji: '\u{1F6D2}', color: '#F59E0B' },
  admin: { label: 'Admin', emoji: '\u{2699}\u{FE0F}', color: '#EF4444' },
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;

  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return timeStr;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${timeStr}`;

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function shouldGroup(a: string, b: string): boolean {
  return new Date(b).getTime() - new Date(a).getTime() < 5 * 60 * 1000;
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { messages, loading, sending, typingUsers, sendMessage, handleInputChange } = useConversation(orderId);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const otherTyping = typingUsers.filter((t) => t.profile_id !== user?.id);

  type GroupItem = { type: 'date'; label: string } | { type: 'group'; messages: typeof messages; sender: (typeof messages)[0]['sender'] };
  const groups = useMemo(() => {
    if (messages.length === 0) return [];
    const result: GroupItem[] = [];
    let currentDate = '';
    let currentGroup: typeof messages = [];
    let currentSenderId = '';

    const flush = () => {
      if (currentGroup.length > 0) {
        result.push({ type: 'group' as const, messages: [...currentGroup], sender: currentGroup[0].sender });
        currentGroup = [];
      }
    };

    for (const msg of messages) {
      const dateKey = getDateKey(msg.created_at);
      if (dateKey !== currentDate) {
        flush();
        currentDate = dateKey;
        result.push({ type: 'date' as const, label: formatDateSeparator(msg.created_at) });
        currentSenderId = '';
      }
      if (msg.sender_id !== currentSenderId || !shouldGroup(currentGroup[currentGroup.length - 1]?.created_at ?? msg.created_at, msg.created_at)) {
        flush();
        currentSenderId = msg.sender_id;
      }
      currentGroup.push(msg);
    }
    flush();
    return result;
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length, isAtBottom]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
  };

  const onInputChange = (text: string) => {
    setInput(text);
    handleInputChange(text);
  };

  const handleScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const bottomOffset = contentSize.height - layoutMeasurement.height - 60;
    setIsAtBottom(contentOffset.y >= bottomOffset);
  }, []);

  const otherParticipants = useMemo(() => {
    return messages
      .map((m) => m.sender)
      .filter((s, i, arr) => s && s.full_name !== profile?.full_name && arr.findIndex((x) => x?.full_name === s?.full_name) === i);
  }, [messages, profile?.full_name]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={S.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={S.header}>
        <View style={S.headerInfo}>
          <Text style={S.headerLabel}>ORDER</Text>
          {otherParticipants.length > 0 ? (
            <View style={S.headerParticipants}>
              <View style={[S.headerAvatar, { backgroundColor: roleConfig[otherParticipants[0]?.role ?? 'customer'].color + '20' }]}>
                <Text style={S.headerAvatarText}>{otherParticipants[0]?.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.headerName} numberOfLines={1}>
                  {roleConfig[otherParticipants[0]?.role ?? 'customer'].emoji} {otherParticipants[0]?.full_name}
                </Text>
                <Text style={S.headerOrder}>#{orderId?.slice(0, 8)}</Text>
              </View>
            </View>
          ) : (
            <Text style={S.headerOrder}>#{orderId?.slice(0, 8)}</Text>
          )}
        </View>
      </View>
      <KeyboardAvoidingView
        style={S.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={S.emptyChat}>
            <Text style={S.emptyChatIcon}>{'\u{1F4AC}'}</Text>
            <Text style={S.emptyChatTitle}>No messages yet</Text>
            <Text style={S.emptyChatSub}>Send a message to start the conversation</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={groups}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={S.messageList}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            renderItem={({ item }) => {
              if (item.type === 'date') {
                return (
                  <View style={S.dateSeparator}>
                    <View style={S.dateLine} />
                    <Text style={S.dateLabel}>{item.label}</Text>
                    <View style={S.dateLine} />
                  </View>
                );
              }

              const group = item.type === 'group' ? item : null;
              if (!group) return null;
              const firstMsg = group.messages[0];
              const isMine = firstMsg.sender_id === user?.id;
              const role = firstMsg.sender?.role ?? 'customer';
              const cfg = roleConfig[role] ?? roleConfig.customer;

              return (
                <View style={[S.groupContainer, isMine && S.groupContainerMine]}>
                  {!isMine && (
                    <View style={S.senderRow}>
                      <View style={[S.avatar, { backgroundColor: cfg.color + '25' }]}>
                        <Text style={S.avatarText}>{firstMsg.sender?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
                      </View>
                      <Text style={[S.roleLabel, { color: cfg.color }]}>
                        {cfg.emoji} {firstMsg.sender?.full_name ?? 'Unknown'}
                      </Text>
                    </View>
                  )}
                  {group.messages.map((msg: typeof firstMsg) => {
                    const isMineMsg = msg.sender_id === user?.id;
                    const bubbleBg = isMineMsg ? colors.primary : (cfg.color + '18');
                    const borderClr = isMineMsg ? 'transparent' : (cfg.color + '30');
                    const isLast = group.messages.indexOf(msg) === group.messages.length - 1;

                    return (
                      <View key={msg.id} style={[S.messageRow, isMineMsg && S.messageRowMine]}>
                        <View style={[S.bubble, { backgroundColor: bubbleBg, borderColor: borderClr }, isMineMsg ? S.bubbleMine : S.bubbleOther, !isLast && S.bubbleCompact]}>
                          <Text style={[S.messageText, isMineMsg && S.messageTextMine]}>
                            {msg.content}
                          </Text>
                          <View style={S.bubbleFooter}>
                            <Text style={[S.time, isMineMsg && S.timeMine]}>
                              {formatTime(msg.created_at)}
                            </Text>
                            {isMineMsg && (
                              <Text style={[S.status, isMineMsg && S.statusMine]}>
                                {'\u{2713}'}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            }}
            onContentSizeChange={() => {
              if (isAtBottom) flatListRef.current?.scrollToEnd({ animated: false });
            }}
          />
        )}

        {otherTyping.length > 0 && (
          <View style={S.typingIndicator}>
            <Text style={S.typingText}>
              {otherTyping.map((t) => t.full_name).join(', ')} {otherTyping.length === 1 ? 'is' : 'are'} typing{'\u{2026}'}
            </Text>
          </View>
        )}

        <View style={S.inputBar}>
          <TextInput
            style={S.textInput}
            value={input}
            onChangeText={onInputChange}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[S.sendButton, (!input.trim() || sending) && S.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={S.sendText}>{sending ? '\u{2022}\u{2022}\u{2022}' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerInfo: {},
  headerLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1 },
  headerParticipants: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  headerAvatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  headerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  headerOrder: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 1 },
  messageList: { padding: spacing.md, paddingBottom: spacing.sm },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  emptyChatIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyChatTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginBottom: spacing.xs },
  emptyChatSub: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center' },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dateLabel: { fontSize: fontSize.xs, color: colors.textTertiary, marginHorizontal: spacing.sm, fontWeight: '500' },
  groupContainer: { marginBottom: spacing.md, alignItems: 'flex-start' },
  groupContainerMine: { alignItems: 'flex-end' },
  senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  avatar: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: spacing.xs },
  avatarText: { fontSize: 10, fontWeight: '700', color: colors.text },
  roleLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  messageRow: { alignItems: 'flex-start' },
  messageRowMine: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1 },
  bubbleMine: { borderBottomRightRadius: borderRadius.sm },
  bubbleOther: { borderBottomLeftRadius: borderRadius.sm },
  bubbleCompact: { marginBottom: 2 },
  messageText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  messageTextMine: { color: '#fff' },
  bubbleFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  time: { fontSize: 11, color: colors.textTertiary },
  timeMine: { color: 'rgba(255,255,255,0.65)' },
  status: { fontSize: 11, marginLeft: 4 },
  statusMine: { color: 'rgba(255,255,255,0.8)' },
  typingIndicator: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.background },
  typingText: { fontSize: fontSize.xs, color: colors.textTertiary, fontStyle: 'italic' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  textInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, maxHeight: 100, backgroundColor: colors.background, marginRight: spacing.sm },
  sendButton: { backgroundColor: colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: fontSize.sm },
});
