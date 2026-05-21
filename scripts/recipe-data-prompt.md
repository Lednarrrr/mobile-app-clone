# Kusinera Recipe Data Generation Prompt

Use this prompt with an LLM when the team is ready to expand `src/data/recipes.json` to 300+ Filipino dishes.

## Goal

Generate structured Filipino karinderya recipe data for an offline ingredient-based recommendation app.

## Output Rules

- Return valid JSON only.
- Return an array of recipe objects.
- Use English canonical ingredient names.
- Include common Filipino dish names.
- Focus on karinderya-friendly dishes in the Philippines.
- Do not include cooking instructions yet.
- Do not include unavailable or imported luxury ingredients unless common in karinderya settings.

## Recipe Schema

```json
{
  "id": "dish_001",
  "name": "Pork Adobo",
  "category": "Ulam",
  "tags": ["pork", "bestseller", "karinderya-staple"],
  "prep_time_minutes": 45,
  "servings": 4,
  "ingredients": [
    {
      "name": "pork belly",
      "quantity": 500,
      "unit": "g",
      "substitutable": true
    }
  ]
}
```

## Categories

Use only these categories:

- Ulam
- Sabaw
- Prito
- Gulay
- Ihaw
- Kakanin

## Prompt

Generate 50 Filipino karinderya recipes using the schema above. Use IDs starting from `dish_001`. Make sure each recipe has 5 to 10 ingredients. Mark core proteins and main ingredients as `"substitutable": false`. Mark optional aromatics, garnish, or minor vegetables as `"substitutable": true`.
