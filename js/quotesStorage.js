/* ==========================================================================
   Saved Quotes Storage & Dashboard State Manager
   ========================================================================== */

const STORAGE_KEY = 'freight_quote_system_quotes';

function getSavedQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSampleInitialQuotes();
  } catch (e) {
    return getSampleInitialQuotes();
  }
}

function saveQuoteToStorage(quoteData) {
  const quotes = getSavedQuotes();
  quotes.unshift(quoteData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function deleteQuoteFromStorage(quoteId) {
  let quotes = getSavedQuotes();
  quotes = quotes.filter(q => q.quoteId !== quoteId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
}

function getSampleInitialQuotes() {
  return [
    {
      quoteId: 'QT-2026-9812',
      issueDate: 'Aug 4, 2026',
      expiryDate: 'Aug 18, 2026',
      origin: { name: 'Port of Shanghai', country: 'China' },
      destination: { name: 'Port of Rotterdam', country: 'Netherlands' },
      mode: 'ocean_fcl',
      modeLabel: 'Ocean FCL (1x 20ft)',
      finalTotalFormatted: '$2,450.00',
      finalTotalUSD: 2450,
      status: 'active'
    },
    {
      quoteId: 'QT-2026-7431',
      issueDate: 'Aug 1, 2026',
      expiryDate: 'Aug 15, 2026',
      origin: { name: 'Shanghai Pudong Airport', country: 'China' },
      destination: { name: 'Frankfurt Airport', country: 'Germany' },
      mode: 'air_standard',
      modeLabel: 'Air Freight (1,200 KG)',
      finalTotalFormatted: '$6,120.00',
      finalTotalUSD: 6120,
      status: 'active'
    },
    {
      quoteId: 'QT-2026-4190',
      issueDate: 'Jul 20, 2026',
      expiryDate: 'Aug 3, 2026',
      origin: { name: 'Port of Singapore', country: 'Singapore' },
      destination: { name: 'Nhava Sheva (Mumbai)', country: 'India' },
      mode: 'ocean_lcl',
      modeLabel: 'Ocean LCL (6.5 CBM)',
      finalTotalFormatted: '$1,280.00',
      finalTotalUSD: 1280,
      status: 'expired'
    }
  ];
}
