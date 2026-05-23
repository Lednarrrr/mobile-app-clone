import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { getStatAccent, getStatIcon } from "../utils/helpers";

export default function StatCard({ label, value }) {
  const iconName = getStatIcon(label);
  const accentColor = getStatAccent(label);

  return (
    <View style={styles.statCardModern}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIconWrap, { backgroundColor: accentColor }]}>
          <Ionicons name={iconName} size={22} color="#111827" />
        </View>
        <Text style={styles.statValueInline}>{value}</Text>
      </View>
      <Text style={styles.statLabelModern}>{label}</Text>
    </View>
  );
}

const styles = {
  statCardModern: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#edf0f4",
    minHeight: 102,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "48%",
    alignItems: "flex-start",
    justifyContent: "center",
    shadowColor: "#111827",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  statTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-start",
  },
  statIconWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  statValueInline: {
    color: "#0f1724",
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 38,
  },
  statLabelModern: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "left",
  },
};
