import STATIC_RECIPES from '../data/recipes.json';

let INGREDIENT_TO_RECIPE_MAP = {};
let RECIPE_DICTIONARY = {};
let VALID_INGREDIENTS_SET = new Set();

// ==========================================
// PHASE 1: Build the Dynamic Master Index
// ==========================================
export function initializeRecommendationEngine(customRecipes = []) {
  INGREDIENT_TO_RECIPE_MAP = {};
  RECIPE_DICTIONARY = {};
  VALID_INGREDIENTS_SET.clear();

  // DEFENSE 1: Ensure customRecipes is actually an array
  const safeCustom = Array.isArray(customRecipes) ? customRecipes : [];
  const combinedRecipes = [...STATIC_RECIPES, ...safeCustom];

  combinedRecipes.forEach((recipe) => {
    if (!recipe) return; 

    RECIPE_DICTIONARY[recipe.id] = recipe;
    
    // DEFENSE 2: Ensure the ingredients array actually exists 
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients.forEach((ing) => {
        if (!ing || !ing.name) return; 

        const name = ing.name.toLowerCase().trim();
        VALID_INGREDIENTS_SET.add(name);
        
        if (!INGREDIENT_TO_RECIPE_MAP[name]) {
          INGREDIENT_TO_RECIPE_MAP[name] = [];
        }
        INGREDIENT_TO_RECIPE_MAP[name].push(recipe.id);
      });
    }
  });

  return {
    masterSet: VALID_INGREDIENTS_SET,
    fuseArray: Array.from(VALID_INGREDIENTS_SET).map(name => ({ name }))
  };
}

// ==========================================
// PHASE 2: Recommendation Logic
// ==========================================
export function getRecipeRecommendations(userIngredients) {
  const matchedRecipeCounts = {};

  if (!userIngredients || !Array.isArray(userIngredients)) return [];

  userIngredients.forEach((item) => {
    if (!item || !item.name) return;
    const itemName = item.name.toLowerCase().trim();

    if (!INGREDIENT_TO_RECIPE_MAP[itemName]) return;

    const triggeredRecipes = INGREDIENT_TO_RECIPE_MAP[itemName];
    triggeredRecipes.forEach((recipeId) => {
      matchedRecipeCounts[recipeId] = (matchedRecipeCounts[recipeId] || 0) + 1;
    });
  });

  return Object.keys(matchedRecipeCounts).map((recipeId) => {
    const recipe = RECIPE_DICTIONARY[recipeId];
    const matchCount = matchedRecipeCounts[recipeId];
    const totalRequired = recipe?.ingredients?.length || 1; 
    const status = matchCount >= totalRequired ? "Ready to Cook" : "Missing Ingredients";

    return { ...recipe, matchCount, totalRequired, status };
  }).sort((a, b) => b.matchCount - a.matchCount);
}

export function getShoppingListFromRecommendations(recommendations) {
  const missing = {};
  if (!recommendations || !Array.isArray(recommendations)) return [];
  
  recommendations.forEach(recipe => {
    if (recipe.status === "Missing Ingredients") {
      missing[recipe.name] = { name: `Ingredients for ${recipe.name}`, recipeCount: 1 };
    }
  });
  return Object.values(missing);
}

// ==========================================
// PHASE 3: Dynamic Appending (Delta Update)
// ==========================================
export function appendRecipeToEngine(newRecipe) {
  if (!newRecipe) return null;

  // 1. Add the new recipe directly to the Master Dictionary
  RECIPE_DICTIONARY[newRecipe.id] = newRecipe;

  // 2. Loop ONLY through this single new recipe's ingredients
  if (newRecipe.ingredients && Array.isArray(newRecipe.ingredients)) {
    newRecipe.ingredients.forEach((ing) => {
      if (!ing || !ing.name) return;
      const name = ing.name.toLowerCase().trim();

      // Update the Gatekeeper's Master Set
      VALID_INGREDIENTS_SET.add(name);

      // Inject directly into the Reverse Index!
      if (!INGREDIENT_TO_RECIPE_MAP[name]) {
        // If it's a brand new ingredient to the app, create a new array for it
        INGREDIENT_TO_RECIPE_MAP[name] = [];
      }
      
      // Push the new recipe ID into the specific ingredient's list
      INGREDIENT_TO_RECIPE_MAP[name].push(newRecipe.id);
    });
  }

  // Return the updated data so App.js can update the Autocomplete UI
  return {
    masterSet: VALID_INGREDIENTS_SET,
    fuseArray: Array.from(VALID_INGREDIENTS_SET).map(name => ({ name }))
  };
}