import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAuthStore } from '../../../src/store/auth-store';
import { useConversation } from '../../../src/hooks/use-chat';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';

const roleConfig: Record<string, { label: string; emoji: string; color: string }> = {
  customer: { label: 'Customer', emoji: '👤', color: '#8B5CF6' },
  driver: { label: 'Driver', emoji: '🚚', color: '#10B981' },
  store: { label: 'Store', emoji: '🛒', color: '#F59E0B' },
  admin: { label: 'Admin', emoji: '⚙️', color: '#EF4444' },
};

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { messages, sendMessage } = useConversation(orderId);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const otherParticipants = messages
    .map((m) => m.sender)
    .filter((s, i, arr) => s && s.full_name !== profile?.full_name && arr.findIndex((x) => x?.full_name === s?.full_name) === i);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Order #{orderId?.slice(0, 8)}</Text>
          {otherParticipants.length > 0 && (
            <View style={styles.headerParticipants}>
              <View style={[styles.headerAvatar, { backgroundColor: roleConfig[otherParticipants[0]?.role ?? 'customer'].color + '20' }]}>
                <Text style={styles.headerAvatarText}>{otherParticipants[0]?.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.headerName}>
                {roleConfig[otherParticipants[0]?.role ?? 'customer'].emoji} {otherParticipants[0]?.full_name}
              </Text>
            </View>
          )}
        </View>
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => {
            const isMine = item.sender_id === user?.id;
            const role = item.sender?.role ?? 'customer';
            const cfg = roleConfig[role] ?? roleConfig.customer;
            const bubbleBg = isMine ? colors.primary : (cfg.color + '18');
            const borderClr = isMine ? 'transparent' : (cfg.color + '30');
            return (
              <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
                {!isMine && (
                  <View style={styles.senderRow}>
                    <View style={[styles.avatar, { backgroundColor: cfg.color + '25' }]}>
                      <Text style={styles.avatarText}>{item.sender?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
                    </View>
                    <Text style={[styles.roleLabel, { color: cfg.color }]}>
                      {cfg.emoji} {item.sender?.full_name ?? 'Unknown'}
                    </Text>
                  </View>
                )}
                <View style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: borderClr }, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                  <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                    {item.content}
                  </Text>
                  <Text style={[styles.time, isMine && styles.timeMine]}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} onPress={handleSend} disabled={!input.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderColor: colors.border },
  headerInfo: {},
  headerTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  headerParticipants: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  headerAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  headerAvatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  headerName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  messageList: { padding: spacing.md, paddingBottom: spacing.sm },
  messageRow: { marginBottom: spacing.md, alignItems: 'flex-start' },
  messageRowMine: { alignItems: 'flex-end' },
  senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  avatar: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: spacing.xs },
  avatarText: { fontSize: 10, fontWeight: '700', color: colors.text },
  roleLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  bubble: { maxWidth: '78%', borderRadius: borderRadius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1 },
  bubbleMine: { borderBottomRightRadius: borderRadius.sm },
  bubbleOther: { borderBottomLeftRadius: borderRadius.sm },
  messageText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  messageTextMine: { color: '#fff' },
  time: { fontSize: 11, color: colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.65)' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  textInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.md, maxHeight: 100, backgroundColor: colors.background, marginRight: spacing.sm },
  sendButton: { backgroundColor: colors.primary, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, justifyContent: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: fontSize.sm },
});
