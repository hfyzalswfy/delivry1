import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useConversations } from '../hooks/use-conversations';
import { colors } from '../theme/colors';
import { spacing, fontSize, borderRadius } from '../theme/spacing';

export default function ConversationsScreen() {
  const { conversations, loading } = useConversations();

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1 }} />;

  if (conversations.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No conversations yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={conversations}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Link href={`/(app)/(chat)/${item.order_id}`} asChild>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.orderNumber}>{item.other_party_name}</Text>
            <Text style={styles.orderSub}>Order #{item.order_number}</Text>
          </TouchableOpacity>
        </Link>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary },
  item: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  orderNumber: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  orderSub: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
});
