import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function HomeScreen({
  ingredientsCount,
  readyCount,
  expiringSoonCount,
  shoppingCount = 0,
  customRecipes = [],
  onGoToCook,
  onGoToInventory,
  onGoToBuy,
  onGoToSettings,
  onEditRecipe,  
  onDeleteRecipe,
}) {
  const [isViewerVisible, setIsViewerVisible] = useState(false);


  function handleEditClick(recipe) {
    setIsViewerVisible(false);
    if (onEditRecipe) onEditRecipe(recipe);
  }


  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
     
      {/* --- FORCED NOTCH-SAFE GREEN HEADER --- */}
      <View style={styles.greenHeader}>
        <View>
          <Text style={styles.greeting}>Welcome back, Chef!</Text>
          <Text style={styles.subtitle}>Here is your karinderya overview today.</Text>
        </View>
        <Pressable onPress={onGoToSettings} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#ffffff" />
        </Pressable>
      </View>


      <View style={styles.bodyContent}>
       
        {/* QUICK STATS */}
        <View style={styles.statsGrid}>
          <Pressable style={styles.statCard} onPress={onGoToInventory}>
            <View style={[styles.iconWrapper, styles.box]}>
              <Ionicons name="cube-outline" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>{ingredientsCount}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </Pressable>
          <Pressable style={styles.statCard} onPress={onGoToCook}>
            <View style={[styles.iconWrapper, styles.meal]}>
              <Ionicons name="restaurant-outline" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>{readyCount}</Text>
            <Text style={styles.statLabel}>Ready Meals</Text>
          </Pressable>
          <Pressable style={styles.statCard} onPress={onGoToBuy}>
            <View style={[styles.iconWrapper, styles.cart]}>
              <Ionicons name="cart-outline" size={24} color="#ffffff" />
            </View>
            <Text style={styles.statNumber}>{shoppingCount}</Text>
            <Text style={styles.statLabel}>To Buy</Text>
          </Pressable>
          <View style={[styles.statCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <Ionicons name="alert-circle-outline" size={24} color="#dc2626" />
            <Text style={[styles.statNumber, { color: '#dc2626' }]}>{expiringSoonCount}</Text>
            <Text style={[styles.statLabel, { color: '#dc2626' }]}>Expiring Soon</Text>
          </View>
        </View>


        {/* CUSTOM RECIPES BANNER */}
        <Pressable style={styles.customRecipeBanner} onPress={() => setIsViewerVisible(true)}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="book" size={24} color="#ffffff" />
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>My Custom Cookbook</Text>
            <Text style={styles.bannerSubtitle}>View the {customRecipes.length} recipes you've added</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </Pressable>


        {/* QUICK ACTIONS */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionList}>
          <Pressable style={styles.actionItem} onPress={onGoToInventory}>
            <View style={[styles.actionIcon, { backgroundColor: '#eefcf5' }]}>
              <Ionicons name="list-outline" size={20} color="#2D6A4F" />
            </View>
            <Text style={styles.actionText}>Manage Pantry Inventory</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </Pressable>
         
          <Pressable style={styles.actionItem} onPress={onGoToBuy}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="cart-outline" size={20} color="#dc2626" />
            </View>
            <Text style={styles.actionText}>View Shopping List</Text>
            <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
          </Pressable>
        </View>
      </View>


      {/* --- VIEWER MODAL FOR CUSTOM RECIPES --- */}
      <Modal visible={isViewerVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <Pressable style={styles.modalClose} onPress={() => setIsViewerVisible(false)}>
              <Ionicons name="close" size={20} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>My Custom Recipes</Text>
            <View style={{ width: 32 }} />
          </View>


          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            {customRecipes.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Ionicons name="book-outline" size={48} color="#9ca3af" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No Custom Recipes Yet</Text>
                <Text style={styles.emptyText}>Tap the + button below to teach the app your first custom dish!</Text>
              </View>
            ) : (
              customRecipes.map((recipe) => (
                <View key={recipe.id} style={styles.recipeCard}>
                 
                  <View style={styles.recipeHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recipeName}>{recipe.name}</Text>
                      <Text style={styles.categoryBadge}>{recipe.category}</Text>
                    </View>
                   
                    <View style={styles.actionIconRow}>
                      <Pressable style={styles.iconBtn} onPress={() => handleEditClick(recipe)}>
                        <Ionicons name="pencil" size={20} color="#2D6A4F" />
                      </Pressable>
                      <Pressable style={styles.iconBtn} onPress={() => onDeleteRecipe(recipe.id)}>
                        <Ionicons name="trash-outline" size={20} color="#dc2626" />
                      </Pressable>
                    </View>
                  </View>
                 
                  <View style={styles.recipeMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{recipe.prep_time_minutes} mins</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{recipe.servings} servings</Text>
                    </View>
                  </View>


                  <View style={styles.ingredientBox}>
                    <Text style={styles.ingredientBoxTitle}>Ingredients:</Text>
                    {recipe.ingredients.map((ing, idx) => (
                      <Text key={idx} style={styles.ingredientLine}>
                        • {ing.quantity} {ing.unit} {ing.name}
                      </Text>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
 
  greenHeader: {
    backgroundColor: "#2D6A4F",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 60,
    alignItems: "flex-start",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },


  iconWrapper: { width: 44, height: 44, padding: 8, borderRadius: 60, alignItems: "center", justifyContent: "center" },
  box: { backgroundColor: "#2D6A4F"},
  meal: { backgroundColor: "#d4a20b"},
  cart: { backgroundColor: "#dc2626"},
  greeting: { fontSize: 26, fontWeight: "900", color: "#ffffff" },
  subtitle: { fontSize: 15, color: "#eefcf5", marginTop: 4 },
  settingsButton: { padding: 8, backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 999 },
  bodyContent: { paddingHorizontal: 16, marginTop: -20 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb", shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  statNumber: { fontSize: 28, fontWeight: "900", color: "#111827", marginTop: 12, marginBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  customRecipeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 32, borderWidth: 1, borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  bannerIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#d4a20b', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 2 },
  bannerSubtitle: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 12 },
  actionList: { gap: 12 },
  actionItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  actionIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  actionText: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  modalSafeArea: { flex: 1, backgroundColor: '#F8F5EE' },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  modalScrollContent: { padding: 16, paddingBottom: 40 },
  recipeCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" },
  recipeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  recipeName: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 4 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: "#f3f4f6", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, fontWeight: "700", color: "#4b5563", overflow: "hidden" },
  actionIconRow: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 6, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  recipeMetaRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  ingredientBox: { backgroundColor: "#f9fafb", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6" },
  ingredientBoxTitle: { fontSize: 13, fontWeight: "800", color: "#4b5563", marginBottom: 6 },
  ingredientLine: { fontSize: 14, color: "#111827", marginBottom: 4, textTransform: 'capitalize' },
  emptyPanel: { alignItems: "center", justifyContent: "center", padding: 32, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22 },
});

