import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('kusinera_inventory.db');

function normalizeText(value) {
  return value?.trim().toLowerCase() || '';
}

function optionalText(value) {
  const cleanedValue = value?.trim();
  return cleanedValue ? cleanedValue : null;
}

function columnExists(tableName, columnName) {
  const columns = db.getAllSync(`PRAGMA table_info(${tableName});`);
  return columns.some((column) => column.name === columnName);
}

function addColumnIfMissing(tableName, columnName, columnDefinition) {
  if (!columnExists(tableName, columnName)) {
    db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition};`);
  }
}

export function initInventoryDatabase() {
  // CRITICAL FIX: Changed table name to 'ingredients' 
  // and added the missing created_at / updated_at columns!
  db.execSync(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      category TEXT,
      expiry_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- Custom Recipes Table ---
  db.execSync(`
    CREATE TABLE IF NOT EXISTS custom_recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      prep_time_minutes INTEGER,
      servings INTEGER,
      ingredients TEXT 
    );
  `);
}

// --- Add a Custom Recipe ---
export function addCustomRecipe(recipeObject) {
  const ingredientsString = JSON.stringify(recipeObject.ingredients);
  
  db.runSync(
    `INSERT INTO custom_recipes (id, name, category, prep_time_minutes, servings, ingredients) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      recipeObject.id, 
      recipeObject.name, 
      recipeObject.category, 
      recipeObject.prep_time_minutes, 
      recipeObject.servings, 
      ingredientsString
    ]
  );
}

// --- Get all Custom Recipes ---
export function getCustomRecipes() {
  const rows = db.getAllSync(`SELECT * FROM custom_recipes`);
  
  return rows.map(row => {
    let parsedIngredients = [];
    try {
      // Defensive parsing just in case the SQLite string is corrupted
      parsedIngredients = JSON.parse(row.ingredients);
    } catch (e) {
      console.warn(`Failed to parse ingredients for recipe ${row.id}`);
    }
    
    return {
      ...row,
      ingredients: parsedIngredients
    };
  });
}

export function getIngredients() {
  return db.getAllSync(`
    SELECT
      id,
      name,
      quantity,
      unit,
      category,
      expiry_date,
      created_at,
      updated_at
    FROM ingredients
    ORDER BY name ASC;
  `);
}

export function getIngredientById(id) {
  return db.getFirstSync(
    `
      SELECT
        id,
        name,
        quantity,
        unit,
        category,
        expiry_date,
        created_at,
        updated_at
      FROM ingredients
      WHERE id = ?;
    `,
    [id]
  );
}

export function addIngredient(name, quantity, unit, category = '', expiryDate = '') {
  db.runSync(
    `
      INSERT INTO ingredients (
        name,
        quantity,
        unit,
        category,
        expiry_date
      )
      VALUES (?, ?, ?, ?, ?);
    `,
    [
      normalizeText(name),
      quantity ? Number(quantity) : null,
      optionalText(unit),
      optionalText(category),
      optionalText(expiryDate),
    ]
  );
}

export function addStarterInventory(ingredientsList) {
  ingredientsList.forEach((ingredient) => {
    addIngredient(
      ingredient.name,
      ingredient.quantity,
      ingredient.unit,
      ingredient.category
    );
  });
}

export function updateIngredient(
  id,
  name,
  quantity,
  unit,
  category = '',
  expiryDate = ''
) {
  db.runSync(
    `
      UPDATE ingredients
      SET
        name = ?,
        quantity = ?,
        unit = ?,
        category = ?,
        expiry_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?;
    `,
    [
      normalizeText(name),
      quantity ? Number(quantity) : null,
      optionalText(unit),
      optionalText(category),
      optionalText(expiryDate),
      id,
    ]
  );
}

export function deleteIngredient(id) {
  db.runSync('DELETE FROM ingredients WHERE id = ?;', [id]);
}

export function deleteAllIngredients() {
  db.runSync('DELETE FROM ingredients;');
}