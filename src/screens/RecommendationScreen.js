import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import STATIC_RECIPES from "../data/recipes.json";


export default function RecommendationScreen({ customRecipes = [] }) {
  // State to manage which list the user is currently viewing
  const [activeTab, setActiveTab] = useState("standard"); // 'standard' or 'custom'
 
  const displayRecipes = STATIC_RECIPES.slice(0, 10);


  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.screenTitle}>Cookbook</Text>
          <Text style={styles.screenSubtitle}>Manage and view all your karinderya recipes.</Text>
        </View>


        {/* --- THE SEGMENTED TOGGLE --- */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleButton, activeTab === "standard" && styles.toggleButtonActive]}
            onPress={() => setActiveTab("standard")}
          >
            <Text style={[styles.toggleText, activeTab === "standard" && styles.toggleTextActive]}>
              Standard Menu
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, activeTab === "custom" && styles.toggleButtonActive]}
            onPress={() => setActiveTab("custom")}
          >
            <Text style={[styles.toggleText, activeTab === "custom" && styles.toggleTextActive]}>
              My Recipes ({customRecipes.length})
            </Text>
          </Pressable>
        </View>


        {/* --- STANDARD MENU VIEW --- */}
        {activeTab === "standard" && (
          <View style={{ marginBottom: 24, marginTop: 16 }}>
            <View style={styles.badgeRow}>
              <Ionicons name="restaurant-outline" size={18} color="#2D6A4F" />
              <Text style={styles.badgeText}>Suggested Built-in Menu</Text>
            </View>
           
            {displayRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </View>
        )}


        {/* --- CUSTOM RECIPES VIEW --- */}
        {activeTab === "custom" && (
          <View style={{ marginBottom: 24, marginTop: 16 }}>
            <View style={styles.badgeRow}>
              <Ionicons name="book-outline" size={18} color="#d4a20b" />
              <Text style={[styles.badgeText, { color: '#d4a20b' }]}>Your Custom Creations</Text>
            </View>


            {customRecipes.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Ionicons name="book-outline" size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Custom Recipes Yet</Text>
                <Text style={styles.emptyText}>Tap the + button to teach the app your first custom dish!</Text>
              </View>
            ) : (
              customRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))
            )}
          </View>
        )}


      </ScrollView>
    </View>
  );
}


// Sub-component for individual recipe UI
function RecipeCard({ recipe }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.categoryBadge}>{recipe.category || "Main"}</Text>
      </View>
     
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.metaText}>{recipe.prep_time_minutes || 30} mins</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={styles.metaText}>{recipe.servings || 4} servings</Text>
        </View>
      </View>


      <View style={styles.progressBox}>
        <Text style={styles.progressText}>Ingredients required:</Text>
        <Text style={styles.ingredientListText}>
          {recipe.ingredients?.map(ing => {
            // Handle both JSON string format and our Custom Recipe object format
            if (typeof ing === 'string') return ing;
            if (ing.name) return `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim();
            return '';
          }).join(", ") || "Ingredients not listed"}
        </Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F5EE" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionHeader: { marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  screenSubtitle: { fontSize: 15, color: "#6b7280", marginTop: 4 },
 
  // Toggle Styles
  toggleContainer: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 4, borderRadius: 12, marginBottom: 8 },
  toggleButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleButtonActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  toggleTextActive: { color: '#111827', fontWeight: '800' },


  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  badgeText: { fontSize: 16, fontWeight: '800', color: '#2D6A4F' },
 
  card: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  recipeName: { fontSize: 18, fontWeight: "800", color: "#111827", flex: 1, textTransform: "capitalize" },
  categoryBadge: { backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: "700", color: "#4b5563", overflow: "hidden" },
 
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },


  progressBox: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  progressText: { fontSize: 13, fontWeight: "700", marginBottom: 4, color: "#4b5563" },
  ingredientListText: { fontSize: 13, color: "#6b7280", textTransform: "capitalize", lineHeight: 18 },


  emptyPanel: { alignItems: "center", justifyContent: "center", padding: 32, marginTop: 20, backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 },
});




