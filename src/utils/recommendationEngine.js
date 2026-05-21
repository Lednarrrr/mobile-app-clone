import recipes from '../data/recipes.json';
import ingredientSynonyms from '../data/ingredientSynonyms.json';

const READY_TO_COOK_THRESHOLD = 0.8;
const ALMOST_THERE_THRESHOLD = 0.5;

const KEY_PROTEINS = [
  'pork',
  'pork belly',
  'chicken',
  'beef',
  'fish',
  'milkfish',
  'egg',
];

function normalizeName(name = '') {
  return name.trim().toLowerCase();
}

function getRecipeIngredients(recipe) {
  if (recipe.requiredIngredients) {
    return recipe.requiredIngredients.map((ingredientName) => ({
      name: ingredientName,
      quantity: null,
      unit: null,
      substitutable: false,
    }));
  }

  return recipe.ingredients || [];
}

function isKeyProtein(ingredientName) {
  return KEY_PROTEINS.includes(getCanonicalIngredientName(ingredientName));
}

function getIngredientWeight(ingredient) {
  if (isKeyProtein(ingredient.name)) {
    return 2;
  }

  return 1;
}

function getRecommendationStatus(score) {
  if (score >= READY_TO_COOK_THRESHOLD) {
    return 'Ready to Cook';
  }

  if (score >= ALMOST_THERE_THRESHOLD) {
    return 'Almost There';
  }

  return null;
}

export function getCanonicalIngredientName(name) {
  const normalizedName = normalizeName(name);

  return ingredientSynonyms[normalizedName] || normalizedName;
}

export function getRecipeRecommendations(inventoryIngredients, options = {}) {
  const { category = 'All' } = options;

  const availableIngredientNames = new Set(
    inventoryIngredients.map((ingredient) =>
      getCanonicalIngredientName(ingredient.name)
    )
  );

  const recommendations = recipes
    .filter((recipe) => category === 'All' || recipe.category === category)
    .map((recipe) => {
      const recipeIngredients = getRecipeIngredients(recipe);
      const requiredIngredients = recipeIngredients.filter(
        (ingredient) => !ingredient.substitutable
      );
      const substitutableIngredients = recipeIngredients.filter(
        (ingredient) => ingredient.substitutable
      );

      const scoredIngredients =
        requiredIngredients.length > 0 ? requiredIngredients : recipeIngredients;

      const totalWeight = scoredIngredients.reduce(
        (total, ingredient) => total + getIngredientWeight(ingredient),
        0
      );

      const matchedRequiredIngredients = requiredIngredients.filter((ingredient) =>
        availableIngredientNames.has(getCanonicalIngredientName(ingredient.name))
      );

      const matchedSubstitutableIngredients = substitutableIngredients.filter(
        (ingredient) =>
          availableIngredientNames.has(getCanonicalIngredientName(ingredient.name))
      );

      const missingRequiredIngredients = requiredIngredients.filter(
        (ingredient) =>
          !availableIngredientNames.has(getCanonicalIngredientName(ingredient.name))
      );

      const matchedWeight = matchedRequiredIngredients.reduce(
        (total, ingredient) => total + getIngredientWeight(ingredient),
        0
      );

      const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;
      const status = getRecommendationStatus(score);

      if (!status) {
        return null;
      }

      return {
        ...recipe,
        score,
        matchPercentage: Math.round(score * 100),
        status,
        matchedIngredients: [
          ...matchedRequiredIngredients,
          ...matchedSubstitutableIngredients,
        ].map((ingredient) => ingredient.name),
        missingIngredients: missingRequiredIngredients.map(
          (ingredient) => ingredient.name
        ),
        optionalMissingIngredients: substitutableIngredients
          .filter(
            (ingredient) =>
              !availableIngredientNames.has(
                getCanonicalIngredientName(ingredient.name)
              )
          )
          .map((ingredient) => ingredient.name),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return recommendations;
}

export function getShoppingListFromRecommendations(recommendations) {
  const missingIngredientCounts = new Map();

  recommendations.forEach((recipe) => {
    recipe.missingIngredients.forEach((ingredientName) => {
      const currentCount = missingIngredientCounts.get(ingredientName) || 0;
      missingIngredientCounts.set(ingredientName, currentCount + 1);
    });
  });

  return Array.from(missingIngredientCounts.entries())
    .map(([name, recipeCount]) => ({
      name,
      recipeCount,
    }))
    .sort((a, b) => b.recipeCount - a.recipeCount || a.name.localeCompare(b.name));
}
