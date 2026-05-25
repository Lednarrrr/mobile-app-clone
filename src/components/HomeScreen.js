import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { TOP_DISHES } from "../constants";
import StatCard from "./StatCard";

export default function HomeScreen({
  ingredientsCount,
  readyCount,
  expiringSoonCount,
  shoppingCount,
  onGoToCook,
  onGoToInventory,
  onGoToBuy,
  onGoToSettings,
  onFilterPress,
  searchQuery,
  onSearchChange,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.homeHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandChip}>
            <Ionicons name="restaurant-outline" size={18} color="#ffffff" />
          </View>
          <View style={styles.brandTextGroup}>
            <Text style={styles.brandTitle}>Kusinera</Text>
            <Text style={styles.brandSubtitle}>
              Traditional Filipino kitchen assistant
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.shoppingButton} onPress={onGoToBuy}>
              <Ionicons name="cart-outline" size={20} color="#ffffff" />
            </Pressable>
            <Pressable
              style={styles.notificationButton}
              onPress={onGoToSettings}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#ffffff"
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.greeting}>Magandang Araw, Guest</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#2D6A4F" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#2D6A4F"
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          <Pressable style={styles.filterButton} onPress={onFilterPress}>
            <Ionicons name="options-outline" size={18} color="#2D6A4F" />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Stock" value={ingredientsCount} />
        <StatCard label="Ready To Cook" value={readyCount} />
        <StatCard label="Expiring Soon" value={expiringSoonCount} />
        <StatCard label="To Buy" value={shoppingCount} />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Top Dishes To Cook</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dishRow}
      >
        {TOP_DISHES.map((dish) => (
          <Pressable key={dish.id} style={styles.dishCard} onPress={onGoToCook}>
            <View style={[styles.dishArt, { backgroundColor: dish.colors[0] }]}>
              <View
                style={[
                  styles.dishArtAccent,
                  { backgroundColor: dish.colors[1] },
                ]}
              />
              <Ionicons name={dish.icon} size={28} color="#111827" />
            </View>
            <Text style={styles.dishName}>{dish.name}</Text>
            <Text style={styles.dishSubtitle}>{dish.subtitle}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
}

const styles = {
  homeScrollContent: {
    paddingBottom: 104,
  },
  homeHeader: {
    backgroundColor: "#2D6A4F",
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    margin: -2,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingTop: 12,
  },
  brandChip: {
    alignItems: "center",
    backgroundColor: "#E9C46A",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  brandTextGroup: {
    flex: 1,
    marginLeft: 10,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  brandSubtitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
    opacity: 0.8,
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  shoppingButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  greeting: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchInput: {
    color: "#2D6A4F",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  filterButton: {
    alignItems: "center",
    backgroundColor: "rgba(45, 106, 79, 0.1)",
    borderRadius: 8,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
  },
  dishRow: {
    gap: 12,
    paddingHorizontal: 16,
    paddingRight: 8,
  },
  dishCard: {
    width: 140,
  },
  dishArt: {
    alignItems: "center",
    borderRadius: 16,
    height: 100,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  dishArtAccent: {
    borderRadius: 999,
    height: 28,
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
  },
  dishName: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 8,
  },
  dishSubtitle: {
    color: "#8b8f97",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
};
