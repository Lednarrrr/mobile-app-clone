const fs = require("fs");
const path = require("path");

const recipesPath = path.join(__dirname, "..", "src", "data", "recipes.json");
const synonymsPath = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "ingredientSynonyms.json",
);

const recipes = JSON.parse(fs.readFileSync(recipesPath, "utf8"));
const synonymMap = JSON.parse(fs.readFileSync(synonymsPath, "utf8"));

const READY_TO_COOK_THRESHOLD = 80;
const ALMOST_THERE_THRESHOLD = 50;

function normalizeName(name = "") {
  return name.trim().toLowerCase();
}

function normalizeIngredient(name) {
  const normalized = normalizeName(name);
  return synonymMap[normalized] || normalized;
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

function computeTF(recipe) {
  const ingredients = getRecipeIngredients(recipe);
  const total = ingredients.length || 1;
  const tf = {};

  ingredients.forEach((ingredient) => {
    const name = normalizeIngredient(ingredient.name);
    tf[name] = (tf[name] || 0) + 1 / total;
  });

  return tf;
}

function computeIDF(recipesList) {
  const totalRecipes = recipesList.length || 1;
  const documentFrequency = {};

  recipesList.forEach((recipe) => {
    const seen = new Set();

    getRecipeIngredients(recipe).forEach((ingredient) => {
      const name = normalizeIngredient(ingredient.name);

      if (!seen.has(name)) {
        documentFrequency[name] = (documentFrequency[name] || 0) + 1;
        seen.add(name);
      }
    });
  });

  const idf = {};
  Object.keys(documentFrequency).forEach((ingredient) => {
    idf[ingredient] = Math.log(totalRecipes / documentFrequency[ingredient]);
  });

  return idf;
}

function buildTFIDFVectors(recipesList, idf) {
  return recipesList.map((recipe) => {
    const tf = computeTF(recipe);
    const tfidf = {};

    Object.keys(tf).forEach((ingredient) => {
      tfidf[ingredient] = tf[ingredient] * (idf[ingredient] || 0);
    });

    return { ...recipe, tfidf };
  });
}

function cosineSimilarity(vectorA, vectorB, allKeys) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  allKeys.forEach((key) => {
    const a = vectorA[key] || 0;
    const b = vectorB[key] || 0;

    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  });

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

function getRecommendationStatus(scorePercent) {
  if (scorePercent >= READY_TO_COOK_THRESHOLD) {
    return "Ready to Cook";
  }

  if (scorePercent >= ALMOST_THERE_THRESHOLD) {
    return "Almost There";
  }

  return null;
}

function recommend(userInventory, recipesList, options = {}) {
  const { category = "All" } = options;

  if (!userInventory || userInventory.length === 0) {
    return [];
  }

  const availableIngredientNames = new Set(
    userInventory.map((item) => normalizeIngredient(item.name)),
  );

  const filteredRecipes = recipesList.filter(
    (recipe) => category === "All" || recipe.category === category,
  );

  const idf = computeIDF(recipesList);
  const allKeys = Object.keys(idf);
  const tfidfRecipes = buildTFIDFVectors(filteredRecipes, idf);

  const userVector = {};
  Array.from(availableIngredientNames).forEach((name) => {
    userVector[name] = idf[name] || 0.1;
  });

  return tfidfRecipes
    .map((recipe) => {
      const recipeIngredients = getRecipeIngredients(recipe);
      const requiredIngredients = recipeIngredients.filter(
        (ingredient) => !ingredient.substitutable,
      );
      const substitutableIngredients = recipeIngredients.filter(
        (ingredient) => ingredient.substitutable,
      );

      const scoredIngredients =
        requiredIngredients.length > 0 ? requiredIngredients : recipeIngredients;

      const matchedRequiredIngredients = scoredIngredients.filter((ingredient) =>
        availableIngredientNames.has(normalizeIngredient(ingredient.name)),
      );

      const missingRequiredIngredients = scoredIngredients.filter(
        (ingredient) =>
          !availableIngredientNames.has(normalizeIngredient(ingredient.name)),
      );

      const shouldTrackOptional = requiredIngredients.length > 0;
      const matchedSubstitutableIngredients = shouldTrackOptional
        ? substitutableIngredients.filter((ingredient) =>
            availableIngredientNames.has(normalizeIngredient(ingredient.name)),
          )
        : [];

      const optionalMissingIngredients = shouldTrackOptional
        ? substitutableIngredients.filter(
            (ingredient) =>
              !availableIngredientNames.has(normalizeIngredient(ingredient.name)),
          )
        : [];

      const matchPercentage =
        scoredIngredients.length > 0
          ? Math.round(
              (matchedRequiredIngredients.length / scoredIngredients.length) * 100,
            )
          : 0;

      const status = getRecommendationStatus(matchPercentage);
      if (!status) {
        return null;
      }

      const similarityScore = cosineSimilarity(userVector, recipe.tfidf, allKeys);

      return {
        name: recipe.name,
        category: recipe.category,
        matchPercentage,
        status,
        score: similarityScore,
        matchedIngredients: [
          ...matchedRequiredIngredients,
          ...matchedSubstitutableIngredients,
        ].map((ingredient) => ingredient.name),
        missingIngredients: missingRequiredIngredients.map(
          (ingredient) => ingredient.name,
        ),
        optionalMissingIngredients: optionalMissingIngredients.map(
          (ingredient) => ingredient.name,
        ),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.matchPercentage - a.matchPercentage);
}

const sampleInventory = [
  { name: "baboy", quantity: 1, unit: "kg" },
  { name: "toyo", quantity: 200, unit: "ml" },
  { name: "suka", quantity: 200, unit: "ml" },
  { name: "bawang", quantity: 1, unit: "head" },
  { name: "sibuyas", quantity: 2, unit: "pcs" },
  { name: "laurel", quantity: 4, unit: "pcs" },
  { name: "paminta", quantity: 1, unit: "tsp" },
];

const results = recommend(sampleInventory, recipes, { category: "All" });

console.log("\nTop recommendations:");
results.slice(0, 5).forEach((recipe, index) => {
  console.log(
    `${index + 1}. ${recipe.name} (${recipe.matchPercentage}% - ${recipe.status})`,
  );
  if (recipe.missingIngredients.length) {
    console.log(`   Missing: ${recipe.missingIngredients.join(", ")}`);
  }
});

if (results.length === 0) {
  console.log("No matches. Try adding more inventory items.");
}
