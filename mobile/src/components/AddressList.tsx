import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../theme/spacing';
import { ICONS } from '../constants/icons';
import AddressCard from './AddressCard';
import { EmptyState } from './ui/EmptyState';
import { LoadingScreen } from './ui/LoadingScreen';

interface AddressItem {
  id: string;
  label: string | null;
  address_text: string;
  landmark: string | null;
  apartment: string | null;
  floor: string | null;
  notes: string | null;
  is_default: boolean;
}

interface AddressListProps {
  addresses: AddressItem[];
  selectedId?: string;
  loading?: boolean;
  error?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  onAddNew?: () => void;
  readonly?: boolean;
}

export default function AddressList({
  addresses, selectedId, loading, error, emptyTitle, emptySubtitle,
  onSelect, onEdit, onDelete, onSetDefault, onAddNew, readonly,
}: AddressListProps) {
  const colors = useColors();

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialIcons name={ICONS.warning} size={fontSize.xl} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {onAddNew && (
        <TouchableOpacity
          style={[styles.addNewBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
          onPress={onAddNew}
        >
          <MaterialIcons name={ICONS.add} size={fontSize.md} color={colors.primary} />
          <Text style={[styles.addNewText, { color: colors.primary }]}>Add New Address</Text>
        </TouchableOpacity>
      )}

      {addresses.length === 0 ? (
        <EmptyState
          title={emptyTitle || 'No saved addresses'}
          subtitle={emptySubtitle || 'Add an address to get started'}
        />
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AddressCard
              id={item.id}
              label={item.label}
              addressText={item.address_text}
              landmark={item.landmark}
              apartment={item.apartment}
              floor={item.floor}
              notes={item.notes}
              isDefault={item.is_default}
              selected={selectedId === item.id}
              onPress={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onSetDefault={onSetDefault}
              readonly={readonly}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: spacing.md,
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addNewText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
