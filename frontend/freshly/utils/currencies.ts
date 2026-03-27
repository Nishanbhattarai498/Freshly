const CURRENCY_MAP = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
} as const;

export const CURRENCIES = Object.values(CURRENCY_MAP);

type CurrencyCode = keyof typeof CURRENCY_MAP;

export const getCurrencySymbol = (code = 'USD') => {
  const key = String(code).toUpperCase() as CurrencyCode;
  return CURRENCY_MAP[key]?.symbol || '$';
};

export default CURRENCIES;
