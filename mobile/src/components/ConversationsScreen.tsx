import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useConversations } from '../hooks/use-conversations';
import { theme } from '../theme/driver-theme';

export default function ConversationsScreen() {
  const { conversations, loading } = useConversations();

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (conversations.length === 0) {
    return (
      <View style={S.empty}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>{'\u{1F4AC}'}</Text>
        <Text style={S.emptyTitle}>No conversations yet</Text>
        <Text style={S.emptySub}>Start a delivery to begin chatting</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      data={conversations}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => (
        <Link href={`/(app)/(chat)/${item.order_id}`} asChild>
          <TouchableOpacity style={S.item}>
            <View style={S.avatar}>
              <Text style={S.avatarText}>{(item.other_party_name?.charAt(0) || '?').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={S.name}>{item.other_party_name}</Text>
              <Text style={S.sub}>Order {item.order_number}</Text>
            </View>
            <Text style={S.arrow}>{'\u{203A}'}</Text>
          </TouchableOpacity>
        </Link>
      )}
    />
  );
}

const S = StyleSheet.create({
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.white,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: theme.card,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.greenDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.greenLight,
  },
  name: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.white,
    marginBottom: 2,
  },
  sub: {
    fontSize: theme.fontSize.sm,
    color: theme.gray,
  },
  arrow: {
    fontSize: theme.fontSize.xxl,
    color: theme.gray,
    marginLeft: 8,
  },
});
