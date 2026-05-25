const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// 1. Our standard cleaner function
function cleanIngredientName(name) {
  let cleanName = name.toLowerCase();
  const wordsToRemove = ["sliced", "chopped", "minced", "cubed", "crushed", "peeled", "pieces"];
  wordsToRemove.forEach(word => {
    cleanName = cleanName.replace(word, "").trim();
  });
  return cleanName.replace(/\s+/g, ' '); 
}

// 2. The single-page scraper logic
async function extractRecipeData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('.wprm-recipe-name').first().text().trim();
    const prepTimeText = $('.wprm-recipe-total_time-minutes').first().text().trim();
    const servingsText = $('.wprm-recipe-servings').first().text().trim();
    
    if (!title) {
        console.log(`  -> ❌ No recipe card found at ${url}`);
        return null;
    }

    const uniqueIngredients = {};

    $('.wprm-recipe-ingredient').each((index, element) => {
      const amountStr = $(element).find('.wprm-recipe-ingredient-amount').text().trim();
      const unit = $(element).find('.wprm-recipe-ingredient-unit').text().trim() || 'pcs';
      const rawName = $(element).find('.wprm-recipe-ingredient-name').text().trim();

      if (rawName) {
        const finalName = cleanIngredientName(rawName);
        let amount = 1;
        if (amountStr.includes('/')) {
            const [num, den] = amountStr.split('/');
            amount = parseInt(num) / parseInt(den);
        } else if (parseFloat(amountStr)) {
            amount = parseFloat(amountStr);
        }

        if (uniqueIngredients[finalName]) {
          uniqueIngredients[finalName].quantity += amount;
        } else {
          uniqueIngredients[finalName] = {
            name: finalName,
            quantity: amount,
            unit: unit.toLowerCase(),
            substitutable: false
          };
        }
      }
    });

    return {
      name: title,
      category: "Ulam",
      prep_time_minutes: parseInt(prepTimeText) || 45,
      servings: parseInt(servingsText) || 4,
      ingredients: Object.values(uniqueIngredients)
    };

  } catch (error) {
    console.error(`  -> ❌ Scraping failed for ${url}:`, error.message);
    return null;
  }
}

// 3. The Master Loop Function
async function runMassScraper() {
  const urlFilePath = path.join(__dirname, '../src/data/url.txt');
  let urlsToScrape = [];

  if (fs.existsSync(urlFilePath)) {
    const fileContent = fs.readFileSync(urlFilePath, 'utf-8');
    urlsToScrape = fileContent
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
      
    console.log(`📄 Found ${urlsToScrape.length} URLs in url.txt`);
  } else {
    console.error(`❌ Could not find the URL file at: ${urlFilePath}`);
    console.error(`Make sure url.txt is inside your src/data/ folder.`);
    return; 
  }

  const targetPath = path.join(__dirname, '../src/data/recipes.json');
  let existingRecipes = [];

  if (fs.existsSync(targetPath)) {
    const fileContent = fs.readFileSync(targetPath, 'utf-8');
    if (fileContent) existingRecipes = JSON.parse(fileContent);
  }

  let globalDishIndex = existingRecipes.length + 1;
  let newlyAdded = [];

  console.log(`🕵️ Starting scrape for ${urlsToScrape.length} recipes...`);

  for (const url of urlsToScrape) {
    console.log(`\nFetching: ${url}`);
    
    const recipeData = await extractRecipeData(url);

    if (recipeData) {
      const isDuplicateOld = existingRecipes.some(r => r.name.toLowerCase() === recipeData.name.toLowerCase());
      const isDuplicateNew = newlyAdded.some(r => r.name.toLowerCase() === recipeData.name.toLowerCase());
      
      if (isDuplicateOld || isDuplicateNew) {
        console.log(`  -> ⏭️  Skipping "${recipeData.name}" - already in database.`);
      } else {
        recipeData.id = `scraped_${globalDishIndex}`;
        newlyAdded.push(recipeData);
        console.log(`  -> ✅ Successfully processed "${recipeData.name}"`);
        globalDishIndex++;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  if (newlyAdded.length > 0) {
    const combinedRecipes = [...existingRecipes, ...newlyAdded];
    fs.writeFileSync(targetPath, JSON.stringify(combinedRecipes, null, 2));
    console.log(`\n🎉 Success! Added ${newlyAdded.length} new scraped dishes to your app.`);
  } else {
    console.log(`\n🤷 No new recipes were added.`);
  }
}

// Run it!
runMassScraper();