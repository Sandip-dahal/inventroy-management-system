// Nepali currency formatter
export const formatNepaliCurrency = (amount) => {
  if (typeof amount !== 'number') {
    amount = parseFloat(amount) || 0;
  }
  
  return new Intl.NumberFormat('ne-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Simplified Nepali date placeholder
export const getCurrentNepaliDate = () => {
  const date = new Date();
  return {
    year: 2080 + (date.getFullYear() - 2023), // Approximate conversion
    month: date.getMonth() + 1,
    day: date.getDate(),
    toString: function() { 
      return `${this.year}/${this.month.toString().padStart(2, '0')}/${this.day.toString().padStart(2, '0')}`; 
    }
  };
};

// Convert English numbers to Nepali digits
export const toNepaliDigits = (number) => {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return number.toString().replace(/\d/g, digit => nepaliDigits[parseInt(digit)]);
};

// Format currency with Nepali digits
export const formatNepaliCurrencyWithDigits = (amount) => {
  const formatted = formatNepaliCurrency(amount);
  return formatted.replace(/\d/g, digit => toNepaliDigits(digit));
};

// Default export
export default {
  formatNepaliCurrency,
  getCurrentNepaliDate,
  toNepaliDigits,
  formatNepaliCurrencyWithDigits
};