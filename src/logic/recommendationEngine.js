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


  const safeCustom = Array.isArray(customRecipes) ? customRecipes : [];
  const combinedRecipes = [...STATIC_RECIPES, ...safeCustom];


  combinedRecipes.forEach((recipe) => {
    if (!recipe) return;


    RECIPE_DICTIONARY[recipe.id] = recipe;
   
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


  if (userIngredients && Array.isArray(userIngredients)) {
    userIngredients.forEach((item) => {
      if (!item || !item.name) return;
      const itemName = item.name.toLowerCase().trim();


      if (!INGREDIENT_TO_RECIPE_MAP[itemName]) return;


      const triggeredRecipes = INGREDIENT_TO_RECIPE_MAP[itemName];
      triggeredRecipes.forEach((recipeId) => {
        matchedRecipeCounts[recipeId] = (matchedRecipeCounts[recipeId] || 0) + 1;
      });
    });
  }


  // Returns ALL recipes, defaulting to 0 matches if none exist in pantry
  return Object.keys(RECIPE_DICTIONARY).map((recipeId) => {
    const recipe = RECIPE_DICTIONARY[recipeId];
    const matchCount = matchedRecipeCounts[recipeId] || 0;
    const totalRequired = recipe?.ingredients?.length || 1;
    const status = matchCount >= totalRequired ? "Ready to Cook" : "Missing Ingredients";


    return { ...recipe, matchCount, totalRequired, status };
  }).sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.name.localeCompare(b.name);
  });
}


export function getShoppingListFromRecommendations(recommendations) {
  const missing = {};
  if (!recommendations || !Array.isArray(recommendations)) return [];
 
  recommendations.forEach(recipe => {
    // Only generates a shopping list if the user has at least 1 matching item
    if (recipe.status === "Missing Ingredients" && recipe.matchCount > 0) {
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


  RECIPE_DICTIONARY[newRecipe.id] = newRecipe;


  if (newRecipe.ingredients && Array.isArray(newRecipe.ingredients)) {
    newRecipe.ingredients.forEach((ing) => {
      if (!ing || !ing.name) return;
      const name = ing.name.toLowerCase().trim();


      VALID_INGREDIENTS_SET.add(name);


      if (!INGREDIENT_TO_RECIPE_MAP[name]) {
        INGREDIENT_TO_RECIPE_MAP[name] = [];
      }
     
      INGREDIENT_TO_RECIPE_MAP[name].push(newRecipe.id);
    });
  }


  return {
    masterSet: VALID_INGREDIENTS_SET,
    fuseArray: Array.from(VALID_INGREDIENTS_SET).map(name => ({ name }))
  };
}

