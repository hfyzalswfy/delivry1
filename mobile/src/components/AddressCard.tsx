import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius, fontWeight } from '../theme/spacing';
import { ICONS } from '../constants/icons';

interface AddressCardProps {
  id: string;
  label: string | null;
  addressText: string;
  landmark: string | null;
  apartment: string | null;
  floor: string | null;
  notes: string | null;
  isDefault: boolean;
  selected?: boolean;
  onPress?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  readonly?: boolean;
}

export default function AddressCard({
  id, label, addressText, landmark, apartment, floor, notes, isDefault,
  selected, onPress, onEdit, onDelete, onSetDefault, readonly,
}: AddressCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
        selected && { borderWidth: 2 },
      ]}
      onPress={onPress ? () => onPress(id) : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <MaterialIcons name={label === 'Work' ? ICONS.work : label === 'Shop' ? ICONS.store : ICONS.home} size={fontSize.md} color={colors.primary} />
          <Text style={[styles.label, { color: colors.text }]}>{label || 'Address'}</Text>
          {isDefault && (
            <View style={[styles.defaultBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.defaultText, { color: colors.primaryDark }]}>Default</Text>
            </View>
          )}
        </View>
        {selected && <MaterialIcons name={ICONS.checkCircle} size={fontSize.lg} color={colors.primary} />}
      </View>

      <Text style={[styles.address, { color: colors.textSecondary }]}>{addressText}</Text>

      {landmark ? (
        <View style={styles.detailRow}>
          <MaterialIcons name={ICONS.location} size={fontSize.xs} color={colors.textTertiary} />
          <Text style={[styles.detail, { color: colors.textTertiary }]}>{landmark}</Text>
        </View>
      ) : null}

      {apartment || floor ? (
        <Text style={[styles.detail, { color: colors.textTertiary }]}>
          {[apartment, floor].filter(Boolean).join(', ')}
        </Text>
      ) : null}

      {notes ? (
        <Text style={[styles.notes, { color: colors.textTertiary }]}>{notes}</Text>
      ) : null}

      {!readonly && (
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(id)} style={styles.actionBtn}>
              <MaterialIcons name={ICONS.edit} size={fontSize.sm} color={colors.info} />
              <Text style={[styles.actionText, { color: colors.info }]}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(id)} style={styles.actionBtn}>
              <MaterialIcons name={ICONS.delete} size={fontSize.sm} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          )}
          {onSetDefault && !isDefault && (
            <TouchableOpacity onPress={() => onSetDefault(id)} style={styles.actionBtn}>
              <MaterialIcons name={ICONS.check} size={fontSize.sm} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Set as Default</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  defaultBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
  },
  defaultText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.semibold,
  },
  address: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  detail: {
    fontSize: fontSize.xs,
  },
  notes: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
