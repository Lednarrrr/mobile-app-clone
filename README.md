# Kusinera

**Tagline:** Luto nang matalino.

Kusinera is an offline-first Android prototype for Filipino karinderya owners. It helps users manage ingredient inventory, recommend Filipino dishes based on available ingredients, show missing ingredients, and generate a shopping list.

## Step 1: Project Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm start
   ```

3. Open on Android

   ```bash
   npm run android
   ```

## Folder Structure

- `app/` - Expo Router navigation files.
- `src/screens/` - Full app screens like inventory, recommendations, shopping list, privacy, and settings.
- `src/components/` - Reusable buttons, cards, inputs, and UI pieces.
- `src/database/` - SQLite setup and inventory queries.
- `src/data/` - Bundled offline data such as `recipes.json` and ingredient synonyms.
- `src/logic/` - Business logic such as the recommendation engine.
- `src/utils/` - Small helper functions shared across the app.
- `assets/` - Images, icons, splash screen, and fonts.

## MVP Scope

- Inventory add, edit, and delete.
- Offline recipe recommendations.
- Missing ingredients per dish.
- Shopping list generation.
- Android-first testing.
- First-launch data privacy declaration.

## Feature 2: Recipe Recommendation (ML)

Core AI/ML contribution: a content-based filtering pipeline that uses TF-IDF weighting
and cosine similarity to match the user's inventory against a bundled Filipino recipe
database.

### How it works

- Ingredient synonym normalization (original contribution): maps Filipino ingredient
   names to canonical names (e.g., baboy -> pork belly, bawang -> garlic).
- Match score computation: Score = (Matching Ingredients / Total Required) x 100.
- Three-tier result display:
   - 80% and above: Ready to cook
   - 50-79%: Almost there
   - Below 50%: Hidden
- Filter recommendations by dish category: Ulam, Sabaw, Prito, Gulay, Ihaw.

### Offline data

- Pre-loaded database of 100 Filipino karinderya dishes (offline).
- Generated via an LLM pipeline and bundled as `recipes.json` inside the app.

## Beginner Notes

This project uses Expo Router, which means files inside `app/` become screens. Most feature code should live inside `src/`, then route files can import those screens.

For the MVP, keep the app offline. Do not add login, Supabase, payments, barcode scanning, or image recognition yet.
