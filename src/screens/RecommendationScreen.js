import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = ["All", "Ulam", "Sabaw", "Prito", "Gulay", "Ihaw", "Kakanin", "Other"];

export default function RecommendationScreen({ recommendations = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All"); 
  const [categoryFilter, setCategoryFilter] = useState("All"); 
  const [sortBy, setSortBy] = useState("best"); 

  const processedList = useMemo(() => {
    let result = [...recommendations];
    
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(lowerQuery));
    }

    if (sourceFilter === "Standard") {
      result = result.filter(item => !String(item.id).startsWith("custom_"));
    } else if (sourceFilter === "Custom") {
      result = result.filter(item => String(item.id).startsWith("custom_"));
    }

    if (categoryFilter !== "All") {
      result = result.filter(item => item.category === categoryFilter || (categoryFilter === "Other" && !CATEGORIES.includes(item.category)));
    }

    if (sortBy === "az") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "best") {
      result.sort((a, b) => {
        const aPercent = (a.matchCount / a.totalRequired) || 0;
        const bPercent = (b.matchCount / b.totalRequired) || 0;
        if (bPercent !== aPercent) return bPercent - aPercent;
        return b.matchCount - a.matchCount; 
      });
    }

    return result;
  }, [recommendations, searchQuery, sourceFilter, categoryFilter, sortBy]);

  const readyCount = processedList.filter(recipe => recipe.status === "Ready to Cook").length;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F5EE" }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroPanel}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles-outline" size={24} color="#f7f3ea" />
          </View>
          <View style={styles.heroTextGroup}>
            <Text style={styles.heroTitle}>What can I cook right now?</Text>
            <Text style={styles.heroText}>
              {processedList.length} matches found, {readyCount} ready to cook.
            </Text>
          </View>
        </View>

        <View style={styles.filterContainer}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            
            <View style={[styles.searchBox, { flex: 1 }]}>
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search recipes..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </Pressable>
              )}
            </View>

            <Pressable 
              style={[styles.advancedFilterBtn, isFilterMenuOpen && styles.advancedFilterBtnActive]} 
              onPress={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            >
              <Ionicons name="options" size={20} color={isFilterMenuOpen ? "#05943c" : "#111827"} />
            </Pressable>
            
          </View>

          {/* EXPANDING MENU */}
          {isFilterMenuOpen && (
            <View style={styles.advancedFilterMenu}>
              
              <Text style={styles.filterLabel}>Sort Algorithm</Text>
              <View style={styles.filterWrap}>
                <Pressable 
                  style={[styles.filterChip, sortBy === "best" && styles.filterChipActive]}
                  onPress={() => setSortBy("best")}
                >
                  <Ionicons name="sparkles" size={12} color={sortBy === "best" ? "#05943c" : "#4b5563"} style={{ marginRight: 4 }}/>
                  <Text style={[styles.filterChipText, sortBy === "best" && styles.filterChipTextActive]}>Best Match</Text>
                </Pressable>
                <Pressable 
                  style={[styles.filterChip, sortBy === "az" && styles.filterChipActive]}
                  onPress={() => setSortBy("az")}
                >
                  <Text style={[styles.filterChipText, sortBy === "az" && styles.filterChipTextActive]}>A-Z</Text>
                </Pressable>
              </View>

              <Text style={styles.filterLabel}>Recipe Source</Text>
              <View style={styles.filterWrap}>
                {["All", "Standard", "Custom"].map(source => (
                  <Pressable 
                    key={source} 
                    style={[styles.filterChip, sourceFilter === source && styles.filterChipActive]}
                    onPress={() => setSourceFilter(source)}
                  >
                    <Text style={[styles.filterChipText, sourceFilter === source && styles.filterChipTextActive]}>
                      {source === "Standard" ? "Built-in Menu" : source === "Custom" ? "My Recipes" : "Everything"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterLabel}>Dish Category</Text>
              <View style={styles.filterWrap}>
                {CATEGORIES.map(cat => (
                  <Pressable 
                    key={cat} 
                    style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                    onPress={() => setCategoryFilter(cat)}
                  >
                    <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </View>

            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.screenTitle}>Recipe matches</Text>
          <Text style={styles.screenSubtitle}>Dishes ranked by available stock and algorithm.</Text>
        </View>

        {processedList.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your advanced filters, searching for something else, or adding more ingredients to your pantry.
            </Text>
          </View>
        ) : (
          processedList.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function RecipeCard({ recipe }) {
  const isReady = recipe.status === "Ready to Cook";
  const matchPercent = recipe.totalRequired > 0 
    ? Math.round((recipe.matchCount / recipe.totalRequired) * 100) 
    : 0;

  return (
    <View style={styles.recipeCard}>
      <View style={styles.recipeTopRow}>
        <View style={styles.recipeNameGroup}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Text style={styles.recipeCategory}>
            {recipe.category || "Main"} | {recipe.prep_time_minutes || 30} min | {recipe.servings || 4} servings
          </Text>
        </View>

        <View style={[styles.statusPill, isReady ? styles.readyPill : styles.almostPill]}>
          <Ionicons
            name={isReady ? "checkmark-circle" : "alert-circle"}
            size={14}
            color={isReady ? "#1f6a45" : "#9a5b13"}
          />
          <Text style={[styles.statusPillText, isReady ? styles.readyPillText : styles.almostPillText]}>
            {isReady ? "Ready" : "Missing items"}
          </Text>
        </View>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Ingredient match ({recipe.matchCount}/{recipe.totalRequired})</Text>
        <Text style={styles.progressValue}>{matchPercent}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${matchPercent}%` }]} />
      </View>

      <View style={styles.recipeDetails}>
        <Text style={styles.detailText}>
          Check your shopping list tab to see exactly what ingredients you are missing for this dish!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100, paddingHorizontal: 16, paddingTop: 20 },
  heroPanel: { alignItems: "center", backgroundColor: "#1f6a45", borderRadius: 16, flexDirection: "row", gap: 13, marginBottom: 20, padding: 16, shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 3 },
  heroIcon: { alignItems: "center", backgroundColor: "#2f7d50", borderRadius: 12, height: 44, justifyContent: "center", width: 44 },
  heroTextGroup: { flex: 1 },
  heroTitle: { color: "#f7f3ea", fontSize: 18, fontWeight: "900" },
  heroText: { color: "#dcebdd", fontSize: 13, lineHeight: 18, marginTop: 3 },
  
  filterContainer: { marginBottom: 24 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: "#e5e7eb" },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: "#111827" },
  advancedFilterBtn: { width: 44, height: 44, backgroundColor: "#ffffff", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e7eb" },
  advancedFilterBtnActive: { backgroundColor: "#eefcf5", borderColor: "#05943c" },
  
  advancedFilterMenu: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  filterLabel: { fontSize: 12, fontWeight: "800", color: "#9ca3af", textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "transparent", marginBottom: 8 },
  filterChipActive: { backgroundColor: "#eefcf5", borderColor: "#05943c" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#4b5563" },
  filterChipTextActive: { color: "#05943c", fontWeight: "800" },

  sectionHeader: { marginBottom: 14 },
  screenTitle: { color: "#1c2a22", fontSize: 23, fontWeight: "900" },
  screenSubtitle: { color: "#69746c", fontSize: 14, lineHeight: 20, marginTop: 3 },
  
  recipeCard: { backgroundColor: "#ffffff", borderColor: "#e5e7eb", borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  recipeTopRow: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  recipeNameGroup: { flex: 1 },
  recipeName: { color: "#1c2a22", fontSize: 18, fontWeight: "900", textTransform: "capitalize" },
  recipeCategory: { color: "#7a8179", fontSize: 13, fontWeight: "700", marginTop: 3 },
  
  statusPill: { alignItems: "center", borderRadius: 8, flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingVertical: 7 },
  readyPill: { backgroundColor: "#e1f3e7" },
  almostPill: { backgroundColor: "#fff0d0" },
  statusPillText: { fontSize: 12, fontWeight: "900" },
  readyPillText: { color: "#1f6a45" },
  almostPillText: { color: "#9a5b13" },
  
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  progressLabel: { color: "#69746c", fontSize: 13, fontWeight: "800" },
  progressValue: { color: "#1c2a22", fontSize: 13, fontWeight: "900" },
  progressTrack: { backgroundColor: "#edf0ea", borderRadius: 8, height: 9, marginTop: 8, overflow: "hidden" },
  progressFill: { backgroundColor: "#2f7d50", borderRadius: 8, height: "100%" },
  
  recipeDetails: { borderTopColor: "#f0e7d8", borderTopWidth: 1, marginTop: 15, paddingTop: 13 },
  detailText: { color: "#69746c", fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  
  emptyPanel: { backgroundColor: "#ffffff", borderColor: "#e5e7eb", borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center', borderStyle: 'dashed' },
  emptyTitle: { color: "#1c2a22", fontSize: 16, fontWeight: "900", marginBottom: 5 },
  emptyText: { color: "#69746c", fontSize: 14, lineHeight: 21, textAlign: 'center' },
});