export function getStatIcon(label) {
  switch (label) {
    case "Stock":
      return "cube-outline";
    case "Ready To Cook":
      return "flame-outline";
    case "Expiring Soon":
      return "time-outline";
    case "To Buy":
      return "cart-outline";
    default:
      return "apps-outline";
  }
}

export function getStatAccent(label) {
  switch (label) {
    case "Stock":
      return "#E9C46A";
    case "Ready To Cook":
      return "#1D9E75";
    case "Expiring Soon":
      return "#C77B12";
    case "To Buy":
      return "#2D6A4F";
    default:
      return "#E9C46A";
  }
}

export function getExpiringSoonCount(ingredients) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  return ingredients.filter((ingredient) => {
    if (!ingredient.expiry_date) {
      return false;
    }

    const expiryDate = new Date(ingredient.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);

    return expiryDate >= today && expiryDate <= threeDaysFromNow;
  }).length;
}
