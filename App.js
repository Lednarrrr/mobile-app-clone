import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  addStarterInventory,
  getIngredients,
  initInventoryDatabase,
} from './src/database/inventoryDatabase';
import { KARINDERYA_STARTER_INVENTORY } from './src/data/starterInventory';
import InventoryScreen from './src/screens/InventoryScreen';
import RecommendationScreen from './src/screens/RecommendationScreen';
import {
  getRecipeRecommendations,
  getShoppingListFromRecommendations,
} from './src/utils/recommendationEngine';

const NAV_ITEMS = [
  { key: 'inventory', label: 'Inventory', icon: 'basket-outline' },
  { key: 'recommendations', label: 'Recipes', icon: 'restaurant-outline' },
  { key: 'shopping', label: 'Shopping', icon: 'cart-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

const ONBOARDING_COMPLETE_KEY = 'kusinera_onboarding_complete';
const KARINDERYA_TYPES = [
  'Daily ulam stall',
  'Turo-turo eatery',
  'School or workplace canteen',
  'Small family karinderya',
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState('inventory');
  const [ingredients, setIngredients] = useState([]);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Luto nang matalino</Text>
            <Text style={styles.appTitle}>Kusinera</Text>
          </View>

          <View style={styles.brandMark}>
            <Ionicons name="flame-outline" size={24} color="#f7f3ea" />
          </View>
        </View>

        <Text style={styles.subtitle}>
          Your offline karinderya kitchen assistant for stock, recipes, and
          missing ingredients.
        </Text>

        <View style={styles.statsRow}>
          <StatCard label="Stock" value={ingredients.length} />
          <StatCard label="Matches" value={recommendations.length} />
          <StatCard label="Ready" value={readyCount} />
        </View>

        <View style={styles.content}>
          {activeScreen === 'inventory' && (
            <InventoryScreen
              ingredients={ingredients}
              onInventoryChange={loadIngredients}
            />
          )}

          {activeScreen === 'recommendations' && (
            <RecommendationScreen ingredients={ingredients} />
          )}

          {activeScreen === 'shopping' && (
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
        />
      </View>
    </SafeAreaView>
  );
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
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BottomNavigation({ activeScreen, onChangeScreen }) {
  return (
    <View style={styles.bottomNav}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeScreen === item.key;

        return (
          <Pressable
            key={item.key}
            style={[styles.navButton, isActive && styles.activeNavButton]}
            onPress={() => onChangeScreen(item.key)}
          >
            <Ionicons
              name={item.icon}
              size={21}
              color={isActive ? '#f7f3ea' : '#6a6f69'}
            />
            <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
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
    backgroundColor: '#f7f3ea',
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
    backgroundColor: '#f7f3ea',
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#b35f2b',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  appTitle: {
    color: '#1c2a22',
    fontSize: 34,
    fontWeight: '900',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#1f6a45',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  subtitle: {
    color: '#647067',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statValue: {
    color: '#1f6a45',
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#6f766f',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  screenTitle: {
    color: '#1c2a22',
    fontSize: 23,
    fontWeight: '900',
  },
  screenSubtitle: {
    color: '#69746c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  recipeCard: {
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  recipeTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  recipeNameGroup: {
    flex: 1,
  },
  recipeName: {
    color: '#1c2a22',
    fontSize: 18,
    fontWeight: '900',
  },
  recipeCategory: {
    color: '#7a8179',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  readyPill: {
    backgroundColor: '#e1f3e7',
  },
  almostPill: {
    backgroundColor: '#fff0d0',
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  readyPillText: {
    color: '#1f6a45',
  },
  almostPillText: {
    color: '#9a5b13',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  progressLabel: {
    color: '#69746c',
    fontSize: 13,
    fontWeight: '800',
  },
  progressValue: {
    color: '#1c2a22',
    fontSize: 13,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#edf0ea',
    borderRadius: 8,
    height: 9,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#2f7d50',
    borderRadius: 8,
    height: '100%',
  },
  recipeDetails: {
    borderTopColor: '#f0e7d8',
    borderTopWidth: 1,
    marginTop: 15,
    paddingTop: 13,
  },
  detailBlock: {
    marginBottom: 10,
  },
  detailLabel: {
    color: '#1c2a22',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  detailText: {
    color: '#69746c',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: '#1c2a22',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 5,
  },
  emptyText: {
    color: '#69746c',
    fontSize: 15,
    lineHeight: 21,
  },
  shoppingItem: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 14,
  },
  shoppingIcon: {
    alignItems: 'center',
    backgroundColor: '#e1f3e7',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  shoppingInfo: {
    flex: 1,
  },
  shoppingName: {
    color: '#1c2a22',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  shoppingMeta: {
    color: '#69746c',
    fontSize: 13,
    marginTop: 3,
  },
  settingsCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  settingsTextGroup: {
    flex: 1,
  },
  settingsTitle: {
    color: '#1c2a22',
    fontSize: 16,
    fontWeight: '900',
  },
  settingsText: {
    color: '#69746c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  settingsAction: {
    alignItems: 'center',
    backgroundColor: '#fff8e8',
    borderColor: '#f0dfb5',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    padding: 14,
  },
  settingsActionText: {
    color: '#b35f2b',
    fontSize: 14,
    fontWeight: '900',
  },
  bottomNav: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    bottom: 12,
    flexDirection: 'row',
    gap: 6,
    left: 16,
    padding: 6,
    position: 'absolute',
    right: 16,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 54,
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  activeNavButton: {
    backgroundColor: '#1f6a45',
  },
  navLabel: {
    color: '#6a6f69',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },
  activeNavLabel: {
    color: '#f7f3ea',
  },
});
