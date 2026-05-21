import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getRecipeRecommendations } from '../utils/recommendationEngine';

const CATEGORIES = ['All', 'Ulam', 'Sabaw', 'Prito', 'Gulay', 'Ihaw', 'Kakanin'];

export default function RecommendationScreen({ ingredients }) {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const recommendations = useMemo(
    () => getRecipeRecommendations(ingredients, { category: selectedCategory }),
    [ingredients, selectedCategory]
  );

  const readyCount = recommendations.filter(
    (recipe) => recipe.status === 'Ready to Cook'
  ).length;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroPanel}>
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles-outline" size={24} color="#f7f3ea" />
        </View>
        <View style={styles.heroTextGroup}>
          <Text style={styles.heroTitle}>What can I cook right now?</Text>
          <Text style={styles.heroText}>
            {recommendations.length} matches found, {readyCount} ready to cook.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        contentContainerStyle={styles.filterRow}
        showsHorizontalScrollIndicator={false}
      >
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category;

          return (
            <Pressable
              key={category}
              style={[styles.filterButton, isSelected && styles.activeFilter]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  isSelected && styles.activeFilterText,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.screenTitle}>Recipe matches</Text>
        <Text style={styles.screenSubtitle}>
          Dishes ranked by available stock and required ingredients.
        </Text>
      </View>

      {recommendations.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptyText}>
            Add more ingredients or switch category to see possible dishes.
          </Text>
        </View>
      ) : (
        recommendations.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))
      )}
    </ScrollView>
  );
}

function RecipeCard({ recipe }) {
  const isReady = recipe.status === 'Ready to Cook';

  return (
    <View style={styles.recipeCard}>
      <View style={styles.recipeTopRow}>
        <View style={styles.recipeNameGroup}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Text style={styles.recipeCategory}>
            {recipe.category} | {recipe.prep_time_minutes} min | {recipe.servings}{' '}
            servings
          </Text>
        </View>

        <View style={[styles.statusPill, isReady ? styles.readyPill : styles.almostPill]}>
          <Ionicons
            name={isReady ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={isReady ? '#1f6a45' : '#9a5b13'}
          />
          <Text
            style={[
              styles.statusPillText,
              isReady ? styles.readyPillText : styles.almostPillText,
            ]}
          >
            {isReady ? 'Ready' : 'Almost'}
          </Text>
        </View>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Ingredient match</Text>
        <Text style={styles.progressValue}>{recipe.matchPercentage}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[styles.progressFill, { width: `${recipe.matchPercentage}%` }]}
        />
      </View>

      <View style={styles.recipeDetails}>
        <DetailBlock label="Have" value={recipe.matchedIngredients.join(', ')} />
        <DetailBlock
          label="Missing required"
          value={
            recipe.missingIngredients.length > 0
              ? recipe.missingIngredients.join(', ')
              : 'None'
          }
        />
        {recipe.optionalMissingIngredients?.length > 0 && (
          <DetailBlock
            label="Optional add-ons"
            value={recipe.optionalMissingIngredients.join(', ')}
          />
        )}
      </View>
    </View>
  );
}

function DetailBlock({ label, value }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },
  heroPanel: {
    alignItems: 'center',
    backgroundColor: '#1f6a45',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 13,
    marginBottom: 14,
    padding: 16,
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#2f7d50',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  heroTextGroup: {
    flex: 1,
  },
  heroTitle: {
    color: '#f7f3ea',
    fontSize: 18,
    fontWeight: '900',
  },
  heroText: {
    color: '#dcebdd',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterButton: {
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  activeFilter: {
    backgroundColor: '#fff0d0',
    borderColor: '#b35f2b',
  },
  filterButtonText: {
    color: '#6a6f69',
    fontSize: 13,
    fontWeight: '900',
  },
  activeFilterText: {
    color: '#9a5b13',
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
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
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
});
