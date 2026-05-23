import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { NAV_ITEMS } from "../constants";

export default function BottomNavigation({ activeScreen, onChangeScreen, onAddPress }) {
  const leftItems = NAV_ITEMS.slice(0, 2);
  const rightItems = NAV_ITEMS.slice(2);

  return (
    <View style={styles.bottomNav}>
      <View style={styles.navGroup}>
        {leftItems.map((item) => {
          const isActive = activeScreen === item.key;

          return (
            <Pressable
              key={item.key}
              style={[styles.navButton, isActive && styles.activeNavButton]}
              onPress={() => onChangeScreen(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? "#2D6A4F" : "#8b8f97"}
              />
              <Text
                style={[styles.navLabel, isActive && styles.activeNavLabel]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.centerAction} onPress={onAddPress}>
        <Ionicons name="add" size={26} color="#ffffff" />
      </Pressable>

      <View style={styles.navGroup}>
        {rightItems.map((item) => {
          const isActive = activeScreen === item.key;

          return (
            <Pressable
              key={item.key}
              style={[styles.navButton, isActive && styles.activeNavButton]}
              onPress={() => onChangeScreen(item.key)}
            >
              <Ionicons
                name={item.icon}
                size={22}
                color={isActive ? "#2D6A4F" : "#8b8f97"}
              />
              <Text
                style={[styles.navLabel, isActive && styles.activeNavLabel]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = {
  bottomNav: {
    alignItems: "center",
    backgroundColor: "#F8F5EE",
    borderRadius: 0,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "absolute",
    right: 0,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 4,
  },
  navGroup: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  navButton: {
    alignItems: "center",
    borderRadius: 14,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  activeNavButton: {
    backgroundColor: "transparent",
  },
  navLabel: {
    color: "#8b8f97",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
  },
  activeNavLabel: {
    color: "#2D6A4F",
  },
  centerAction: {
    alignItems: "center",
    backgroundColor: "#2D6A4F",
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    marginHorizontal: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    transform: [{ translateY: -22 }],
    width: 56,
  },
};
