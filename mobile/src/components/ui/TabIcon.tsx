import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../theme/ThemeProvider';
import { IconName, ICONS } from '../../constants/icons';

interface TabIconProps {
  icon: IconName;
  focused?: boolean;
  size?: number;
}

export function TabIcon({ icon, focused, size = 22 }: TabIconProps) {
  const colors = useColors();
  return (
    <MaterialIcons
      name={ICONS[icon] as any}
      size={size}
      color={focused ? colors.primary : colors.textTertiary}
    />
  );
}
