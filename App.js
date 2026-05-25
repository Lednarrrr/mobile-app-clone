import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
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


import { KARINDERYA_STARTER_INVENTORY } from "./src/data/starterInventory";
import {
  addIngredient,
  addStarterInventory,
  getIngredients,
  initInventoryDatabase,
  getCustomRecipes,
  addCustomRecipe,
  updateCustomRecipe,
  deleteCustomRecipe,
} from "./src/database/inventoryDatabase";


import {
  initializeRecommendationEngine,
  appendRecipeToEngine,
  getRecipeRecommendations,
  getShoppingListFromRecommendations,
} from "./src/logic/recommendationEngine";


import BottomNavigation from "./src/components/BottomNavigation";
import HomeScreen from "./src/components/HomeScreen";
import OnboardingScreen from "./src/components/OnboardingScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import RecommendationScreen from "./src/screens/RecommendationScreen";
import ProfileScreen from "./src/screens/ProfileScreen";


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
 
  // Modals & Menus
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isActionMenuVisible, setIsActionMenuVisible] = useState(false);
  const [isAddRecipeModalVisible, setIsAddRecipeModalVisible] = useState(false);
 
  // Ingredient Form States
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
 
  // Animations
  const modalTranslateY = useRef(new Animated.Value(420)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;


  // --- CUSTOM RECIPE FORM STATES ---
  const [customRecipes, setCustomRecipes] = useState([]);
  const [editingRecipeId, setEditingRecipeId] = useState(null); // Track if adding or editing
  const [newRecipeName, setNewRecipeName] = useState("");
  const [newRecipeCategory, setNewRecipeCategory] = useState("Ulam");
  const [newRecipePrepTime, setNewRecipePrepTime] = useState("");
  const [newRecipeServings, setNewRecipeServings] = useState("");
  const [newRecipeIngredients, setNewRecipeIngredients] = useState([
    { name: "", quantity: "", unit: "" }
  ]);


  const [engineData, setEngineData] = useState({ fuse: null, masterSet: new Set() });
  const fuse = engineData.fuse;
  const masterSet = engineData.masterSet;


  useEffect(() => {
    try {
      initInventoryDatabase();
      loadAppData();
    } catch (error) {
      console.error("Failed to initialize Kusinera database:", error);
    }
    checkOnboardingStatus();
  }, []);


  function loadAppData() {
    try {
      const savedIngredients = getIngredients();
      setIngredients(savedIngredients);


      const sqliteRecipes = getCustomRecipes();
      setCustomRecipes(sqliteRecipes);
     
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
      setHasCompletedOnboarding(false);
    } finally {
      setIsCheckingOnboarding(false);
    }
  }


  async function completeOnboarding({ useStarterPack }) {
    if (useStarterPack) {
      try {
        addStarterInventory(KARINDERYA_STARTER_INVENTORY);
        setIngredients(getIngredients());
      } catch (error) {
        console.error("Failed to load starter inventory:", error);
      }
    }
    await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, "true");
    setHasCompletedOnboarding(true);
  }


  const recommendations = getRecipeRecommendations(ingredients);
  const shoppingList = getShoppingListFromRecommendations(recommendations, ingredients);
  const readyCount = recommendations.filter((recipe) => recipe.status === "Ready to Cook").length;
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
    setEditingRecipeId(null); // Clear ID because it's a NEW recipe
    setNewRecipeName("");
    setNewRecipePrepTime("");
    setNewRecipeServings("");
    setNewRecipeIngredients([{ name: "", quantity: "", unit: "" }]);
    setIsAddRecipeModalVisible(true);
  }


  // --- PANTRY INGREDIENT HANDLERS ---
  function openAddModal() {
    setIsAddModalOpen(true);
    setIsAddModalVisible(true);
    modalTranslateY.setValue(420);
    modalBackdropOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(modalTranslateY, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(modalBackdropOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }


  function closeAddModal() {
    setIsAddModalOpen(false);
    setIsUnitMenuOpen(false);
    setIsExpiryPickerOpen(false);
    setIsCategoryMenuOpen(false);
    setSuggestions([]);


    Animated.parallel([
      Animated.timing(modalTranslateY, { toValue: 420, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(modalBackdropOpacity, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
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
    if (text.length > 1 && fuse) {
      const results = fuse.search(text);
      const matches = results.slice(0, 4).map(r => r.item.name);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }


  function selectSuggestion(name) {
    setNewItemName(name);
    setSuggestions([]);
  }


  function handleAddItem() {
    const cleanedName = newItemName.trim();
    if (!cleanedName) return;


    if (!masterSet || !masterSet.has(cleanedName.toLowerCase())) {
      Alert.alert(
        "Invalid Ingredient",
        `"${cleanedName}" is not recognized as a valid ingredient. Please select an officially recognized item from the search suggestions.`,
        [{ text: "Understood", style: "default" }]
      );
      return;
    }


    try {
      addIngredient(
        cleanedName,
        newItemQty,
        newItemUnit,
        newItemCategory === "Other" ? customCategory : newItemCategory,
        newItemExpiry,
      );
      setIngredients(getIngredients());
      closeAddModal();
    } catch (error) {
      console.error("Failed to add ingredient via modal:", error);
    }
  }


  // --- CUSTOM RECIPE HANDLERS (CRUD) ---
 
  function handleEditRecipe(recipe) {
    setEditingRecipeId(recipe.id);
    setNewRecipeName(recipe.name);
    setNewRecipeCategory(recipe.category);
    setNewRecipePrepTime(String(recipe.prep_time_minutes));
    setNewRecipeServings(String(recipe.servings));
   
    // Convert numerical quantities back to strings for the TextInput
    const editableIngredients = recipe.ingredients.map(ing => ({
      ...ing,
      quantity: ing.quantity ? String(ing.quantity) : ""
    }));
    setNewRecipeIngredients(editableIngredients);
    setIsAddRecipeModalVisible(true);
  }


  function handleDeleteRecipe(recipeId) {
    Alert.alert("Delete Recipe", "Are you sure you want to permanently delete this recipe from your cookbook?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          try {
            deleteCustomRecipe(recipeId);
           
            // Rebuild Engine and UI state
            const updatedSQLite = getCustomRecipes();
            setCustomRecipes(updatedSQLite);
            const engineResult = initializeRecommendationEngine(updatedSQLite);
            if (engineResult) {
              setEngineData({
                fuse: new Fuse(engineResult.fuseArray, { keys: ['name'], threshold: 0.3 }),
                masterSet: engineResult.masterSet
              });
            }
          } catch (error) {
            console.error("Failed to delete recipe:", error);
          }
        }
      }
    ]);
  }


  function addRecipeIngredientRow() {
    setNewRecipeIngredients([...newRecipeIngredients, { name: "", quantity: "", unit: "" }]);
  }


  function updateRecipeIngredient(index, field, value) {
    const updatedIngredients = [...newRecipeIngredients];
    updatedIngredients[index][field] = value;
    setNewRecipeIngredients(updatedIngredients);
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
      id: editingRecipeId || `custom_${Date.now()}`,
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
      if (editingRecipeId) {
        updateCustomRecipe(editingRecipeId, newRecipe);
       
        // Full rebuild for safety when editing (ingredients might have been removed)
        const updatedSQLite = getCustomRecipes();
        setCustomRecipes(updatedSQLite);
        const engineResult = initializeRecommendationEngine(updatedSQLite);
        if (engineResult) {
          setEngineData({
            fuse: new Fuse(engineResult.fuseArray, { keys: ['name'], threshold: 0.3 }),
            masterSet: engineResult.masterSet
          });
        }
        Alert.alert("Success", `${newRecipe.name} has been updated!`);


      } else {
        addCustomRecipe(newRecipe);
       
        // Delta update for pure additions (keeps the app lightning fast)
        const updatedEngine = appendRecipeToEngine(newRecipe);
        if (updatedEngine) {
          setEngineData({
            fuse: new Fuse(updatedEngine.fuseArray, { keys: ['name'], threshold: 0.3 }),
            masterSet: updatedEngine.masterSet
          });
        }
        setCustomRecipes(prev => [...prev, newRecipe]);
        Alert.alert("Success", `${newRecipe.name} has been added to your cookbook!`);
      }
     
      setIsAddRecipeModalVisible(false);
      setEditingRecipeId(null);
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
              customRecipes={customRecipes}
              onGoToCook={() => setActiveScreen("cook")}
              onGoToInventory={() => setActiveScreen("inventory")}
              onGoToBuy={() => setActiveScreen("buy")}
              onGoToSettings={() => setActiveScreen("settings")}
              onEditRecipe={handleEditRecipe}     // <-- HANDED DOWN TO HOMESCREEN
              onDeleteRecipe={handleDeleteRecipe} // <-- HANDED DOWN TO HOMESCREEN
            />
          )}


          {activeScreen === "inventory" && (
            <InventoryScreen
              ingredients={ingredients}
              onInventoryChange={() => setIngredients(getIngredients())}
            />
          )}


          {activeScreen === "cook" && (
            <RecommendationScreen 
              recommendations={recommendations} // <--- ADD THIS LINE
            />
          )}


          {activeScreen === "buy" && (
            <ShoppingList shoppingList={shoppingList} />
          )}


          {activeScreen === "profile" && (
            <ProfileScreen />
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
          onAddPress={openActionMenu}
        />
      </View>


      {/* --- THE ACTION MENU MODAL --- */}
      <Modal visible={isActionMenuVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsActionMenuVisible(false)} />
          <View style={[styles.modalSheet, { paddingBottom: 40 }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { marginBottom: 20 }]}>What would you like to add?</Text>
           
            <Pressable style={styles.actionMenuButton} onPress={handleSelectAddIngredient}>
              <View style={styles.actionMenuIconWrap}>
                <Ionicons name="basket-outline" size={24} color="#2D6A4F" />
              </View>
              <View>
                <Text style={styles.actionMenuTitle}>Pantry Ingredient</Text>
                <Text style={styles.actionMenuSubtitle}>Add stock to your current inventory</Text>
              </View>
            </Pressable>


            <Pressable style={styles.actionMenuButton} onPress={handleSelectAddRecipe}>
              <View style={styles.actionMenuIconWrap}>
                <Ionicons name="book-outline" size={24} color="#d4a20b" />
              </View>
              <View>
                <Text style={styles.actionMenuTitle}>Custom Recipe</Text>
                <Text style={styles.actionMenuSubtitle}>Teach the app a new dish to recommend</Text>
              </View>
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
              placeholder="e.g., Tomatoes"
              placeholderTextColor="#9ca3af"
              value={newItemName}
              onChangeText={handleNameChange}
              style={styles.modalInput}
            />
           
            {suggestions.length > 0 ? (
              <View style={styles.suggestionMenu}>
                <ScrollView keyboardShouldPersistTaps="handled">
                  <Text style={styles.suggestionTitle}>Suggested Ingredients</Text>
                  {suggestions.map((sug, index) => (
                    <Pressable
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(sug)}
                    >
                      <Ionicons name="search-outline" size={16} color="#6b7280" style={{marginRight: 10}} />
                      <Text style={styles.suggestionText}>{sug}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : (
              <View>
                <Text style={styles.modalFieldLabel}>Category</Text>
                <View style={styles.dropdownField}>
                  <Pressable style={styles.selectRow} onPress={() => setIsCategoryMenuOpen((open) => !open)}>
                    <Text style={styles.selectText}>{newItemCategory || "Select category"}</Text>
                    <Ionicons name={isCategoryMenuOpen ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" />
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
                      <Pressable style={styles.selectRow} onPress={() => setIsUnitMenuOpen((open) => !open)}>
                        <Text style={styles.selectText}>{newItemUnit || "Select unit"}</Text>
                        <Ionicons name={isUnitMenuOpen ? "chevron-up" : "chevron-down"} size={16} color="#9ca3af" />
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


      {/* --- ADD/EDIT CUSTOM RECIPE MODAL --- */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isAddRecipeModalVisible}
        onRequestClose={() => setIsAddRecipeModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F5EE' }}>
          <View style={[styles.modalHeaderRow, { paddingHorizontal: 16, paddingTop: 16 }]}>
            <Pressable style={styles.modalClose} onPress={() => setIsAddRecipeModalVisible(false)}>
              <Ionicons name="close" size={20} color="#111827" />
            </Pressable>
            <Text style={styles.modalTitle}>{editingRecipeId ? "Edit Recipe" : "New Recipe"}</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>


          <ScrollView style={{ paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
           
            <Text style={styles.modalFieldLabel}>Recipe Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Special Kare-Kare"
              value={newRecipeName}
              onChangeText={setNewRecipeName}
            />


            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.modalFieldLabel}>Prep Time (mins)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 45"
                  keyboardType="numeric"
                  value={newRecipePrepTime}
                  onChangeText={setNewRecipePrepTime}
                />
              </View>
              <View style={styles.formColumn}>
                <Text style={styles.modalFieldLabel}>Servings</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 4"
                  keyboardType="numeric"
                  value={newRecipeServings}
                  onChangeText={setNewRecipeServings}
                />
              </View>
            </View>


            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, marginBottom: 8 }}>
              <Text style={[styles.modalFieldLabel, { marginTop: 0, marginBottom: 0 }]}>Ingredients Needed</Text>
            </View>


            {newRecipeIngredients.map((ingredient, index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 2 }}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChangeText={(text) => updateRecipeIngredient(index, 'name', text)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Qty"
                    keyboardType="numeric"
                    value={ingredient.quantity}
                    onChangeText={(text) => updateRecipeIngredient(index, 'quantity', text)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Unit"
                    value={ingredient.unit}
                    onChangeText={(text) => updateRecipeIngredient(index, 'unit', text)}
                  />
                </View>
              </View>
            ))}


            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#9ca3af', borderRadius: 12, marginBottom: 24 }}
              onPress={addRecipeIngredientRow}
            >
              <Ionicons name="add" size={18} color="#4b5563" />
              <Text style={{ color: '#4b5563', fontWeight: '600', marginLeft: 4 }}>Add another ingredient</Text>
            </Pressable>


            <Pressable style={[styles.modalPrimaryButton, { marginBottom: 40 }]} onPress={handleSaveCustomRecipe}>
              <Text style={styles.modalPrimaryText}>{editingRecipeId ? "Save Changes" : "Save Recipe to Cookbook"}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>


    </SafeAreaView>
  );
}

function ShoppingList({ shoppingList }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState(null); 
  
  // --- ADVANCED FILTER STATES ---
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("All"); // 'All', 'Standard', 'Custom'
  const [categoryFilter, setCategoryFilter] = useState("All"); 
  
  const CATEGORIES = ["All", "Ulam", "Sabaw", "Prito", "Gulay", "Ihaw", "Kakanin", "Other"];

  const processedList = useMemo(() => {
    let result = [...shoppingList];
    
    // 1. Text Search
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => item.recipeName.toLowerCase().includes(lowerQuery));
    }

    // 2. Filter by Source (Built-in vs Custom)
    if (sourceFilter === "Standard") {
      result = result.filter(item => !String(item.id).startsWith("custom_"));
    } else if (sourceFilter === "Custom") {
      result = result.filter(item => String(item.id).startsWith("custom_"));
    }

    // 3. Filter by Category
    if (categoryFilter !== "All") {
      result = result.filter(item => item.category === categoryFilter || (categoryFilter === "Other" && !CATEGORIES.includes(item.category)));
    }

    return result.sort((a, b) => a.recipeName.localeCompare(b.recipeName));
  }, [shoppingList, searchQuery, sourceFilter, categoryFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F5EE" }}>
      
      {/* HEADER WITH SEARCH & FILTER BUTTON */}
      <View style={styles.shoppingHeader}>
        <View>
          <Text style={styles.shoppingHeaderTitle}>Dish Requirements</Text>
          <Text style={styles.shoppingHeaderSubtitle}>Find what you lack to cook specific dishes.</Text>
        </View>

        <View style={styles.filterContainer}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            
            <View style={[styles.searchBox, { flex: 1 }]}>
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search dishes..."
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

            {/* Advanced Filter Toggle Button */}
            <Pressable 
              style={[styles.advancedFilterBtn, isFilterMenuOpen && styles.advancedFilterBtnActive]} 
              onPress={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            >
              <Ionicons name="options" size={20} color={isFilterMenuOpen ? "#05943c" : "#111827"} />
            </Pressable>
            
          </View>

          {/* EXPANDING ADVANCED FILTER MENU */}
          {isFilterMenuOpen && (
            <View style={styles.advancedFilterMenu}>
              
              <Text style={styles.filterLabel}>Recipe Source</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
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
              </ScrollView>

              <Text style={styles.filterLabel}>Dish Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                {CATEGORIES.map(cat => (
                  <Pressable 
                    key={cat} 
                    style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]}
                    onPress={() => setCategoryFilter(cat)}
                  >
                    <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>{cat}</Text>
                  </Pressable>
                ))}
              </ScrollView>

            </View>
          )}
        </View>
      </View>

      {/* DISH LIST */}
      <ScrollView contentContainerStyle={styles.shoppingScroll} showsVerticalScrollIndicator={false}>
        {processedList.length === 0 ? (
          <EmptyPanel
            title={searchQuery || sourceFilter !== "All" || categoryFilter !== "All" ? "No dishes match filters" : "No missing ingredients"}
            text={searchQuery || sourceFilter !== "All" || categoryFilter !== "All" ? "Try adjusting your advanced filters or search." : "You have all the ingredients for your matched dishes!"}
          />
        ) : (
          processedList.map((item) => (
            <Pressable key={item.id} style={styles.shoppingItem} onPress={() => setSelectedRecipe(item)}>
              <View style={[styles.shoppingIcon, { backgroundColor: '#eefcf5' }]}>
                <Ionicons name="restaurant" size={24} color="#05943c" />
              </View>
              <View style={styles.shoppingInfo}>
                <Text style={styles.shoppingName} numberOfLines={1}>{item.recipeName}</Text>
                <Text style={styles.shoppingMeta}>Lacking {item.missingIngredients.length} ingredient{item.missingIngredients.length > 1 ? "s" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* POPUP MODAL FOR MISSING INGREDIENTS */}
      <Modal visible={!!selectedRecipe} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelectedRecipe(null)} />
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>{selectedRecipe?.recipeName}</Text>
              <Pressable style={styles.modalClose} onPress={() => setSelectedRecipe(null)}>
                <Ionicons name="close" size={18} color="#111827" />
              </Pressable>
            </View>
            
            <Text style={styles.modalFieldLabel}>You are missing:</Text>
            
            <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {selectedRecipe?.missingIngredients.map((ing, idx) => {
                const name = typeof ing === 'string' ? ing : (ing.name || 'Unknown');
                const qty = typeof ing === 'object' && ing.quantity ? `${ing.quantity} ` : '';
                const unit = typeof ing === 'object' && ing.unit ? `${ing.unit} ` : '';
                
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: '#fef2f2', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' }}>
                    <Ionicons name="cart-outline" size={20} color="#dc2626" style={{ marginRight: 12 }} />
                    <Text style={{ fontSize: 15, color: '#111827', textTransform: 'capitalize', fontWeight: '600' }}>
                      {qty}{unit}{name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

          </View>
        </View>
      </Modal>
    </View>
  );
}


function SettingsPanel({ onResetOnboarding }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.screenTitle}>Settings</Text>
        <Text style={styles.screenSubtitle}>MVP controls for privacy, offline data, and future app preferences.</Text>
      </View>


      <View style={styles.settingsCard}>
        <Ionicons name="shield-checkmark-outline" size={28} color="#2D6A4F" />
        <View style={styles.settingsTextGroup}>
          <Text style={styles.settingsTitle}>Offline-first prototype</Text>
          <Text style={styles.settingsText}>Inventory data is stored locally on this device for the MVP.</Text>
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
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 20,
    maxHeight: 220,
  },
  suggestionTitle: {
    fontSize: 12,  
    fontWeight: '800',
    color: '#9ca3af',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  suggestionText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize'
  },

  actionMenuButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  actionMenuIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 2 },
  actionMenuTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },
  actionMenuSubtitle: { fontSize: 13, color: '#6b7280' },

  // --- SHOPPING LIST STYLES (Your custom header tweaks) ---
  shoppingHeader: {
    backgroundColor: "#05943c", 
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    marginBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  shoppingHeaderTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
  },
  shoppingHeaderSubtitle: {
    fontSize: 15,
    color: "#eefcf5",
    marginTop: 4,
  },

  // --- NEW: MISSING SEARCH & FILTER STYLES ---
  filterContainer: {
    marginTop: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#111827",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  sortLabel: {
    color: "#eefcf5",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  sortChipActive: {
    backgroundColor: "#ffffff",
    borderColor: "#ffffff",
  },
  sortChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  sortChipTextActive: {
    color: "#05943c", // Matches your custom bright green!
  },

  // --- ADVANCED FILTER MENU STYLES ---
  advancedFilterBtn: {
    width: 44,
    height: 44,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  advancedFilterBtnActive: {
    backgroundColor: "#eefcf5",
    borderWidth: 1,
    borderColor: "#05943c",
  },
  advancedFilterMenu: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  filterScroll: {
    flexDirection: "row",
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: "#eefcf5",
    borderColor: "#05943c",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
  },
  filterChipTextActive: {
    color: "#05943c",
    fontWeight: "800",
  },

  // --- SCROLL & LIST ITEM STYLES (Your custom scroll tweaks) ---
  shoppingScroll: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    marginTop: 0, 
  },
  shoppingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  shoppingIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fef2f2", 
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  shoppingInfo: { flex: 1 },
  shoppingName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  shoppingMeta: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
});

