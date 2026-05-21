import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addIngredient,
  deleteIngredient,
  updateIngredient,
} from '../database/inventoryDatabase';
import { getCanonicalIngredientName } from '../utils/recommendationEngine';

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDate(dateText) {
  if (!dateText) {
    return null;
  }

  const [year, month, day] = dateText.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function isBeforeToday(dateText) {
  const date = parseDate(dateText);

  if (!date) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

export default function InventoryScreen({ ingredients, onInventoryChange }) {
  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);

  const isEditing = editingIngredientId !== null;

  function resetForm() {
    setEditingIngredientId(null);
    setName('');
    setQuantity('');
    setUnit('');
    setCategory('');
    setExpiryDate('');
    setShowExpiryPicker(false);
  }

  function handleAddIngredient() {
    if (!name.trim()) {
      Alert.alert('Missing ingredient name', 'Please enter an ingredient name.');
      return;
    }

    if (expiryDate && isBeforeToday(expiryDate)) {
      Alert.alert(
        'Invalid expiry date',
        'Please choose today or a future date for the ingredient expiry.'
      );
      return;
    }

    if (isEditing) {
      updateIngredient(
        editingIngredientId,
        name,
        quantity,
        unit,
        category,
        expiryDate
      );
    } else {
      addIngredient(name, quantity, unit, category, expiryDate);
    }

    resetForm();
    onInventoryChange();
  }

  function handleEditIngredient(ingredient) {
    setEditingIngredientId(ingredient.id);
    setName(ingredient.name);
    setQuantity(
      ingredient.quantity !== null && ingredient.quantity !== undefined
        ? String(ingredient.quantity)
        : ''
    );
    setUnit(ingredient.unit || '');
    setCategory(ingredient.category || '');
    setExpiryDate(ingredient.expiry_date || '');
  }

  function handleDeleteIngredient(id) {
    Alert.alert(
      'Delete ingredient?',
      'This removes the ingredient from your local inventory.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (editingIngredientId === id) {
              resetForm();
            }

            deleteIngredient(id);
            onInventoryChange();
          },
        },
      ]
    );
  }

  function handleExpiryDateChange(event, selectedDate) {
    setShowExpiryPicker(false);

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setExpiryDate(formatDate(selectedDate));
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.title}>Pantry stock</Text>
          <Text style={styles.subtitle}>Add the ingredients available today.</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>
          {isEditing ? 'Edit ingredient' : 'New ingredient'}
        </Text>

        <TextInput
          placeholder="Ingredient name"
          placeholderTextColor="#9a9f98"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <View style={styles.row}>
          <TextInput
            keyboardType="numeric"
            placeholder="Qty"
            placeholderTextColor="#9a9f98"
            style={[styles.input, styles.rowInput]}
            value={quantity}
            onChangeText={setQuantity}
          />

          <TextInput
            placeholder="Unit"
            placeholderTextColor="#9a9f98"
            style={[styles.input, styles.rowInput]}
            value={unit}
            onChangeText={setUnit}
          />
        </View>

        <View style={styles.row}>
          <TextInput
            placeholder="Category"
            placeholderTextColor="#9a9f98"
            style={[styles.input, styles.rowInput]}
            value={category}
            onChangeText={setCategory}
          />

          <Pressable
            style={[styles.input, styles.rowInput, styles.dateInput]}
            onPress={() => setShowExpiryPicker(true)}
          >
            <Text
              style={expiryDate ? styles.dateText : styles.datePlaceholder}
            >
              {expiryDate || 'Expiry date'}
            </Text>
          </Pressable>
        </View>

        {expiryDate && (
          <Pressable
            style={styles.clearDateButton}
            onPress={() => setExpiryDate('')}
          >
            <Text style={styles.clearDateText}>Clear expiry date</Text>
          </Pressable>
        )}

        {showExpiryPicker && (
          <DateTimePicker
            value={parseDate(expiryDate) || new Date()}
            mode="date"
            display="calendar"
            minimumDate={new Date()}
            onChange={handleExpiryDateChange}
          />
        )}

        <Pressable style={styles.primaryButton} onPress={handleAddIngredient}>
          <Text style={styles.primaryButtonText}>
            {isEditing ? 'Save changes' : 'Add to inventory'}
          </Text>
        </Pressable>

        {isEditing && (
          <Pressable style={styles.secondaryButton} onPress={resetForm}>
            <Text style={styles.secondaryButtonText}>Cancel edit</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>Saved ingredients</Text>
        <Text style={styles.countBadge}>{ingredients.length} items</Text>
      </View>

      {ingredients.length === 0 ? (
        <View style={styles.emptyPanel}>
          <Text style={styles.emptyTitle}>Your inventory is empty</Text>
          <Text style={styles.emptyText}>
            Start with staples like chicken, garlic, soy sauce, vinegar, onion,
            or tomato.
          </Text>
        </View>
      ) : (
        ingredients.map((ingredient) => (
          <View key={ingredient.id} style={styles.ingredientCard}>
            <View style={styles.ingredientAvatar}>
              <Text style={styles.ingredientInitial}>
                {ingredient.name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.ingredientInfo}>
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              <Text style={styles.ingredientDetails}>
                {ingredient.quantity || 'No quantity'} {ingredient.unit || ''}
              </Text>
              <Text style={styles.metaText}>
                {ingredient.category || 'Uncategorized'}
                {ingredient.expiry_date
                  ? ` | Expires ${ingredient.expiry_date}`
                  : ' | No expiry date'}
              </Text>
              {getCanonicalIngredientName(ingredient.name) !==
                ingredient.name.trim().toLowerCase() && (
                <Text style={styles.synonymText}>
                  Matches {getCanonicalIngredientName(ingredient.name)}
                </Text>
              )}
            </View>

            <View style={styles.actionGroup}>
              <Pressable
                style={styles.editButton}
                onPress={() => handleEditIngredient(ingredient)}
              >
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>

              <Pressable
                style={styles.deleteButton}
                onPress={() => handleDeleteIngredient(ingredient.id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  title: {
    color: '#1c2a22',
    fontSize: 23,
    fontWeight: '900',
  },
  subtitle: {
    color: '#69746c',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
  },
  form: {
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 20,
    padding: 16,
  },
  formTitle: {
    color: '#1c2a22',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e1d8c9',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1c2a22',
    fontSize: 16,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowInput: {
    flex: 1,
  },
  dateInput: {
    justifyContent: 'center',
    minHeight: 50,
  },
  dateText: {
    color: '#1c2a22',
    fontSize: 16,
  },
  datePlaceholder: {
    color: '#9a9f98',
    fontSize: 16,
  },
  clearDateButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  clearDateText: {
    color: '#b35f2b',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f6a45',
    borderRadius: 8,
    marginTop: 2,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#f1eadf',
    borderRadius: 8,
    marginTop: 10,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#5f655f',
    fontSize: 14,
    fontWeight: '900',
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#1c2a22',
    fontSize: 18,
    fontWeight: '900',
  },
  countBadge: {
    backgroundColor: '#e1f3e7',
    borderRadius: 8,
    color: '#1f6a45',
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  ingredientCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#eadfcb',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 13,
  },
  ingredientAvatar: {
    alignItems: 'center',
    backgroundColor: '#fff0d0',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  ingredientInitial: {
    color: '#9a5b13',
    fontSize: 18,
    fontWeight: '900',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    color: '#1c2a22',
    fontSize: 17,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  ingredientDetails: {
    color: '#69746c',
    fontSize: 13,
    marginTop: 3,
  },
  metaText: {
    color: '#7a8179',
    fontSize: 12,
    marginTop: 3,
  },
  synonymText: {
    color: '#1f6a45',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  actionGroup: {
    gap: 8,
  },
  editButton: {
    backgroundColor: '#e1f3e7',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  editButtonText: {
    color: '#1f6a45',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#fff3f0',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#b6402e',
    fontSize: 12,
    fontWeight: '900',
  },
});
