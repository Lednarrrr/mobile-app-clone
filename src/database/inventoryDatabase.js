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
  db.execSync(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      category TEXT,
      expiry_date TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  addColumnIfMissing('ingredients', 'category', 'category TEXT');
  addColumnIfMissing('ingredients', 'expiry_date', 'expiry_date TEXT');
  addColumnIfMissing('ingredients', 'updated_at', 'updated_at TEXT');

  db.runSync(`
    UPDATE ingredients
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL;
  `);
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

export function addStarterInventory(ingredients) {
  ingredients.forEach((ingredient) => {
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
