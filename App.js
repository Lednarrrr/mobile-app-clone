import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import INGREDIENT_SYNONYMS from "./src/data/ingredientSynonyms.json";
import { KARINDERYA_STARTER_INVENTORY } from "./src/data/starterInventory";
import {
  addIngredient,
  addStarterInventory,
  getIngredients,
  initInventoryDatabase,
} from "./src/database/inventoryDatabase";
import InventoryScreen from "./src/screens/InventoryScreen";
import RecommendationScreen from "./src/screens/RecommendationScreen";
import {
  getRecipeRecommendations,
  getShoppingListFromRecommendations,
} from "./src/utils/recommendationEngine";

import BottomNavigation from "./src/components/BottomNavigation";
import HomeScreen from "./src/components/HomeScreen";
import OnboardingScreen from "./src/components/OnboardingScreen";
import {
  CATEGORY_OPTIONS,
  ONBOARDING_COMPLETE_KEY,
  UNIT_OPTIONS,
} from "./src/constants";
import { getExpiringSoonCount } from "./src/utils/helpers";

export default function App() {
  const [activeScreen, setActiveScreen] = useState("home");
  const [ingredients, setIngredients] = useState([]);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [newItemExpiry, setNewItemExpiry] = useState("");
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const [isExpiryPickerOpen, setIsExpiryPickerOpen] = useState(false);
  const [expiryDateValue, setExpiryDateValue] = useState(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const modalTranslateY = useRef(new Animated.Value(420)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initInventoryDatabase();
    loadIngredients();
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    const savedStatus = await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY);
    setHasCompletedOnboarding(savedStatus === "true");
    setIsCheckingOnboarding(false);
  }

  function loadIngredients() {
    const savedIngredients = getIngredients();
    setIngredients(savedIngredients);
  }

  async function completeOnboarding({ useStarterPack }) {
    if (useStarterPack) {
      addStarterInventory(KARINDERYA_STARTER_INVENTORY);
      loadIngredients();
    }

    await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
    setHasCompletedOnboarding(true);
  }

  const recommendations = getRecipeRecommendations(ingredients);
  const shoppingList = getShoppingListFromRecommendations(recommendations);
  const readyCount = recommendations.filter(
    (recipe) => recipe.status === "Ready to Cook",
  ).length;
  const expiringSoonCount = getExpiringSoonCount(ingredients);

  function openAddModal() {
    setIsAddModalOpen(true);
    setIsAddModalVisible(true);
    modalTranslateY.setValue(420);
    modalBackdropOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(modalBackdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
    setIsUnitMenuOpen(false);
    setIsExpiryPickerOpen(false);
    setIsCategoryMenuOpen(false);

    Animated.parallel([
      Animated.timing(modalTranslateY, {
        toValue: 420,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(modalBackdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }

      setIsAddModalVisible(false);
      setNewItemName("");
      setNewItemQty("");
      setNewItemUnit("");
      setNewItemCategory("");
      setCustomCategory("");
      setNewItemExpiry("");
      setExpiryDateValue(null);
    });
  }

  function formatDateValue(dateValue) {
    const year = dateValue.getFullYear();
    const month = `${dateValue.getMonth() + 1}`.padStart(2, "0");
    const day = `${dateValue.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function handleExpiryChange(event, selectedDate) {
    if (event?.type === "dismissed") {
      setIsExpiryPickerOpen(false);
      return;
    }

    const nextDate = selectedDate || expiryDateValue || new Date();
    setExpiryDateValue(nextDate);
    setNewItemExpiry(formatDateValue(nextDate));

    if (Platform.OS === "android") {
      setIsExpiryPickerOpen(false);
    }
  }

  function normalizeLookupValue(value) {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  const normalizedName = normalizeLookupValue(newItemName);
  const synonymMatch = normalizedName
    ? INGREDIENT_SYNONYMS[normalizedName] || findClosestSynonym(normalizedName)
    : "";

  function handleAddItem() {
    if (!newItemName.trim()) {
      return;
    }

    addIngredient(
      newItemName,
      newItemQty,
      newItemUnit,
      newItemCategory === "Other" ? customCategory : newItemCategory,
      newItemExpiry,
    );
    loadIngredients();
    closeAddModal();
    setToastMessage(`${newItemName} has been added to your inventory.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  function findClosestSynonym(value) {
    const candidates = Object.keys(INGREDIENT_SYNONYMS).filter(
      (key) => key.includes(value) || value.includes(key),
    );

    if (candidates.length === 0) {
      return "";
    }

    const bestKey = candidates.sort((a, b) => b.length - a.length)[0];
    return INGREDIENT_SYNONYMS[bestKey] || "";
  }

  if (isCheckingOnboarding) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.loadingScreen}>
          <Text style={styles.loadingTitle}>Kusinera</Text>
          <Text style={styles.loadingText}>Preparing your kitchen...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <View style={styles.content}>
          {activeScreen === "home" && (
            <HomeScreen
              ingredientsCount={ingredients.length}
              readyCount={readyCount}
              expiringSoonCount={expiringSoonCount}
              shoppingCount={shoppingList.length}
              onGoToCook={() => setActiveScreen("cook")}
              onGoToInventory={() => setActiveScreen("inventory")}
              onGoToBuy={() => setActiveScreen("buy")}
              onGoToSettings={() => setActiveScreen("settings")}
              onFilterPress={() => setIsFilterModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          )}

          {activeScreen === "inventory" && (
            <InventoryScreen
              ingredients={ingredients}
              onInventoryChange={loadIngredients}
            />
          )}

          {activeScreen === "cook" && (
            <RecommendationScreen ingredients={ingredients} />
          )}

          {activeScreen === "buy" && (
            <ShoppingList shoppingList={shoppingList} />
          )}

          {activeScreen === "settings" && (
            <SettingsPanel
              onResetOnboarding={async () => {
                await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE_KEY);
                setHasCompletedOnboarding(false);
              }}
            />
          )}
        </View>

        <BottomNavigation
          activeScreen={activeScreen}
          onChangeScreen={setActiveScreen}
          onAddPress={openAddModal}
        />

        {showToast && (
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>

      <Modal
        animationType="none"
        transparent
        visible={isAddModalVisible}
        onRequestClose={closeAddModal}
      >
        <Animated.View
          style={[styles.modalBackdrop, { opacity: modalBackdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeAddModal}
          />
          <Animated.View
            style={[
              styles.modalSheet,
              { transform: [{ translateY: modalTranslateY }] },
            ]}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>Add New Item</Text>
              <Pressable style={styles.modalClose} onPress={closeAddModal}>
                <Ionicons name="close" size={18} color="#111827" />
              </Pressable>
            </View>
            <Text style={styles.modalFieldLabel}>Name</Text>
            <TextInput
              placeholder="e.g., Tomatoes"
              placeholderTextColor="#9ca3af"
              value={newItemName}
              onChangeText={setNewItemName}
              style={styles.modalInput}
            />
            {synonymMatch ? (
              <View style={styles.matchRow}>
                <Ionicons name="checkmark-circle" size={16} color="#1D9E75" />
                <Text style={styles.matchText}>Matched: {synonymMatch}</Text>
              </View>
            ) : null}

            <Text style={styles.modalFieldLabel}>Category</Text>
            <View style={styles.dropdownField}>
              <Pressable
                style={styles.selectRow}
                onPress={() => setIsCategoryMenuOpen((open) => !open)}
              >
                <Text style={styles.selectText}>
                  {newItemCategory || "Select category"}
                </Text>
                <Ionicons
                  name={isCategoryMenuOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#9ca3af"
                />
              </Pressable>
              {isCategoryMenuOpen ? (
                <View style={styles.selectMenu}>
                  <ScrollView style={styles.selectMenuScroll}>
                    {CATEGORY_OPTIONS.map((category) => (
                      <Pressable
                        key={category}
                        style={styles.selectOption}
                        onPress={() => {
                          setNewItemCategory(category);
                          setIsCategoryMenuOpen(false);
                        }}
                      >
                        <Text style={styles.selectOptionText}>{category}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
            {newItemCategory === "Other" ? (
              <TextInput
                placeholder="Enter custom category"
                placeholderTextColor="#9ca3af"
                value={customCategory}
                onChangeText={setCustomCategory}
                style={styles.modalInput}
              />
            ) : null}

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.modalFieldLabel}>Quantity (optional)</Text>
                <TextInput
                  placeholder="e.g., 3"
                  placeholderTextColor="#9ca3af"
                  value={newItemQty}
                  onChangeText={setNewItemQty}
                  keyboardType="numeric"
                  style={styles.modalInput}
                />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.modalFieldLabel}>Unit</Text>
                <View style={styles.dropdownField}>
                  <Pressable
                    style={styles.selectRow}
                    onPress={() => setIsUnitMenuOpen((open) => !open)}
                  >
                    <Text style={styles.selectText}>
                      {newItemUnit || "Select unit"}
                    </Text>
                    <Ionicons
                      name={isUnitMenuOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#9ca3af"
                    />
                  </Pressable>
                  {isUnitMenuOpen ? (
                    <View style={styles.selectMenu}>
                      <ScrollView style={styles.selectMenuScroll}>
                        {UNIT_OPTIONS.map((unit) => (
                          <Pressable
                            key={unit}
                            style={styles.selectOption}
                            onPress={() => {
                              setNewItemUnit(unit);
                              setIsUnitMenuOpen(false);
                            }}
                          >
                            <Text style={styles.selectOptionText}>{unit}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <Text style={styles.modalFieldLabel}>Expiry date (optional)</Text>
            <Pressable
              style={styles.expiryRow}
              onPress={() => setIsExpiryPickerOpen(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
              <Text
                style={
                  newItemExpiry ? styles.expiryText : styles.expiryPlaceholder
                }
              >
                {newItemExpiry || "Select date"}
              </Text>
            </Pressable>
            {isExpiryPickerOpen ? (
              <View style={styles.expiryPickerWrap}>
                <DateTimePicker
                  value={expiryDateValue || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleExpiryChange}
                  minimumDate={new Date()}
                />
                {Platform.OS === "ios" ? (
                  <Pressable
                    style={styles.expiryDone}
                    onPress={() => setIsExpiryPickerOpen(false)}
                  >
                    <Text style={styles.expiryDoneText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              style={styles.modalPrimaryButton}
              onPress={handleAddItem}
            >
              <Text style={styles.modalPrimaryText}>Save</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      <Modal
        animationType="none"
        transparent
        visible={isFilterModalOpen}
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsFilterModalOpen(false)}
        >
          <SafeAreaView
            style={{ backgroundColor: "#ffffff" }}
            edges={["bottom"]}
          >
            <Pressable style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderSpacer} />
                <Text style={styles.modalTitle}>Filter Dishes</Text>
                <Pressable
                  style={styles.modalClose}
                  onPress={() => setIsFilterModalOpen(false)}
                >
                  <Ionicons name="close" size={20} color="#111827" />
                </Pressable>
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.modalFieldLabel}>Category</Text>
                {CATEGORY_OPTIONS.map((category) => {
                  const isSelected = selectedCategories.includes(category);
                  return (
                    <Pressable
                      key={category}
                      style={[
                        styles.filterOption,
                        isSelected && styles.filterOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedCategories((prev) =>
                          isSelected
                            ? prev.filter((c) => c !== category)
                            : [...prev, category],
                        );
                      }}
                    >
                      <Text style={styles.filterOptionText}>{category}</Text>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#ffffff"
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={styles.modalPrimaryButton}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Text style={styles.modalPrimaryText}>Apply Filters</Text>
              </Pressable>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function ShoppingList({ shoppingList }) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.screenTitle}>Shopping list</Text>
        <Text style={styles.screenSubtitle}>
          Missing required ingredients grouped from your recipe matches.
        </Text>
      </View>

      {shoppingList.length === 0 ? (
        <EmptyPanel
          title="Nothing to buy yet"
          text="Recipe matches with missing required ingredients will appear here."
        />
      ) : (
        shoppingList.map((item) => (
          <View key={item.name} style={styles.shoppingItem}>
            <View style={styles.shoppingIcon}>
              <Ionicons name="add-outline" size={20} color="#2D6A4F" />
            </View>
            <View style={styles.shoppingInfo}>
              <Text style={styles.shoppingName}>{item.name}</Text>
              <Text style={styles.shoppingMeta}>
                Needed by {item.recipeCount} matched recipe
                {item.recipeCount > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SettingsPanel({ onResetOnboarding }) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.screenTitle}>Settings</Text>
        <Text style={styles.screenSubtitle}>
          MVP controls for privacy, offline data, and future app preferences.
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <Ionicons name="shield-checkmark-outline" size={28} color="#2D6A4F" />
        <View style={styles.settingsTextGroup}>
          <Text style={styles.settingsTitle}>Offline-first prototype</Text>
          <Text style={styles.settingsText}>
            Inventory data is stored locally on this device for the MVP.
          </Text>
        </View>
      </View>

      <Pressable style={styles.settingsAction} onPress={onResetOnboarding}>
        <Ionicons name="refresh-outline" size={22} color="#C77B12" />
        <Text style={styles.settingsActionText}>Show onboarding again</Text>
      </Pressable>
    </ScrollView>
  );
}

function EmptyPanel({ title, text }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#2D6A4F",
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  loadingTitle: {
    color: "#1c2a22",
    fontSize: 34,
    fontWeight: "900",
  },
  loadingText: {
    color: "#69746c",
    fontSize: 15,
    marginTop: 8,
  },
  container: {
    backgroundColor: "#F8F5EE",
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    marginTop: 0,
  },
  modalBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  modalHandle: {
    alignSelf: "center",
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 48,
  },
  modalHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    flex: 1,
  },
  modalHeaderSpacer: {
    height: 32,
    width: 32,
  },
  modalClose: {
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  modalFieldLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    marginTop: 12,
  },
  matchRow: {
    alignItems: "center",
    backgroundColor: "#e8f8ee",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  matchText: {
    color: "#16a34a",
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  formColumn: {
    flex: 1,
  },
  dropdownField: {
    position: "relative",
  },
  selectRow: {
    alignItems: "center",
    borderColor: "#e5e7eb",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectText: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  selectMenu: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    paddingVertical: 4,
    position: "absolute",
    top: 48,
    left: 0,
    right: 0,
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
    zIndex: 10,
  },
  selectMenuScroll: {
    maxHeight: 160,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectOptionText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "500",
  },
  modalInput: {
    borderColor: "#e5e7eb",
    borderRadius: 14,
    borderWidth: 1,
    color: "#111827",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expiryRow: {
    alignItems: "center",
    borderColor: "#e5e7eb",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expiryText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  expiryPlaceholder: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "500",
  },
  expiryPickerWrap: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  expiryDone: {
    alignItems: "center",
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
  },
  expiryDoneText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#d4a20b",
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 14,
  },
  modalPrimaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  filterOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterOptionSelected: {
    borderColor: "#2D6A4F",
    backgroundColor: "#f0fdf4",
  },
  filterOptionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: "#2D6A4F",
  },
  toast: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    backgroundColor: "#E9C46A",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#111827",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  toastText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});
