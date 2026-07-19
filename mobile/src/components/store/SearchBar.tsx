import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search' }: SearchBarProps) {
  const colors = useColors();

  return (
    <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <MaterialIcons name="search" size={20} color={colors.textTertiary} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <MaterialIcons name="close" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: fontSize.sm, paddingVertical: spacing.sm, marginLeft: spacing.xs },
});
