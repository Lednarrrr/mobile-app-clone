import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>
        This is a placeholder profile section. Replace with account details,
        preferences, and app info as needed.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardText}>Name: Guest</Text>
        <Text style={styles.cardText}>Plan: Free</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kitchen Preferences</Text>
        <Text style={styles.cardText}>Diet: None</Text>
        <Text style={styles.cardText}>Servings: 2</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>App</Text>
        <Text style={styles.cardText}>Version: 1.0.0</Text>
        <Text style={styles.cardText}>Offline-first prototype</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 16,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  cardText: {
    color: "#374151",
    fontSize: 14,
    marginTop: 4,
  },
});
