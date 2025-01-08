let cardCategories = {}; // Store card categories by card name
let mainDeck = [];
let extraDeck = [];
let sideDeck = [];
let cardData = {}; // Store card data with IDs as keys
let selectedCardNames = new Set(); // Store selected card names

// Handle file upload and parsing
const ydkForm = document.getElementById('ydk-form');
if (ydkForm) {
  ydkForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const fileInput = document.getElementById('ydk-file');
    const file = fileInput.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        // Parse the file into main, extra, and side decks
        parseYDK(content);

        // Fetch card details for the Main Deck
        fetchCardDetails();
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a .ydk file.');
    }
  });
}

// Parse the .ydk file into Main, Extra, and Side Decks
function parseYDK(content) {
  const lines = content.split('\n');
  let currentDeck = 'main';

  // Clear existing deck arrays before parsing
  mainDeck = [];
  extraDeck = [];
  sideDeck = [];

  lines.forEach(line => {
    line = line.trim();
    if (line === '#main') {
      currentDeck = 'main';
    } else if (line === '#extra') {
      currentDeck = 'extra';
    } else if (line === '!side') {
      currentDeck = 'side';
    } else if (line && !line.startsWith('#') && !line.startsWith('!')) {
      const cardId = parseInt(line, 10);
      if (!isNaN(cardId)) {
        if (currentDeck === 'main') {
          mainDeck.push(cardId);
        } else if (currentDeck === 'extra') {
          extraDeck.push(cardId);
        } else if (currentDeck === 'side') {
          sideDeck.push(cardId);
        }
      }
    }
  });

  // Cache the decks
  localStorage.setItem('mainDeck', JSON.stringify(mainDeck));
  localStorage.setItem('extraDeck', JSON.stringify(extraDeck));
  localStorage.setItem('sideDeck', JSON.stringify(sideDeck));

  // Update deck sizes in the UI
  const mainDeckSizeElement = document.getElementById('main-deck-size');
  if (mainDeckSizeElement) {
    mainDeckSizeElement.innerText = mainDeck.length;
  }
  const extraDeckSizeElement = document.getElementById('extra-deck-size');
  if (extraDeckSizeElement) {
    extraDeckSizeElement.innerText = extraDeck.length;
  }
  const sideDeckSizeElement = document.getElementById('side-deck-size');
  if (sideDeckSizeElement) {
    sideDeckSizeElement.innerText = sideDeck.length;
  }
}

// Fetch card details for the Main Deck
function fetchCardDetails() {
  const cardGrid = document.getElementById('card-grid');
  if (cardGrid) {
    cardGrid.innerHTML = ''; // Clear previous cards

    // Fetch card details sequentially to maintain order
    const fetchSequentially = async () => {
      for (const cardId of mainDeck) {
        const card = await fetchCardDetail(cardId);
        if (card) {
          cardData[cardId] = card; // Store card data
          const cardHTML = `
            <div class="col-1 mb-3">
              <div class="card ${getCategoryClass(cardCategories[card.name])}" data-card-id="${cardId}">
                <img src="${card.card_images[0].image_url}" class="card-img-top" alt="${card.name}" onclick="cycleCategory('${card.name.replace(/'/g, "\\'")}', this)">
              </div>
            </div>
          `;
          cardGrid.insertAdjacentHTML('beforeend', cardHTML);
        }
      }
      // Cache the card data
      localStorage.setItem('cardData', JSON.stringify(cardData));
      // Recalculate probabilities after loading card details
      calculateProbabilities();
    };

    fetchSequentially();
  }
}

// Fetch card detail from an API (example API endpoint)
function fetchCardDetail(cardId) {
  const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}`;
  return fetch(apiUrl)
    .then(response => response.json())
    .then(data => data.data[0])
    .catch(error => {
      console.error('Error fetching card details:', error);
      return null;
    });
}

// Load from cache on page load
window.addEventListener('load', () => {
  const cachedMainDeck = localStorage.getItem('mainDeck');
  const cachedExtraDeck = localStorage.getItem('extraDeck');
  const cachedSideDeck = localStorage.getItem('sideDeck');
  const cachedCardCategories = localStorage.getItem('cardCategories');
  const cachedCardData = localStorage.getItem('cardData');

  // Clear existing deck arrays before loading from cache
  mainDeck = [];
  extraDeck = [];
  sideDeck = [];

  if (cachedMainDeck) {
    mainDeck = JSON.parse(cachedMainDeck);
    const mainDeckSizeElement = document.getElementById('main-deck-size');
    if (mainDeckSizeElement) {
      mainDeckSizeElement.innerText = mainDeck.length;
    }
  }

  if (cachedExtraDeck) {
    extraDeck = JSON.parse(cachedExtraDeck);
    const extraDeckSizeElement = document.getElementById('extra-deck-size');
    if (extraDeckSizeElement) {
      extraDeckSizeElement.innerText = extraDeck.length;
    }
  }

  if (cachedSideDeck) {
    sideDeck = JSON.parse(cachedSideDeck);
    const sideDeckSizeElement = document.getElementById('side-deck-size');
    if (sideDeckSizeElement) {
      sideDeckSizeElement.innerText = sideDeck.length;
    }
  }

  if (cachedCardCategories) {
    cardCategories = JSON.parse(cachedCardCategories);
  }

  if (cachedCardData) {
    cardData = JSON.parse(cachedCardData);
  }

  if (mainDeck.length > 0) {
    fetchCardDetails();
  }

  // Load card categories and card data for math.html
  if (document.getElementById('category-filter')) {
    filterCardsForCombination();
  }

  // Ensure the hand-size element exists before adding the event listener
  const handSizeElement = document.getElementById('hand-size');
  if (handSizeElement) {
    handSizeElement.addEventListener('input', calculateProbabilities);
  }
});

// Cycle through categories on image click
function cycleCategory(cardName, imgElement) {
  const categories = ['', 'Starter', 'Extender', 'NonEngine', 'Other'];
  let currentCategory = cardCategories[cardName] || '';
  let nextCategoryIndex = (categories.indexOf(currentCategory) + 1) % categories.length;
  let nextCategory = categories[nextCategoryIndex];

  // Update the category for all cards with the same name
  cardCategories[cardName] = nextCategory;
  document.querySelectorAll(`img[alt="${cardName.replace(/'/g, "\\'")}"]`).forEach(img => {
    const cardElement = img.closest('.card');
    cardElement.className = `card ${getCategoryClass(nextCategory)}`;
  });

  // Cache the updated categories
  localStorage.setItem('cardCategories', JSON.stringify(cardCategories));

  // Recalculate probabilities immediately after categorization change
  calculateProbabilities();
}

// Get the CSS class for the category
function getCategoryClass(category) {
  switch (category) {
    case 'Starter':
      return 'card-starter';
    case 'Extender':
      return 'card-extender';
    case 'NonEngine':
      return 'card-nonengine';
    case 'Other':
      return 'card-other';
    default:
      return '';
  }
}

// Clear the YDK
function clearYDK() {
  mainDeck = [];
  extraDeck = [];
  sideDeck = [];
  cardCategories = {};
  cardData = {};
  selectedCardNames.clear();

  document.getElementById('main-deck-size').innerText = 0;
  document.getElementById('extra-deck-size').innerText = 0;
  document.getElementById('side-deck-size').innerText = 0;
  document.getElementById('card-grid').innerHTML = '';
  document.getElementById('probabilities').innerHTML = `
    <p>Starter: <span id="starter-prob">0%</span></p>
    <p>Extender: <span id="extender-prob">0%</span></p>
    <p>Non-Engine: <span id="non-engine-prob">0%</span></p>
    <p>Other: <span id="other-prob">0%</span></p>
  `;

  localStorage.removeItem('mainDeck');
  localStorage.removeItem('extraDeck');
  localStorage.removeItem('sideDeck');
  localStorage.removeItem('cardCategories');
  localStorage.removeItem('cardData');
}

// Calculate the probability of drawing each card category
function calculateProbabilities() {
  const handSize = parseInt(document.getElementById('hand-size').value) || 0;
  if (handSize <= 0 || handSize > mainDeck.length) {
    return; // Invalid hand size
  }

  // Initialize counts for each category
  const categoryCounts = {
    Starter: 0,
    Extender: 0,
    NonEngine: 0,
    Other: 0
  };

  // Count cards in each category based on their name
  mainDeck.forEach(cardId => {
    const cardName = getCardNameById(cardId); // Get the name by ID
    const cardCategory = cardCategories[cardName] || 'Other'; // Default to 'Other'

    // Log the card name and category being counted
    console.log(`Counting card: ${cardName} as ${cardCategory}`);

    if (categoryCounts[cardCategory] !== undefined) {
      categoryCounts[cardCategory]++;
    }
  });

  // Log the final counts for each category
  console.log("Category counts:", categoryCounts);

  // Calculate probabilities for each category
  document.getElementById('starter-prob').innerText = `${calculateProbability(handSize, categoryCounts['Starter'])}%`;
  document.getElementById('extender-prob').innerText = `${calculateProbability(handSize, categoryCounts['Extender'])}%`;
  document.getElementById('non-engine-prob').innerText = `${calculateProbability(handSize, categoryCounts['NonEngine'])}%`;
  document.getElementById('other-prob').innerText = `${calculateProbability(handSize, categoryCounts['Other'])}%`;
}

// Calculate probability using hypergeometric distribution
function calculateProbability(handSize, categorySize) {
  if (categorySize > 0) {
    // P(X >= 1) = 1 - HYPGEOM.DIST(0, hand size, category size, main deck size)
    return Math.round((1 - hypergeom(0, handSize, categorySize, mainDeck.length)) * 100);
  } else {
    return 0;
  }
}

// Hypergeometric distribution function
function hypergeom(x, n, k, N) {
  const comb = (n, k) => factorial(n) / (factorial(k) * factorial(n - k));
  return (comb(k, x) * comb(N - k, n - x)) / comb(N, n);
}

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// Helper function to get card name from card ID
function getCardNameById(cardId) {
  return cardData[cardId]?.name || 'Unknown'; // Use cardData to map cardId to card name
}

// Filter cards by category for combination selection
function filterCardsForCombination() {
  const filterCategory = document.getElementById('category-filter').value;
  const cardSelectionDiv = document.getElementById('card-selection');
  cardSelectionDiv.innerHTML = ''; // Clear previous cards

  // Display all unique cards initially
  const uniqueCards = [...new Set(mainDeck.map(cardId => cardData[cardId]))];

  // Filter cards if a category is selected
  const filteredCards = filterCategory
    ? uniqueCards.filter(card => cardCategories[card.name] === filterCategory)
    : uniqueCards;

  // Display cards with images for selection
  filteredCards.forEach(card => {
    const cardHTML = `
      <div class="col-1" style="width: 10% !important;">
        <img src="${card.card_images[0].image_url}" class="card-img-top ${selectedCardNames.has(card.name) ? 'selected' : ''}" alt="${card.name}" onclick="toggleCardSelection(this)">
      </div>
    `;
    cardSelectionDiv.insertAdjacentHTML('beforeend', cardHTML);
  });
}

// Toggle card selection
function toggleCardSelection(imgElement) {
  const cardName = imgElement.alt;
  if (selectedCardNames.has(cardName)) {
    selectedCardNames.delete(cardName);
  } else {
    selectedCardNames.add(cardName);
  }
  imgElement.classList.toggle('selected');
}

// Handle the card selection for probability calculation
function calculateCardCombinationProbability() {
  const selectedCards = Array.from(selectedCardNames);

  const combinationSizeElement = document.getElementById('combination-size');
  const handSizeElement = document.getElementById('hand-size');
  const uniqueCardsElement = document.getElementById('unique-cards');

  if (!combinationSizeElement || !handSizeElement || !uniqueCardsElement) {
    alert("Please ensure all input fields are present.");
    return;
  }

  const combinationSize = parseInt(combinationSizeElement.value);
  const handSize = parseInt(handSizeElement.value);
  const uniqueCards = uniqueCardsElement.value === 'yes';

  const deckSize = mainDeck.length; // Use the existing main deck size

  if (selectedCards.length === 0 || isNaN(combinationSize) || combinationSize < 1 || combinationSize > handSize) {
    alert("Please select cards and enter a valid combination size.");
    return;
  }

  // Calculate the probability of drawing the selected card combination
  const probability = calculateCombinationProbability(selectedCards, combinationSize, handSize, deckSize, uniqueCards);

  // Display the result
  document.getElementById('probability-result').innerText = `Probability: ${probability}%`;
}

// Calculate the probability using hypergeometric distribution and accounting for multiple copies of cards
function calculateCombinationProbability(selectedCards, combinationSize, handSize, deckSize, uniqueCards) {
  const cardCopies = {}; // Store how many copies of each card are in the deck

  // Count how many copies of each selected card are in the main deck
  selectedCards.forEach(cardName => {
    cardCopies[cardName] = mainDeck.filter(id => getCardNameById(id) === cardName).length;
  });

  const comb = (n, k) => {
    if (k > n) return 0;
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= (n - i + 1) / i;
    }
    return result;
  };

  const hypergeom = (k, K, n, N) => {
    return (comb(K, k) * comb(N - K, n - k)) / comb(N, n);
  };

  let probability = 0; // Initialize the total probability

  if (uniqueCards) {
    // If unique cards are required, consider only distinct card names, ignoring multiple copies
    const distinctCards = [...new Set(selectedCards)];
    const totalCards = distinctCards.length;

    // Calculate the probability of drawing the unique combination
    probability = hypergeom(combinationSize, totalCards, handSize, deckSize);
  } else {
    // If duplicates are allowed, calculate based on multiple copies
    const totalCopies = selectedCards.reduce((sum, cardName) => sum + cardCopies[cardName], 0);

    // Calculate the probability of drawing at least the combination size of selected cards
    for (let i = combinationSize; i <= totalCopies; i++) {
      probability += hypergeom(i, totalCopies, handSize, deckSize);
    }
  }

  // Convert probability to percentage
  return Math.round(probability * 100);
}
