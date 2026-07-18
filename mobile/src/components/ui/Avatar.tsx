import { View, Text, StyleSheet, Image } from 'react-native';
import { spacing, fontSize } from '../../theme/spacing';
import { ROLE_COLORS } from '../../constants';

interface AvatarProps {
  name: string;
  role?: string;
  size?: number;
  avatarUrl?: string | null;
}

export function Avatar({ name, role, size = 44, avatarUrl }: AvatarProps) {
  const roleColor = ROLE_COLORS[role ?? ''] ?? '#64748B';
  const firstChar = name?.charAt(0)?.toUpperCase() ?? '?';
  const fontSize_ = size * 0.4;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: roleColor + '20' }]}>
      <Text style={[styles.text, { color: roleColor, fontSize: fontSize_ }]}>{firstChar}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { justifyContent: 'center', alignItems: 'center' },
  text: { fontWeight: '700' },
});
