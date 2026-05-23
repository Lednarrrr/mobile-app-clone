import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  addStarterInventory,
  addIngredient,
  getIngredients,
  initInventoryDatabase,
} from './src/database/inventoryDatabase';
import { KARINDERYA_STARTER_INVENTORY } from './src/data/starterInventory';
import INGREDIENT_SYNONYMS from './src/data/ingredientSynonyms.json';
import InventoryScreen from './src/screens/InventoryScreen';
import RecommendationScreen from './src/screens/RecommendationScreen';
import {
  getRecipeRecommendations,
  getShoppingListFromRecommendations,
} from './src/utils/recommendationEngine';

const NAV_ITEMS = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'inventory', label: 'Inventory', icon: 'archive-outline' },
  { key: 'cook', label: 'Cook', icon: 'restaurant-outline' },
  { key: 'buy', label: 'Profile', icon: 'person-outline' },
];

const TOP_DISHES = [
  {
    id: 'dish-1',
    name: 'Chicken Adobo',
    subtitle: 'A traditional Filipino dish',
    icon: 'restaurant-outline',
    colors: ['#f4dcc3', '#f3b37a'],
  },
  {
    id: 'dish-2',
    name: 'Pork Sinigang',
    subtitle: 'A traditional Filipino dish',
    icon: 'leaf-outline',
    colors: ['#d8efde', '#87c79f'],
  },
  {
    id: 'dish-3',
    name: 'Pinakbet',
    subtitle: 'A traditional Filipino dish',
    icon: 'nutrition-outline',
    colors: ['#f8d9a5', '#ea8d4e'],
  },
];

const ONBOARDING_COMPLETE_KEY = 'kusinera_onboarding_complete';
const KARINDERYA_TYPES = [
  'Daily ulam stall',
  'Turo-turo eatery',
  'School or workplace canteen',
  'Small family karinderya',
];

const UNIT_OPTIONS = [
  'pcs',
  'g',
  'kg',
  'ml',
  'l',
  'cups',
  'tbsp',
  'tsp',
  'pack',
  'bottle',
];

const CATEGORY_OPTIONS = [
  'Meat',
  'Seafood',
  'Vegetables',
  'Fruits',
  'Dairy',
  'Pantry',
  'Spices',
  'Condiments',
  'Other',
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState('home');
  const [ingredients, setIngredients] = useState([]);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [newItemExpiry, setNewItemExpiry] = useState('');
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
    setHasCompletedOnboarding(savedStatus === 'true');
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

    await SecureStore.setItemAsync(ONBOARDING_COMPLETE_KEY, 'true');
    setHasCompletedOnboarding(true);
  }

  const recommendations = getRecipeRecommendations(ingredients);
  const shoppingList = getShoppingListFromRecommendations(recommendations);
  const readyCount = recommendations.filter(
    (recipe) => recipe.status === 'Ready to Cook'
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
      setNewItemName('');
      setNewItemQty('');
      setNewItemUnit('');
      setNewItemCategory('');
      setCustomCategory('');
      setNewItemExpiry('');
      setExpiryDateValue(null);
    });
  }

  function formatDateValue(dateValue) {
    const year = dateValue.getFullYear();
    const month = `${dateValue.getMonth() + 1}`.padStart(2, '0');
    const day = `${dateValue.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function handleExpiryChange(event, selectedDate) {
    if (event?.type === 'dismissed') {
      setIsExpiryPickerOpen(false);
      return;
    }

    const nextDate = selectedDate || expiryDateValue || new Date();
    setExpiryDateValue(nextDate);
    setNewItemExpiry(formatDateValue(nextDate));

    if (Platform.OS === 'android') {
      setIsExpiryPickerOpen(false);
    }
  }

  function normalizeLookupValue(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  const normalizedName = normalizeLookupValue(newItemName);
  const synonymMatch = normalizedName
    ? INGREDIENT_SYNONYMS[normalizedName] || findClosestSynonym(normalizedName)
    : '';

  function handleAddItem() {
    if (!newItemName.trim()) {
      return;
    }

    addIngredient(
      newItemName,
      newItemQty,
      newItemUnit,
      newItemCategory === 'Other' ? customCategory : newItemCategory,
      newItemExpiry
    );
    loadIngredients();
    closeAddModal();
  }

  function findClosestSynonym(value) {
    const candidates = Object.keys(INGREDIENT_SYNONYMS).filter((key) =>
      key.includes(value) || value.includes(key)
    );

    if (candidates.length === 0) {
      return '';
    }

    const bestKey = candidates.sort((a, b) => b.length - a.length)[0];
    return INGREDIENT_SYNONYMS[bestKey] || '';
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <View style={styles.content}>
          {activeScreen === 'home' && (
            <HomeScreen
              ingredientsCount={ingredients.length}
              readyCount={readyCount}
              expiringSoonCount={expiringSoonCount}
              shoppingCount={shoppingList.length}
              onGoToCook={() => setActiveScreen('cook')}
              onGoToInventory={() => setActiveScreen('inventory')}
              onGoToBuy={() => setActiveScreen('buy')}
              onGoToSettings={() => setActiveScreen('settings')}
            />
          )}

          {activeScreen === 'inventory' && (
            <InventoryScreen
              ingredients={ingredients}
              onInventoryChange={loadIngredients}
            />
          )}

          {activeScreen === 'cook' && (
            <RecommendationScreen ingredients={ingredients} />
          )}

          {activeScreen === 'buy' && (
            <ShoppingList shoppingList={shoppingList} />
          )}

          {activeScreen === 'settings' && (
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
      </View>

      <Modal
        animationType="none"
        transparent
        visible={isAddModalVisible}
        onRequestClose={closeAddModal}
      >
        <Animated.View
          style={[
            styles.modalBackdrop,
            { opacity: modalBackdropOpacity },
          ]}
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
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.matchText}>
                  Matched: {synonymMatch}
                </Text>
              </View>
            ) : null}

            <Text style={styles.modalFieldLabel}>Category</Text>
            <View style={styles.dropdownField}>
              <Pressable
                style={styles.selectRow}
                onPress={() => setIsCategoryMenuOpen((open) => !open)}
              >
                <Text style={styles.selectText}>
                  {newItemCategory || 'Select category'}
                </Text>
                <Ionicons
                  name={isCategoryMenuOpen ? 'chevron-up' : 'chevron-down'}
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
            {newItemCategory === 'Other' ? (
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
                      {newItemUnit || 'Select unit'}
                    </Text>
                    <Ionicons
                      name={isUnitMenuOpen ? 'chevron-up' : 'chevron-down'}
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
                  newItemExpiry
                    ? styles.expiryText
                    : styles.expiryPlaceholder
                }
              >
                {newItemExpiry || 'Select date'}
              </Text>
            </Pressable>
            {isExpiryPickerOpen ? (
              <View style={styles.expiryPickerWrap}>
                <DateTimePicker
                  value={expiryDateValue || new Date()}
                  mode="date"
                  display="default"
                  onChange={handleExpiryChange}
                />
                {Platform.OS === 'ios' ? (
                  <Pressable
                    style={styles.expiryDone}
                    onPress={() => setIsExpiryPickerOpen(false)}
                  >
                    <Text style={styles.expiryDoneText}>Done</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable style={styles.modalPrimaryButton} onPress={handleAddItem}>
              <Text style={styles.modalPrimaryText}>Save</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

function getExpiringSoonCount(ingredients) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  return ingredients.filter((ingredient) => {
    if (!ingredient.expiry_date) {
      return false;
    }

    const expiryDate = new Date(ingredient.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    return expiryDate >= today && expiryDate <= threeDaysFromNow;
  }).length;
}

function OnboardingScreen({ onComplete }) {
  const [selectedType, setSelectedType] = useState(KARINDERYA_TYPES[0]);
  const [useStarterPack, setUseStarterPack] = useState(true);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.onboardingContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.onboardingMark}>
          <Ionicons name="flame-outline" size={32} color="#f7f3ea" />
        </View>

        <Text style={styles.onboardingEyebrow}>Luto nang matalino</Text>
        <Text style={styles.onboardingTitle}>Welcome to Kusinera</Text>
        <Text style={styles.onboardingText}>
          Built for karinderya owners who need offline inventory tracking,
          recipe matches, and missing-ingredient lists.
        </Text>

        <View style={styles.setupSection}>
          <Text style={styles.setupTitle}>What kind of karinderya do you run?</Text>

          {KARINDERYA_TYPES.map((type) => {
            const isSelected = selectedType === type;

            return (
              <Pressable
                key={type}
                style={[styles.choiceButton, isSelected && styles.selectedChoice]}
                onPress={() => setSelectedType(type)}
              >
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={isSelected ? '#1f6a45' : '#7a8179'}
                />
                <Text
                  style={[
                    styles.choiceText,
                    isSelected && styles.selectedChoiceText,
                  ]}
                >
                  {type}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.starterPackCard, useStarterPack && styles.selectedStarterPack]}
          onPress={() => setUseStarterPack(!useStarterPack)}
        >
          <View style={styles.starterPackHeader}>
            <View>
              <Text style={styles.starterPackTitle}>Typical starter inventory</Text>
              <Text style={styles.starterPackText}>
                Add rice, pork, chicken, oil, garlic, onion, soy sauce, vinegar,
                and other common karinderya ingredients.
              </Text>
            </View>
            <Ionicons
              name={useStarterPack ? 'checkbox' : 'square-outline'}
              size={24}
              color="#1f6a45"
            />
          </View>
        </Pressable>

        <View style={styles.privacyBox}>
          <Ionicons name="shield-checkmark-outline" size={23} color="#1f6a45" />
          <Text style={styles.privacyText}>
            MVP data is stored locally on this device. No inventory data is
            uploaded to the cloud.
          </Text>
        </View>

        <Pressable
          style={styles.onboardingButton}
          onPress={() => onComplete({ selectedType, useStarterPack })}
        >
          <Text style={styles.onboardingButtonText}>Start managing inventory</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }) {
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

function getStatIcon(label) {
  switch (label) {
    case 'Stock':
      return 'cube-outline';
    case 'Ready To Cook':
      return 'flame-outline';
    case 'Expiring Soon':
      return 'time-outline';
    case 'To Buy':
      return 'cart-outline';
    default:
      return 'apps-outline';
  }
}

function getStatAccent(label) {
  switch (label) {
    case 'Stock':
      return '#f0dcc3';
    case 'Ready To Cook':
      return '#d9f0df';
    case 'Expiring Soon':
      return '#f9e0b8';
    case 'To Buy':
      return '#dfe8f8';
    default:
      return '#eef0f3';
  }
}

function HomeScreen({
  ingredientsCount,
  readyCount,
  expiringSoonCount,
  shoppingCount,
  onGoToCook,
  onGoToInventory,
  onGoToBuy,
  onGoToSettings,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.homeScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.homeHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandChip}>
            <Ionicons name="restaurant-outline" size={18} color="#111827" />
          </View>
          <View style={styles.brandTextGroup}>
            <Text style={styles.brandTitle}>KusinaAI</Text>
            <Text style={styles.brandSubtitle}>
              Traditional Filipino kitchen assistant
            </Text>
          </View>
          <Pressable style={styles.notificationButton} onPress={onGoToSettings}>
            <Ionicons name="notifications-outline" size={20} color="#111827" />
          </Pressable>
        </View>

        <Text style={styles.greeting}>Magandang Araw, Guest</Text>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#8b8f97" />
          <Text style={styles.searchPlaceholder}>Search</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          icon="cube"
          label="Stock"
          value={ingredientsCount}
        />
        <StatCard
          icon="flame"
          label="Ready To Cook"
          value={readyCount}
        />
        <StatCard
          icon="time"
          label="Expiring Soon"
          value={expiringSoonCount}
        />
        <StatCard icon="cart" label="To Buy" value={shoppingCount} />
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Top Dishes To Cook</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dishRow}>
        {TOP_DISHES.map((dish) => (
          <Pressable key={dish.id} style={styles.dishCard} onPress={onGoToCook}>
            <View style={[styles.dishArt, { backgroundColor: dish.colors[0] }]}>
              <View style={[styles.dishArtAccent, { backgroundColor: dish.colors[1] }]} />
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

function BottomNavigation({ activeScreen, onChangeScreen, onAddPress }) {
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
                color={isActive ? '#111827' : '#8b8f97'}
              />
              <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.centerAction}
        onPress={onAddPress}
      >
        <Ionicons name="add" size={26} color="#111827" />
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
                color={isActive ? '#111827' : '#8b8f97'}
              />
              <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
              <Ionicons name="add-outline" size={20} color="#1f6a45" />
            </View>
            <View style={styles.shoppingInfo}>
              <Text style={styles.shoppingName}>{item.name}</Text>
              <Text style={styles.shoppingMeta}>
                Needed by {item.recipeCount} matched recipe
                {item.recipeCount > 1 ? 's' : ''}
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
        <Ionicons name="shield-checkmark-outline" size={28} color="#1f6a45" />
        <View style={styles.settingsTextGroup}>
          <Text style={styles.settingsTitle}>Offline-first prototype</Text>
          <Text style={styles.settingsText}>
            Inventory data is stored locally on this device for the MVP.
          </Text>
        </View>
      </View>

      <Pressable style={styles.settingsAction} onPress={onResetOnboarding}>
        <Ionicons name="refresh-outline" size={22} color="#b35f2b" />
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
    backgroundColor: '#f6f2ea',
    flex: 1,
  },
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: {
    color: '#1c2a22',
    fontSize: 34,
    fontWeight: '900',
  },
  loadingText: {
    color: '#69746c',
    fontSize: 15,
    marginTop: 8,
  },
  onboardingContent: {
    padding: 22,
    paddingBottom: 34,
  },
  onboardingMark: {
    alignItems: 'center',
    backgroundColor: '#1f6a45',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    marginBottom: 20,
    width: 58,
  },
  onboardingEyebrow: {
    color: '#b35f2b',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  onboardingTitle: {
    color: '#1c2a22',
    fontSize: 34,
    fontWeight: '900',
  },
  onboardingText: {
    color: '#69746c',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 10,
  },
  setupSection: {
    marginTop: 26,
  },
  setupTitle: {
    color: '#1c2a22',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },
  choiceButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    padding: 14,
  },
  selectedChoice: {
    backgroundColor: '#e1f3e7',
    borderColor: '#1f6a45',
  },
  choiceText: {
    color: '#5f655f',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  selectedChoiceText: {
    color: '#1f6a45',
  },
  starterPackCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 16,
  },
  selectedStarterPack: {
    borderColor: '#1f6a45',
  },
  starterPackHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  starterPackTitle: {
    color: '#1c2a22',
    fontSize: 16,
    fontWeight: '900',
  },
  starterPackText: {
    color: '#69746c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  privacyBox: {
    alignItems: 'flex-start',
    backgroundColor: '#fff8e8',
    borderColor: '#f0dfb5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 14,
  },
  privacyText: {
    color: '#5f655f',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  onboardingButton: {
    alignItems: 'center',
    backgroundColor: '#1f6a45',
    borderRadius: 8,
    marginTop: 18,
    paddingVertical: 15,
  },
  onboardingButtonText: {
    color: '#f7f3ea',
    fontSize: 15,
    fontWeight: '900',
  },
  container: {
    backgroundColor: '#f6f2ea',
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 10,
  },
  content: {
    flex: 1,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  homeScrollContent: {
    paddingBottom: 104,
  },
  homeHeader: {
    backgroundColor: '#fffdf8',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#eee4d3',
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 2,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandChip: {
    alignItems: 'center',
    backgroundColor: '#f4d4a7',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brandTextGroup: {
    flex: 1,
    marginLeft: 10,
  },
  brandTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  brandSubtitle: {
    color: '#8b8f97',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  notificationButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
    borderWidth: 1,
    borderColor: '#efe6d8',
  },
  greeting: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    color: '#8b8f97',
    fontSize: 15,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  statCardModern: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#edf0f4',
    minHeight: 102,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '48%',
    alignItems: 'flex-start',
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 1,
  },
  statTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
  },
  statIconWrap: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  statValueInline: {
    color: '#0f1724',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 38,
  },
  statLabelModern: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'left',
  },
  trendPill: {
    alignItems: 'center',
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  trendUp: {
    backgroundColor: '#e8f6ee',
  },
  trendDown: {
    backgroundColor: '#fdecec',
  },
  sectionHeaderRow: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  dishRow: {
    gap: 12,
    paddingRight: 8,
  },
  dishCard: {
    width: 146,
    marginRight: 12,
  },
  dishArt: {
    height: 132,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 2,
  },
  dishArtAccent: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderRadius: 42,
    right: -10,
    top: -8,
    opacity: 0.4,
  },
  dishName: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
  },
  dishSubtitle: {
    color: '#8b8f97',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: '#f3f1eb',
    borderRadius: 0,
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'absolute',
    right: 0,
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 4,
  },
  navGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 14,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  activeNavButton: {
    backgroundColor: 'transparent',
  },
  navLabel: {
    color: '#8b8f97',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },
  activeNavLabel: {
    color: '#111827',
  },
  centerAction: {
    alignItems: 'center',
    backgroundColor: '#e7e1d8',
    borderRadius: 999,
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 12,
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    transform: [{ translateY: -22 }],
    width: 56,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  modalHandle: {
    alignSelf: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 999,
    height: 4,
    marginBottom: 12,
    width: 48,
  },
  modalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    flex: 1,
  },
  modalHeaderSpacer: {
    height: 32,
    width: 32,
  },
  modalClose: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  modalFieldLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 12,
  },
  matchRow: {
    alignItems: 'center',
    backgroundColor: '#e8f8ee',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  matchText: {
    color: '#16a34a',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  formColumn: {
    flex: 1,
  },
  dropdownField: {
    position: 'relative',
  },
  selectRow: {
    alignItems: 'center',
    borderColor: '#e5e7eb',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectText: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  selectMenu: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    paddingVertical: 4,
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    shadowColor: '#111827',
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
    color: '#111827',
    fontSize: 13,
    fontWeight: '500',
  },
  modalInput: {
    borderColor: '#e5e7eb',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expiryRow: {
    alignItems: 'center',
    borderColor: '#e5e7eb',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expiryText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  expiryPlaceholder: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  expiryPickerWrap: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  expiryDone: {
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 8,
    paddingVertical: 8,
  },
  expiryDoneText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#d4a20b',
    borderRadius: 16,
    marginTop: 18,
    paddingVertical: 14,
  },
  modalPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
