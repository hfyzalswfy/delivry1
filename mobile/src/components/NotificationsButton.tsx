import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export function NotificationsButton() {
  return (
    <Link href="/(app)/(notifications)" asChild>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.icon}>{'\u{1F514}'}</Text>
      </TouchableOpacity>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: { marginRight: 8, padding: 4 },
  icon: { fontSize: 20 },
});
