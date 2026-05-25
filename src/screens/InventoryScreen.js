import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateIngredient, deleteIngredient } from "../database/inventoryDatabase";

export default function InventoryScreen({ ingredients, onInventoryChange }) {
  // State for the Edit Modal
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editUnit, setEditUnit] = useState("");

  // 1. Opens the modal and loads the current data
  function handleEditIngredient(item) {
    setEditingItem(item);
    setEditQty(item.quantity ? String(item.quantity) : "");
    setEditUnit(item.unit || "");
  }

  // 2. Saves the changes to SQLite and refreshes the app
  function handleSaveEdit() {
    try {
      updateIngredient(
        editingItem.id,
        editingItem.name, // Keep the canonical name
        editQty,
        editUnit,
        editingItem.category,
        editingItem.expiry_date
      );
      
      setEditingItem(null);
      onInventoryChange(); // <-- This tells App.js to rebuild the Reverse Index!
    } catch (error) {
      console.error("Failed to update ingredient:", error);
    }
  }

  // 3. Deletes the item from SQLite and refreshes the app
  function handleDelete() {
    Alert.alert(
      "Delete Ingredient",
      `Are you sure you want to remove ${editingItem.name} from your pantry?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              deleteIngredient(editingItem.id);
              setEditingItem(null);
              onInventoryChange(); // <-- Keeps the Cook tab perfectly in sync
            } catch (error) {
              console.error("Failed to delete ingredient:", error);
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.screenTitle}>Pantry Inventory</Text>
          <Text style={styles.screenSubtitle}>Manage your current stock and ingredients.</Text>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Your pantry is empty</Text>
            <Text style={styles.emptyText}>Tap the + button below to add your first ingredient.</Text>
          </View>
        ) : (
          ingredients.map((item) => (
            <Pressable 
              key={item.id} 
              style={styles.inventoryItem} 
              onPress={() => handleEditIngredient(item)} // <-- THIS IS THE FIX
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemMeta}>
                  {item.category || "Uncategorized"} 
                  {item.expiry_date ? ` • Exp: ${item.expiry_date}` : ""}
                </Text>
              </View>
              <View style={styles.itemAmountWrap}>
                <Text style={styles.itemQty}>{item.quantity || "-"}</Text>
                <Text style={styles.itemUnit}>{item.unit || ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={{ marginLeft: 8 }} />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* --- EDIT / DELETE MODAL --- */}
      <Modal visible={!!editingItem} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setEditingItem(null)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {editingItem?.name}</Text>
              <Pressable onPress={() => setEditingItem(null)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={editQty}
                  onChangeText={setEditQty}
                  keyboardType="numeric"
                  placeholder="e.g., 2"
                />
              </View>
              <View style={styles.formCol}>
                <Text style={styles.label}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={editUnit}
                  onChangeText={setEditUnit}
                  placeholder="e.g., kg"
                />
              </View>
            </View>

            <View style={styles.buttonRow}>
              <Pressable style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </Pressable>
              <Pressable style={styles.saveButton} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </Pressable>
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  sectionHeader: { marginBottom: 20 },
  screenTitle: { fontSize: 28, fontWeight: "900", color: "#111827" },
  screenSubtitle: { fontSize: 15, color: "#6b7280", marginTop: 4 },
  
  inventoryItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700", color: "#111827", textTransform: "capitalize" },
  itemMeta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  itemAmountWrap: { alignItems: "flex-end" },
  itemQty: { fontSize: 16, fontWeight: "800", color: "#2D6A4F" },
  itemUnit: { fontSize: 12, color: "#6b7280", fontWeight: "600" },

  emptyPanel: { backgroundColor: "#f9fafb", padding: 24, borderRadius: 16, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", borderStyle: "dashed", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(17, 24, 39, 0.4)", justifyContent: "center", padding: 20 },
  modalSheet: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#111827", textTransform: "capitalize" },
  
  formRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  formCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: "700", color: "#6b7280", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, fontSize: 15, color: "#111827" },

  buttonRow: { flexDirection: "row", gap: 12 },
  deleteButton: { backgroundColor: "#fee2e2", padding: 14, borderRadius: 14, alignItems: "center", justifyContent: "center", width: 56 },
  saveButton: { flex: 1, backgroundColor: "#2D6A4F", padding: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});