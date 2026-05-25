import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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

import Fuse from "fuse.js";
import INGREDIENT_SYNONYMS from "./src/data/ingredientSynonyms.json";
import { KARINDERYA_STARTER_INVENTORY } from "./src/data/starterInventory";
import {
  addCustomRecipe,
  addIngredient,
  addStarterInventory,
  getCustomRecipes,
  getIngredients,
  initInventoryDatabase,
} from "./src/database/inventoryDatabase";
import {
  appendRecipeToEngine,
  getRecipeRecommendations,
  getShoppingListFromRecommendations,
  initializeRecommendationEngine,
} from "./src/logic/recommendationEngine";
import InventoryScreen from "./src/screens/InventoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import RecommendationScreen from "./src/screens/RecommendationScreen";

import BottomNavigation from "./src/components/BottomNavigation";
import HomeScreen from "./src/components/HomeScreen";
import OnboardingScreen from "./src/components/OnboardingScreen";
import {
  CATEGORY_OPTIONS,
  ONBOARDING_COMPLETE_KEY,
  UNIT_OPTIONS,
} from "./src/constants";
import { getExpiringSoonCount } from "./src/utils/helpers";

function normalizeIngredientText(value = "") {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatIngredientLabel(value = "") {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState("home");
  const [ingredients, setIngredients] = useState([]);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  // Modals & Menus
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
  const [isAddRecipeModalVisible, setIsAddRecipeModalVisible] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [newItemExpiry, setNewItemExpiry] = useState("");
  
  // Picker States
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const [isExpiryPickerOpen, setIsExpiryPickerOpen] = useState(false);
  const [expiryDateValue, setExpiryDateValue] = useState(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isRecipeCategoryMenuOpen, setIsRecipeCategoryMenuOpen] = useState(false);
  const [openRecipeUnitMenuIndex, setOpenRecipeUnitMenuIndex] = useState(null);
  
  // Animations
  const modalTranslateY = useRef(new Animated.Value(420)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;
  const pantryNameInputRef = useRef(null);
  const pantryQuantityInputRef = useRef(null);
  const pantryCustomCategoryInputRef = useRef(null);
  const activePantryInputRef = useRef(null);

  // --- CUSTOM RECIPE FORM STATES ---
  const [customRecipes, setCustomRecipes] = useState([]);
  const [newRecipeName, setNewRecipeName] = useState("");
  const [newRecipeCategory, setNewRecipeCategory] = useState("Ulam");
  const [newRecipePrepTime, setNewRecipePrepTime] = useState("");
  const [newRecipeServings, setNewRecipeServings] = useState("");
  const [newRecipeIngredients, setNewRecipeIngredients] = useState([
    { name: "", quantity: "", unit: "" }
  ]);

  // --- DYNAMIC FUSE & GATEKEEPER (State-Driven) ---
  const [engineData, setEngineData] = useState({ fuse: null, masterSet: new Set() });
  
  // Create quick references so the rest of your code doesn't need to change
  const fuse = engineData.fuse;
  const masterSet = engineData.masterSet;
  const ingredientSuggestionItems = useMemo(() => {
    const validNames = Array.from(masterSet || []);
    const suggestionMap = new Map();

    validNames.forEach((name) => {
      const normalizedName = normalizeIngredientText(name);
      if (!normalizedName) return;

      suggestionMap.set(`name:${normalizedName}`, {
        name: normalizedName,
        searchText: normalizedName,
        matchedAlias: null,
      });
    });

    Object.entries(INGREDIENT_SYNONYMS).forEach(([alias, canonicalName]) => {
      const normalizedAlias = normalizeIngredientText(alias);
      const normalizedCanonicalName = normalizeIngredientText(canonicalName);

      if (
        !normalizedAlias ||
        !normalizedCanonicalName ||
        !masterSet?.has(normalizedCanonicalName)
      ) {
        return;
      }

      suggestionMap.set(`alias:${normalizedAlias}`, {
        name: normalizedCanonicalName,
        searchText: normalizedAlias,
        matchedAlias:
          normalizedAlias === normalizedCanonicalName ? null : normalizedAlias,
      });
    });

    return Array.from(suggestionMap.values());
  }, [masterSet]);

  useEffect(() => {
    try {
      initInventoryDatabase();
      loadAppData(); 
    } catch (error) {
      console.error("Failed to initialize Kusinera database:", error);
    }
    checkOnboardingStatus();
  }, []);

  // Fetches tables on boot and triggers the INITIAL Reverse Index build
  function loadAppData() {
    try {
      setIngredients(getIngredients());
      
      const sqliteRecipes = getCustomRecipes();
      setCustomRecipes(sqliteRecipes); 
      
      // Build the engine once on boot
      const engineResult = initializeRecommendationEngine(sqliteRecipes);
      if (engineResult && engineResult.fuseArray) {
        setEngineData({
          fuse: new Fuse(engineResult.fuseArray, { keys: ['name'], threshold: 0.3 }),
          masterSet: engineResult.masterSet
        });
      }
    } catch (error) {
      console.error("Failed to load app data:", error);
    }
  }

  async function checkOnboardingStatus() {
    try {
      const savedStatus = await SecureStore.getItemAsync(ONBOARDING_COMPLETE_KEY);
      setHasCompletedOnboarding(savedStatus === "true");
    } catch (error) {
      console.error("SecureStore error:", error);
      setHasCompletedOnboarding(false);
    } finally {
      setIsCheckingOnboarding(false);
    }
  }

  async function completeOnboarding({ useStarterPack }) {
    if (useStarterPack) {
      try {
        addStarterInventory(KARINDERYA_STARTER_INVENTORY);
        loadAppData();
      } catch (error) {
        console.error("Failed to load starter inventory:", error);
      }
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

  // --- ACTION MENU & ROUTING ---
  function openActionMenu() {
    setIsActionMenuVisible(true);
  }

  function handleSelectAddIngredient() {
    setIsActionMenuVisible(false);
    openAddModal();
  }

  function handleSelectAddRecipe() {
    setIsActionMenuVisible(false);
    setIsAddRecipeModalVisible(true);
  }

  // --- PANTRY INGREDIENT HANDLERS ---
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
    setSuggestions([]);

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
      if (!finished) return;
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
    if (Platform.OS === "android") setIsExpiryPickerOpen(false);
  }

  function handleNameChange(text) {
    setNewItemName(text);
    const query = normalizeIngredientText(text);

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const rankedMatches = ingredientSuggestionItems
      .map((item) => {
        const name = normalizeIngredientText(item.name);
        const searchText = normalizeIngredientText(item.searchText);
        let rank = null;

        if (name === query || searchText === query) {
          rank = 0;
        } else if (name.startsWith(query)) {
          rank = 1;
        } else if (searchText.startsWith(query)) {
          rank = 2;
        } else if (name.split(" ").some((word) => word.startsWith(query))) {
          rank = 3;
        } else if (searchText.split(" ").some((word) => word.startsWith(query))) {
          rank = 4;
        } else if (name.includes(query)) {
          rank = 5;
        } else if (searchText.includes(query)) {
          rank = 6;
        }

        return rank === null ? null : { ...item, rank };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

    const suggestionsByName = new Map();
    rankedMatches.forEach((match) => {
      if (!suggestionsByName.has(match.name)) {
        suggestionsByName.set(match.name, match);
      }
    });

    if (suggestionsByName.size < 6 && fuse) {
      fuse.search(query).forEach((result) => {
        const name = normalizeIngredientText(result.item.name);
        if (!suggestionsByName.has(name)) {
          suggestionsByName.set(name, {
            name,
            searchText: name,
            matchedAlias: null,
            rank: 7,
          });
        }
      });
    }

    setSuggestions(Array.from(suggestionsByName.values()).slice(0, 6));
  }

  function selectSuggestion(suggestion) {
    const ingredientName =
      typeof suggestion === "string" ? suggestion : suggestion.name;

    setNewItemName(ingredientName);
    setSuggestions([]); 
  }

  function rememberPantryInput(inputRef) {
    activePantryInputRef.current = inputRef.current;
  }

  function keepPantryKeyboardOpen() {
    requestAnimationFrame(() => {
      activePantryInputRef.current?.focus?.();
    });
  }

  function handleAddItem() {
    const cleanedName = normalizeIngredientText(newItemName);
    if (!cleanedName) return;
    const canonicalName = INGREDIENT_SYNONYMS[cleanedName] || cleanedName;

    // Added safety check: ensure 'masterSet' exists before checking .has()
    if (!masterSet || !masterSet.has(canonicalName)) {
      Alert.alert(
        "Invalid Ingredient",
        `"${newItemName.trim()}" is not recognized as a valid ingredient. Please select an officially recognized item from the search suggestions.`,
        [{ text: "Understood", style: "default" }]
      );
      return;
    }

    addIngredient(
      canonicalName,
      newItemQty,
      newItemUnit,
      newItemCategory === "Other" ? customCategory : newItemCategory,
      newItemExpiry,
    );
    loadAppData();
    closeAddModal();
    setToastMessage(`${formatIngredientLabel(canonicalName)} has been added to your inventory.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  }

  // --- CUSTOM RECIPE HANDLERS ---
  function addRecipeIngredientRow() {
    setOpenRecipeUnitMenuIndex(null);
    setNewRecipeIngredients([...newRecipeIngredients, { name: "", quantity: "", unit: "" }]);
  }

  function removeRecipeIngredientRow(index) {
    setNewRecipeIngredients((currentIngredients) => {
      if (currentIngredients.length === 1) {
        return [{ name: "", quantity: "", unit: "" }];
      }

      return currentIngredients.filter((_, ingredientIndex) => ingredientIndex !== index);
    });
  }

  function updateRecipeIngredient(index, field, value) {
    const updatedIngredients = [...newRecipeIngredients];
    updatedIngredients[index][field] = value;
    setNewRecipeIngredients(updatedIngredients);
  }

  function closeAddRecipeModal() {
    setIsAddRecipeModalVisible(false);
    setIsRecipeCategoryMenuOpen(false);
    setOpenRecipeUnitMenuIndex(null);
    setNewRecipeName("");
    setNewRecipeCategory("Ulam");
    setNewRecipePrepTime("");
    setNewRecipeServings("");
    setNewRecipeIngredients([{ name: "", quantity: "", unit: "" }]);
  }

  function handleSaveCustomRecipe() {
    if (!newRecipeName.trim()) {
      Alert.alert("Missing Info", "Please give your recipe a name.");
      return;
    }

    const validIngredients = newRecipeIngredients.filter(ing => ing.name.trim() !== "");
    if (validIngredients.length === 0) {
      Alert.alert("Missing Ingredients", "A recipe must have at least one ingredient!");
      return;
    }

    const newRecipe = {
      id: `custom_${Date.now()}`, 
      name: newRecipeName.trim(),
      category: newRecipeCategory,
      prep_time_minutes: parseInt(newRecipePrepTime) || 30,
      servings: parseInt(newRecipeServings) || 4,
      ingredients: validIngredients.map(ing => ({
        name: ing.name.trim().toLowerCase(), 
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit || "pcs",
        substitutable: false
      }))
    };

    try {
      // 1. Save to SQLite Database
      addCustomRecipe(newRecipe);
      
      // 2. THE DELTA UPDATE: Append directly to the engine! 
      // (Bypasses the full O(N) loadAppData rebuild)
      const updatedEngine = appendRecipeToEngine(newRecipe);
      if (updatedEngine) {
        setEngineData({
          fuse: new Fuse(updatedEngine.fuseArray, { keys: ['name'], threshold: 0.3 }),
          masterSet: updatedEngine.masterSet
        });
      }

      // 3. Update the UI state silently
      setCustomRecipes(prev => [...prev, newRecipe]);
      
      closeAddRecipeModal();
      
      Alert.alert("Success", `${newRecipe.name} has been added to your cookbook!`);
    } catch (error) {
      console.error("Failed to save recipe:", error);
    }
  }

  // --- RENDER ---
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
              onInventoryChange={loadAppData}
            />
          )}

          {activeScreen === "cook" && (
            <RecommendationScreen ingredients={ingredients} />
          )}

          {activeScreen === "buy" && (
            <ShoppingList shoppingList={shoppingList} />
          )}

          {activeScreen === "profile" && <ProfileScreen />}

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
          onAddPress={openActionMenu} 
        />

        {showToast && (
          <View style={styles.toast}>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}
      </View>

      {/* --- THE ACTION MENU MODAL --- */}
      <Modal visible={isActionMenuVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsActionMenuVisible(false)} />
          <View style={[styles.modalSheet, styles.actionMenuSheet]}>
            <View style={styles.modalHandle} />
            <Text style={styles.actionMenuHeading}>What would you like to add?</Text>
            
            <Pressable
              android_ripple={{ color: "#dcece4" }}
              style={({ pressed }) => [
                styles.actionMenuButton,
                pressed && styles.actionMenuButtonPressed,
              ]}
              onPress={handleSelectAddIngredient}
            >
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconPantry]}>
                <Ionicons name="basket-outline" size={24} color="#2D6A4F" />
              </View>
              <View style={styles.actionMenuTextGroup}>
                <Text style={styles.actionMenuTitle}>Pantry Ingredient</Text>
                <Text style={styles.actionMenuSubtitle}>Add stock to your current inventory</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </Pressable>

            <Pressable
              android_ripple={{ color: "#f5ebc7" }}
              style={({ pressed }) => [
                styles.actionMenuButton,
                pressed && styles.actionMenuButtonPressed,
              ]}
              onPress={handleSelectAddRecipe}
            >
              <View style={[styles.actionMenuIconWrap, styles.actionMenuIconRecipe]}>
                <Ionicons name="book-outline" size={24} color="#d4a20b" />
              </View>
              <View style={styles.actionMenuTextGroup}>
                <Text style={styles.actionMenuTitle}>Custom Recipe</Text>
                <Text style={styles.actionMenuSubtitle}>Teach the app a new dish to recommend</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* --- ADD PANTRY INGREDIENT MODAL --- */}
      <Modal
        animationType="none"
        transparent
        visible={isAddModalVisible}
        onRequestClose={closeAddModal}
      >
        <Animated.View style={[styles.modalBackdrop, { opacity: modalBackdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeAddModal} />
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalTranslateY }] }]}>
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
              ref={pantryNameInputRef}
              placeholder="e.g., Tomatoes"
              placeholderTextColor="#9ca3af"
              value={newItemName}
              onChangeText={handleNameChange}
              onFocus={() => rememberPantryInput(pantryNameInputRef)}
              style={styles.modalInput}
            />
            
            {suggestions.length > 0 ? (
              <View style={styles.suggestionMenu}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionTitle}>Suggested ingredients</Text>
                  <Text style={styles.suggestionCount}>{suggestions.length}</Text>
                </View>
                <ScrollView keyboardShouldPersistTaps="always" style={styles.suggestionScroll}>
                  {suggestions.map((suggestion, index) => {
                    const suggestionName =
                      typeof suggestion === "string" ? suggestion : suggestion.name;
                    const matchedAlias =
                      typeof suggestion === "string" ? null : suggestion.matchedAlias;

                    return (
                      <Pressable
                        key={`${suggestionName}-${matchedAlias || index}`}
                        style={({ pressed }) => [
                          styles.suggestionItem,
                          pressed && styles.suggestionItemPressed,
                          index === suggestions.length - 1 && styles.suggestionItemLast,
                        ]}
                        onPress={() => selectSuggestion(suggestion)}
                      >
                        <View style={styles.suggestionIconWrap}>
                          <Ionicons name="search-outline" size={16} color="#2D6A4F" />
                        </View>
                        <View style={styles.suggestionTextGroup}>
                          <Text style={styles.suggestionText}>
                            {formatIngredientLabel(suggestionName)}
                          </Text>
                          {matchedAlias ? (
                            <Text style={styles.suggestionAlias}>
                              Also matches {formatIngredientLabel(matchedAlias)}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View>
                <Text style={styles.modalFieldLabel}>Category</Text>
                <View style={styles.dropdownField}>
                  <Pressable
                    style={styles.selectRow}
                    onPress={() => {
                      setIsUnitMenuOpen(false);
                      setIsCategoryMenuOpen((open) => !open);
                      keepPantryKeyboardOpen();
                    }}
                  >
                    <Text style={styles.selectText}>{newItemCategory || "Select category"}</Text>
                    <Ionicons name={isCategoryMenuOpen ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" />
                  </Pressable>
                  {isCategoryMenuOpen ? (
                    <View style={styles.selectMenu}>
                      <ScrollView style={styles.selectMenuScroll} keyboardShouldPersistTaps="always">
                        {CATEGORY_OPTIONS.map((category) => (
                          <Pressable
                            key={category}
                            style={styles.selectOption}
                            onPress={() => {
                              setNewItemCategory(category);
                              setIsCategoryMenuOpen(false);
                              keepPantryKeyboardOpen();
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
                    ref={pantryCustomCategoryInputRef}
                    placeholder="Enter custom category"
                    placeholderTextColor="#9ca3af"
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    onFocus={() => rememberPantryInput(pantryCustomCategoryInputRef)}
                    style={styles.modalInput}
                  />
                ) : null}

                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.modalFieldLabel}>Quantity (optional)</Text>
                    <TextInput
                      ref={pantryQuantityInputRef}
                      placeholder="e.g., 3"
                      placeholderTextColor="#9ca3af"
                      value={newItemQty}
                      onChangeText={setNewItemQty}
                      onFocus={() => rememberPantryInput(pantryQuantityInputRef)}
                      keyboardType="numeric"
                      style={styles.modalInput}
                    />
                  </View>
                  <View style={styles.formColumn}>
                    <Text style={styles.modalFieldLabel}>Unit</Text>
                    <View style={styles.dropdownField}>
                      <Pressable
                        style={styles.selectRow}
                        onPress={() => {
                          setIsCategoryMenuOpen(false);
                          setIsUnitMenuOpen((open) => !open);
                          keepPantryKeyboardOpen();
                        }}
                      >
                        <Text style={styles.selectText}>{newItemUnit || "Select unit"}</Text>
                        <Ionicons name={isUnitMenuOpen ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" />
                      </Pressable>
                      {isUnitMenuOpen ? (
                        <View style={styles.selectMenu}>
                          <ScrollView style={styles.selectMenuScroll} keyboardShouldPersistTaps="always">
                            {UNIT_OPTIONS.map((unit) => (
                              <Pressable
                                key={unit}
                                style={styles.selectOption}
                                onPress={() => {
                                  setNewItemUnit(unit);
                                  setIsUnitMenuOpen(false);
                                  keepPantryKeyboardOpen();
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
                <Pressable style={styles.expiryRow} onPress={() => setIsExpiryPickerOpen(true)}>
                  <Ionicons name="calendar-outline" size={18} color="#9ca3af" />
                  <Text style={newItemExpiry ? styles.expiryText : styles.expiryPlaceholder}>
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
                      <Pressable style={styles.expiryDone} onPress={() => setIsExpiryPickerOpen(false)}>
                        <Text style={styles.expiryDoneText}>Done</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <Pressable style={styles.modalPrimaryButton} onPress={handleAddItem}>
                  <Text style={styles.modalPrimaryText}>Save</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* --- ADD CUSTOM RECIPE MODAL --- */}
      <Modal
        animationType="slide"
        transparent
        visible={isAddRecipeModalVisible}
        onRequestClose={closeAddRecipeModal}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={closeAddRecipeModal} />
          <SafeAreaView style={styles.recipeModalSafeArea} edges={["bottom"]}>
            <View style={[styles.modalSheet, styles.recipeModalSheet]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalHeaderSpacer} />
                <Text style={styles.modalTitle}>Add Custom Recipe</Text>
                <Pressable style={styles.modalClose} onPress={closeAddRecipeModal}>
                  <Ionicons name="close" size={18} color="#111827" />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.recipeModalContent}
                keyboardShouldPersistTaps="always"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalFieldLabel}>Recipe name</Text>
                <TextInput
                  placeholder="e.g., Chicken Adobo"
                  placeholderTextColor="#9ca3af"
                  value={newRecipeName}
                  onChangeText={setNewRecipeName}
                  style={styles.modalInput}
                />

                <Text style={styles.modalFieldLabel}>Category</Text>
                <View style={styles.recipeDropdownField}>
                  <Pressable
                    style={styles.selectRow}
                    onPress={() => {
                      setOpenRecipeUnitMenuIndex(null);
                      setIsRecipeCategoryMenuOpen((open) => !open);
                    }}
                  >
                    <Text style={styles.selectText}>{newRecipeCategory || "Select category"}</Text>
                    <Ionicons
                      name={isRecipeCategoryMenuOpen ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#9ca3af"
                    />
                  </Pressable>
                  {isRecipeCategoryMenuOpen ? (
                    <View style={styles.recipeSelectMenu}>
                      <ScrollView style={styles.selectMenuScroll} keyboardShouldPersistTaps="always">
                        {CATEGORY_OPTIONS.map((category) => (
                          <Pressable
                            key={`recipe-category-${category}`}
                            style={styles.selectOption}
                            onPress={() => {
                              setNewRecipeCategory(category);
                              setIsRecipeCategoryMenuOpen(false);
                            }}
                          >
                            <Text style={styles.selectOptionText}>{category}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <Text style={styles.modalFieldLabel}>Prep time</Text>
                    <TextInput
                      placeholder="30"
                      placeholderTextColor="#9ca3af"
                      value={newRecipePrepTime}
                      onChangeText={setNewRecipePrepTime}
                      keyboardType="numeric"
                      style={styles.modalInput}
                    />
                  </View>
                  <View style={styles.formColumn}>
                    <Text style={styles.modalFieldLabel}>Servings</Text>
                    <TextInput
                      placeholder="4"
                      placeholderTextColor="#9ca3af"
                      value={newRecipeServings}
                      onChangeText={setNewRecipeServings}
                      keyboardType="numeric"
                      style={styles.modalInput}
                    />
                  </View>
                </View>

                <View style={styles.recipeSectionHeader}>
                  <Text style={styles.recipeSectionTitle}>Ingredients</Text>
                  <Pressable
                    android_ripple={{ color: "#cfe6d9" }}
                    style={({ pressed }) => [
                      styles.addIngredientRowButton,
                      pressed && styles.ingredientActionPressed,
                    ]}
                    onPress={addRecipeIngredientRow}
                  >
                    <Ionicons name="add" size={17} color="#2D6A4F" />
                    <Text style={styles.addIngredientRowText}>Add Ingredient</Text>
                  </Pressable>
                </View>

                {newRecipeIngredients.map((ingredient, index) => (
                  <View
                    key={`recipe-ingredient-${index}`}
                    style={[
                      styles.recipeIngredientRow,
                      openRecipeUnitMenuIndex === index && styles.recipeIngredientRowOpen,
                    ]}
                  >
                    <TextInput
                      placeholder="Ingredient"
                      placeholderTextColor="#9ca3af"
                      value={ingredient.name}
                      onChangeText={(value) => updateRecipeIngredient(index, "name", value)}
                      style={[styles.modalInput, styles.recipeIngredientNameInput]}
                    />
                    <TextInput
                      placeholder="Qty"
                      placeholderTextColor="#9ca3af"
                      value={ingredient.quantity}
                      onChangeText={(value) => updateRecipeIngredient(index, "quantity", value)}
                      keyboardType="numeric"
                      style={[styles.modalInput, styles.recipeIngredientQtyInput]}
                    />
                    <View style={styles.recipeIngredientUnitField}>
                      <Pressable
                        style={styles.recipeIngredientUnitSelect}
                        onPress={() => {
                          setIsRecipeCategoryMenuOpen(false);
                          setOpenRecipeUnitMenuIndex((currentIndex) =>
                            currentIndex === index ? null : index,
                          );
                        }}
                      >
                        <Text
                          style={[
                            styles.recipeIngredientUnitText,
                            !ingredient.unit && styles.recipeIngredientUnitPlaceholder,
                          ]}
                        >
                          {ingredient.unit || "Unit"}
                        </Text>
                        <Ionicons
                          name={openRecipeUnitMenuIndex === index ? "chevron-up" : "chevron-down"}
                          size={15}
                          color="#9ca3af"
                        />
                      </Pressable>
                      {openRecipeUnitMenuIndex === index ? (
                        <View style={styles.recipeUnitMenu}>
                          <ScrollView style={styles.selectMenuScroll} keyboardShouldPersistTaps="always">
                            {UNIT_OPTIONS.map((unit) => (
                              <Pressable
                                key={`recipe-unit-${index}-${unit}`}
                                style={styles.selectOption}
                                onPress={() => {
                                  updateRecipeIngredient(index, "unit", unit);
                                  setOpenRecipeUnitMenuIndex(null);
                                }}
                              >
                                <Text style={styles.selectOptionText}>{unit}</Text>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      ) : null}
                    </View>
                    <Pressable
                      android_ripple={{ color: "#fecaca" }}
                      style={({ pressed }) => [
                        styles.removeIngredientRowButton,
                        pressed && styles.ingredientDeletePressed,
                      ]}
                      onPress={() => removeRecipeIngredientRow(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                    </Pressable>
                  </View>
                ))}

                <Pressable style={styles.modalPrimaryButton} onPress={handleSaveCustomRecipe}>
                  <Text style={styles.modalPrimaryText}>Save Recipe</Text>
                </Pressable>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
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

function ShoppingList({ shoppingList }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.screenTitle}>Shopping list</Text>
        <Text style={styles.screenSubtitle}>Missing required ingredients grouped from your recipe matches.</Text>
      </View>

      {shoppingList.length === 0 ? (
        <EmptyPanel title="Nothing to buy yet" text="Recipe matches with missing required ingredients will appear here." />
      ) : (
        shoppingList.map((item) => (
          <View key={item.name} style={styles.shoppingItem}>
            <View style={styles.shoppingIcon}>
              <Ionicons name="add-outline" size={20} color="#2D6A4F" />
            </View>
            <View style={styles.shoppingInfo}>
              <Text style={styles.shoppingName}>{item.name}</Text>
              <Text style={styles.shoppingMeta}>Needed by {item.recipeCount} matched recipe{item.recipeCount > 1 ? "s" : ""}</Text>
            </View>
          </View>
        ))
      )}
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
  safeArea: { backgroundColor: "#2D6A4F", flex: 1 },
  loadingScreen: { alignItems: "center", flex: 1, justifyContent: "center", padding: 24 },
  loadingTitle: { color: "#1c2a22", fontSize: 34, fontWeight: "900" },
  loadingText: { color: "#69746c", fontSize: 15, marginTop: 8 },
  container: { backgroundColor: "#F8F5EE", flex: 1, paddingHorizontal: 0, paddingTop: 0 },
  content: { flex: 1, marginTop: 0 },
  modalBackdrop: { backgroundColor: "rgba(17, 24, 39, 0.35)", flex: 1, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  modalHandle: { alignSelf: "center", backgroundColor: "#e5e7eb", borderRadius: 999, height: 4, marginBottom: 12, width: 48 },
  modalHeaderRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#111827", fontSize: 18, fontWeight: "900", textAlign: "center", flex: 1 },
  modalHeaderSpacer: { height: 32, width: 32 },
  modalClose: { alignItems: "center", backgroundColor: "#f3f4f6", borderRadius: 999, height: 32, justifyContent: "center", width: 32 },
  modalFieldLabel: { color: "#6b7280", fontSize: 12, fontWeight: "800", marginBottom: 6, marginTop: 12 },
  formRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  formColumn: { flex: 1 },
  dropdownField: { position: "relative" },
  selectRow: { alignItems: "center", borderColor: "#e5e7eb", borderRadius: 14, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  selectText: { color: "#111827", flex: 1, fontSize: 14, fontWeight: "500" },
  selectMenu: { backgroundColor: "#ffffff", borderColor: "#e5e7eb", borderRadius: 12, borderWidth: 1, marginTop: 6, paddingVertical: 4, position: "absolute", top: 48, left: 0, right: 0, shadowColor: "#111827", shadowOpacity: 0.12, shadowOffset: { width: 0, height: 8 }, shadowRadius: 16, elevation: 6, zIndex: 10 },
  selectMenuScroll: { maxHeight: 160 },
  selectOption: { paddingHorizontal: 12, paddingVertical: 8 },
  selectOptionText: { color: "#111827", fontSize: 13, fontWeight: "500" },
  modalInput: { borderColor: "#e5e7eb", borderRadius: 14, borderWidth: 1, color: "#111827", fontSize: 14, paddingHorizontal: 12, paddingVertical: 10 },
  expiryRow: { alignItems: "center", borderColor: "#e5e7eb", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  expiryText: { color: "#111827", fontSize: 14, fontWeight: "600" },
  expiryPlaceholder: { color: "#9ca3af", fontSize: 14, fontWeight: "500" },
  expiryPickerWrap: { backgroundColor: "#ffffff", borderColor: "#e5e7eb", borderRadius: 14, borderWidth: 1, marginTop: 8, paddingHorizontal: 6, paddingVertical: 6 },
  expiryDone: { alignItems: "center", borderRadius: 12, marginTop: 8, paddingVertical: 8 },
  expiryDoneText: { color: "#111827", fontSize: 14, fontWeight: "700" },
  modalPrimaryButton: { alignItems: "center", backgroundColor: "#d4a20b", borderRadius: 16, marginTop: 18, paddingVertical: 14 },
  modalPrimaryText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  
  suggestionMenu: { 
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 20,
    maxHeight: 220,
    overflow: "hidden",
  },
  suggestionHeader: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  suggestionCount: {
    backgroundColor: "#e8f3ee",
    borderRadius: 999,
    color: "#1f6a45",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestionScroll: {
    maxHeight: 180,
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
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  screenTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
  },
  screenSubtitle: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 6,
  },
  settingsCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  settingsTextGroup: {
    flex: 1,
  },
  settingsTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  settingsText: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 4,
  },
  settingsAction: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  settingsActionText: {
    color: "#9a3412",
    fontSize: 13,
    fontWeight: "800",
  },
  shoppingItem: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    padding: 14,
  },
  shoppingIcon: {
    alignItems: "center",
    backgroundColor: "#e8f3ee",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  shoppingInfo: {
    flex: 1,
  },
  shoppingName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  shoppingMeta: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
  emptyPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
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
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  suggestionItem: { 
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  suggestionItemPressed: {
    backgroundColor: "#f8fafc",
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconWrap: {
    alignItems: "center",
    backgroundColor: "#e8f3ee",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    marginRight: 10,
    width: 28,
  },
  suggestionTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  suggestionText: { 
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  suggestionAlias: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
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
    minHeight: 42,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectText: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
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
    fontWeight: "400",
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
  actionMenuSheet: {
    paddingBottom: 34,
    paddingHorizontal: 18,
  },
  actionMenuHeading: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 18,
    textAlign: "center",
  },
  actionMenuButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    minHeight: 76,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionMenuButtonPressed: {
    backgroundColor: "#f8fafc",
  },
  actionMenuIconWrap: {
    alignItems: "center",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  actionMenuIconPantry: {
    backgroundColor: "#e8f3ee",
  },
  actionMenuIconRecipe: {
    backgroundColor: "#fff6d7",
  },
  actionMenuTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  actionMenuTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  actionMenuSubtitle: {
    color: "#6b7280",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  recipeModalSafeArea: {
    justifyContent: "flex-end",
    maxHeight: "92%",
    width: "100%",
  },
  recipeModalSheet: {
    maxHeight: "92%",
  },
  recipeModalContent: {
    paddingBottom: 26,
  },
  recipeSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  recipeSectionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
  },
  recipeDropdownField: {
    position: "relative",
    zIndex: 30,
  },
  recipeSelectMenu: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    elevation: 8,
    left: 0,
    marginTop: 6,
    paddingVertical: 4,
    position: "absolute",
    right: 0,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    top: 44,
    zIndex: 30,
  },
  addIngredientRowButton: {
    alignItems: "center",
    backgroundColor: "#e8f3ee",
    borderColor: "#cfe6d9",
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  addIngredientRowText: {
    color: "#2D6A4F",
    fontSize: 12,
    fontWeight: "900",
  },
  ingredientActionPressed: {
    backgroundColor: "#dcece4",
  },
  recipeIngredientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    position: "relative",
    zIndex: 1,
  },
  recipeIngredientRowOpen: {
    zIndex: 20,
  },
  recipeIngredientNameInput: {
    flex: 1.5,
    marginBottom: 0,
    minWidth: 0,
  },
  recipeIngredientQtyInput: {
    flex: 0.65,
    marginBottom: 0,
    minWidth: 58,
  },
  recipeIngredientUnitField: {
    flex: 0.9,
    minWidth: 76,
    position: "relative",
  },
  recipeIngredientUnitSelect: {
    alignItems: "center",
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 42,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  recipeIngredientUnitText: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
  },
  recipeIngredientUnitPlaceholder: {
    color: "#9ca3af",
    fontWeight: "500",
  },
  recipeUnitMenu: {
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderWidth: 1,
    elevation: 8,
    left: 0,
    marginTop: 6,
    paddingVertical: 4,
    position: "absolute",
    right: 0,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    top: 42,
    zIndex: 20,
  },
  removeIngredientRowButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  ingredientDeletePressed: {
    backgroundColor: "#fecaca",
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
